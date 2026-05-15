import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const REPO_ROOT = join(process.cwd(), "../..");

const STUDIO_ENABLED = process.env.ALGOPHONY_ENABLE_STUDIO === "true";

const PROVIDER_LIMITS: Record<string, number> = {
  synth_baseline: 120,
  spectral_fm: 120,
  spatialscaper: 120,
  el_sfx: 30,
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
  if (!STUDIO_ENABLED) {
    return new Response(null, { status: 404 });
  }

  const tmpFile = join(tmpdir(), `algophony-pg-${randomBytes(6).toString("hex")}.json`);

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

    const requestedDuration = Number(body.duration || 30);
    if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
      return Response.json({ ok: false, error: "Duration must be a positive number." }, { status: 400 });
    }
    const duration = Math.min(Math.max(Math.round(requestedDuration), 1), PROVIDER_LIMITS[providerId]);

    const input = JSON.stringify({
      prompt_text: promptText,
      category: cleanString(body.category, 80) || "forest",
      provider_id: providerId,
      duration,
      loop: body.loop || false,
      seed: Number.isInteger(body.seed) ? body.seed : null,
      intended_sources: cleanStringArray(body.intended_sources, 12, 120),
      forbidden_sources: cleanStringArray(body.forbidden_sources, 12, 120),
    });

    // Write JSON to a temp file to avoid shell escaping issues
    writeFileSync(tmpFile, input, "utf-8");

    const result = execSync(
      `python3 scripts/studio_generate.py < "${tmpFile}"`,
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      },
    );

    const parsed = JSON.parse(result);
    return Response.json(parsed);
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: "Generation failed. Check server logs for details." },
      { status: 500 },
    );
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
