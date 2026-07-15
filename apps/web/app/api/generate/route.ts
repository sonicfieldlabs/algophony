import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { authorizeStudio } from "../../lib/studio-auth";
import { tryAcquireStudioSlot, releaseStudioSlot } from "../../lib/concurrency";
import { CATEGORIES } from "../../lib/data";

const execFileAsync = promisify(execFile);

const REPO_ROOT = join(process.cwd(), "../..");

const PROVIDER_LIMITS: Record<string, number> = {
  synth_baseline: 120,
  spectral_fm: 120,
  el_sfx: 30,
  stable_audio_3_stability_api: 360,
  stable_audio_25_stability_api: 190,
  stable_audio_25_fal: 190,
  stable_audio_25_replicate: 190,
  audiogen_local: 30,
  moss_sfx_local: 30,
  moss_sfx_mlx: 30,
  stable_audio_open_local: 47,
  tangoflux_local: 30,
  audiogen_hf_endpoint: 30,
  moss_sfx_hf_endpoint: 30,
  stable_audio_open_hf_endpoint: 47,
  tangoflux_hf_endpoint: 30,
};

const PROVIDER_BASE_TIMEOUT_MS: Record<string, number> = {
  el_sfx: 180_000,
  stable_audio_3_stability_api: 20 * 60_000,
  stable_audio_25_stability_api: 12 * 60_000,
  stable_audio_25_fal: 15 * 60_000,
  stable_audio_25_replicate: 15 * 60_000,
};

const VALID_CATEGORIES = new Set<string>(CATEGORIES);

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function POST(request: Request) {
  const auth = authorizeStudio(request);
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.reason }, { status: auth.status });
  }

  if (!tryAcquireStudioSlot()) {
    return Response.json(
      { ok: false, error: "Playground is busy. Please retry in a moment." },
      { status: 503, headers: { "Retry-After": "15" } },
    );
  }

  const tmpFile = join(tmpdir(), `algophony-pg-${randomBytes(8).toString("hex")}.json`);

  try {
    const body = await request.json();
    const providerId = cleanString(body.provider_id, 80) || "synth_baseline";
    if (!(providerId in PROVIDER_LIMITS)) {
      return Response.json({ ok: false, error: "Unsupported provider." }, { status: 400 });
    }

    const promptText = cleanString(body.prompt_text, 1200);
    if (promptText.length < 10) {
      return Response.json({ ok: false, error: "Prompt must be at least 10 characters." }, { status: 400 });
    }

    const requestedDuration = Number(body.duration ?? 30);
    if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
      return Response.json({ ok: false, error: "Duration must be a positive number." }, { status: 400 });
    }
    const duration = Math.min(Math.max(Math.round(requestedDuration), 1), PROVIDER_LIMITS[providerId]);

    const rawCategory = cleanString(body.category, 80) || "forest";
    const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : "forest";

    const input = JSON.stringify({
      prompt_text: promptText,
      category,
      provider_id: providerId,
      duration,
      loop: Boolean(body.loop),
      seed: Number.isInteger(body.seed) ? body.seed : null,
      intended_sources: cleanStringArray(body.intended_sources, 12, 120),
      forbidden_sources: cleanStringArray(body.forbidden_sources, 12, 120),
    });

    await writeFile(tmpFile, input, "utf-8");

    const { stdout } = await execFileAsync(
      "python3",
      ["scripts/studio_generate.py", "--stdin-from", tmpFile],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        timeout: Math.max(PROVIDER_BASE_TIMEOUT_MS[providerId] ?? 120_000, duration * 4_000 + 60_000),
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      },
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch (parseErr) {
      console.error("[generate] non-JSON output from studio_generate.py:", parseErr);
      return Response.json(
        { ok: false, error: "Generation produced invalid output. Check server logs." },
        { status: 500 },
      );
    }
    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("[generate] failed:", error);
    return Response.json(
      { ok: false, error: "Generation failed. Check server logs for details." },
      { status: 500 },
    );
  } finally {
    releaseStudioSlot();
    unlink(tmpFile).catch(() => undefined);
  }
}
