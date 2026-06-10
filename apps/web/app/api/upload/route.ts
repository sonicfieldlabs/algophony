import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import os from "node:os";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { authorizeStudio } from "../../lib/studio-auth";
import { tryAcquireStudioSlot, releaseStudioSlot } from "../../lib/concurrency";

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const UPLOADS_AUDIO = path.join(REPO_ROOT, "uploads", "audio");
const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");

const ALLOWED_EXT = new Set(["wav", "mp3", "flac", "aiff", "aif", "ogg"]);
const ALLOWED_SOURCE_TYPES = new Set([
  "generated_procedural",
  "generated_ml",
  "field_recording",
  "found_sound",
  "hybrid",
]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUploadMetadata(value: unknown): Record<string, string> {
  const raw = typeof value === "object" && value ? (value as Record<string, unknown>) : {};
  const sourceType = cleanString(raw.source_type, 80);
  return {
    source_type: ALLOWED_SOURCE_TYPES.has(sourceType) ? sourceType : "found_sound",
    recorder: cleanString(raw.recorder, 160),
    location: cleanString(raw.location, 160),
    date_recorded: cleanString(raw.date_recorded, 40),
    equipment: cleanString(raw.equipment, 160),
    notes: cleanString(raw.notes, 1200),
  };
}

export async function POST(req: NextRequest) {
  const auth = authorizeStudio(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  if (!tryAcquireStudioSlot()) {
    return NextResponse.json(
      { error: "Studio is busy. Please retry in a moment." },
      { status: 503, headers: { "Retry-After": "15" } },
    );
  }

  let tmpIn: string | null = null;
  let tmpOut: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const metadataRaw = formData.get("metadata") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "wav";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: `Unsupported format: .${ext}` }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    let parsedMeta: unknown = {};
    try {
      parsedMeta = metadataRaw ? JSON.parse(metadataRaw) : {};
    } catch {
      return NextResponse.json({ error: "Invalid metadata JSON" }, { status: 400 });
    }
    const uploadMeta = cleanUploadMetadata(parsedMeta);

    const ts = Math.floor(Date.now() / 1000);
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const audioId = `UPL-${ts}-UPLOAD-${suffix}`;

    if (!existsSync(UPLOADS_AUDIO)) {
      await mkdir(UPLOADS_AUDIO, { recursive: true });
    }
    const audioPath = path.join(UPLOADS_AUDIO, `${audioId}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(audioPath, buffer);

    const storageUri = `uploads/audio/${audioId}.${ext}`;

    const tmpToken = crypto.randomBytes(8).toString("hex");
    tmpIn = path.join(os.tmpdir(), `alg_upload_${tmpToken}.json`);
    tmpOut = path.join(os.tmpdir(), `alg_upload_result_${tmpToken}.json`);

    const inputPayload = {
      mode: "analyze_only",
      audio_path: audioPath,
      source_type: uploadMeta.source_type,
      upload_metadata: {
        original_filename: file.name,
        recorder: uploadMeta.recorder,
        location: uploadMeta.location,
        date_recorded: uploadMeta.date_recorded,
        equipment: uploadMeta.equipment,
        notes: uploadMeta.notes,
      },
    };

    await writeFile(tmpIn, JSON.stringify(inputPayload));

    let analysisAvailable = true;
    try {
      await execFileAsync(
        "python3",
        [path.join(SCRIPTS_DIR, "studio_generate.py"), "--analyze-upload", tmpIn, tmpOut],
        { cwd: REPO_ROOT, timeout: 30_000 },
      );
    } catch (execErr) {
      console.error("[upload] analysis subprocess failed:", execErr);
      analysisAvailable = false;
    }

    if (!analysisAvailable) {
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      return NextResponse.json({
        audio_id: audioId,
        storage_uri: storageUri,
        file_format: ext,
        sha256: hash,
        file_size: buffer.length,
        source_type: uploadMeta.source_type,
        upload_metadata: inputPayload.upload_metadata,
        analysis: null,
        report: null,
        note: "Upload saved. Signal analysis unavailable — see server logs.",
      });
    }

    const resultRaw = await readFile(tmpOut, "utf-8");
    let result: unknown;
    try {
      result = JSON.parse(resultRaw);
    } catch (parseErr) {
      console.error("[upload] analysis returned invalid JSON:", parseErr);
      return NextResponse.json(
        { error: "Upload analysis returned invalid output. See server logs." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      audio_id: audioId,
      storage_uri: storageUri,
      file_format: ext,
      source_type: uploadMeta.source_type,
      upload_metadata: inputPayload.upload_metadata,
      ...(typeof result === "object" && result ? result : {}),
    });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: "Upload processing failed. Check server logs for details." },
      { status: 500 },
    );
  } finally {
    releaseStudioSlot();
    await Promise.all(
      [tmpIn, tmpOut]
        .filter((target): target is string => Boolean(target))
        .map((target) => unlink(target).catch(() => undefined)),
    );
  }
}
