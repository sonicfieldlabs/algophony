import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import os from "node:os";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const UPLOADS_AUDIO = path.join(REPO_ROOT, "uploads", "audio");
const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");

const STUDIO_ENABLED = process.env.ALGOPHONY_ENABLE_STUDIO === "true";

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUploadMetadata(value: unknown): Record<string, string> {
  const raw = typeof value === "object" && value ? value as Record<string, unknown> : {};
  return {
    source_type: cleanString(raw.source_type, 80) || "field_recording",
    recorder: cleanString(raw.recorder, 160),
    location: cleanString(raw.location, 160),
    date_recorded: cleanString(raw.date_recorded, 40),
    equipment: cleanString(raw.equipment, 160),
    notes: cleanString(raw.notes, 1200),
  };
}

export async function POST(req: NextRequest) {
  if (!STUDIO_ENABLED) {
    return new Response(null, { status: 404 });
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
    const allowed = ["wav", "mp3", "flac", "aiff", "ogg"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Unsupported format: .${ext}` }, { status: 400 });
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    let parsedMeta: unknown = {};
    try {
      parsedMeta = metadataRaw ? JSON.parse(metadataRaw) : {};
    } catch {
      return NextResponse.json({ error: "Invalid metadata JSON" }, { status: 400 });
    }
    const uploadMeta = cleanUploadMetadata(parsedMeta);

    // Generate upload ID
    const ts = Math.floor(Date.now() / 1000);
    const audioId = `UPL-${ts}-UPLOAD-A`;

    // Save file
    if (!existsSync(UPLOADS_AUDIO)) {
      await mkdir(UPLOADS_AUDIO, { recursive: true });
    }
    const audioPath = path.join(UPLOADS_AUDIO, `${audioId}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(audioPath, buffer);

    // Relative storage URI (never expose absolute paths)
    const storageUri = `uploads/audio/${audioId}.${ext}`;

    // Run analysis via Python
    tmpIn = path.join(os.tmpdir(), `alg_upload_${ts}.json`);
    tmpOut = path.join(os.tmpdir(), `alg_upload_result_${ts}.json`);

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

    try {
      execSync(
        `python3 "${path.join(SCRIPTS_DIR, "studio_generate.py")}" --analyze-upload "${tmpIn}" "${tmpOut}"`,
        { cwd: REPO_ROOT, timeout: 30000, stdio: "pipe" }
      );
    } catch {
      // If the analyze-upload flag isn't supported yet, do basic analysis inline
      const crypto = await import("node:crypto");
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
        note: "Basic upload completed (advanced analysis unavailable).",
      });
    }

    // Read result
    const { readFile } = await import("node:fs/promises");
    const resultRaw = await readFile(tmpOut, "utf-8");
    const result = JSON.parse(resultRaw);

    return NextResponse.json({
      audio_id: audioId,
      storage_uri: storageUri,
      file_format: ext,
      source_type: uploadMeta.source_type,
      upload_metadata: inputPayload.upload_metadata,
      ...result,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload processing failed. Check server logs for details." },
      { status: 500 }
    );
  } finally {
    await Promise.all([tmpIn, tmpOut].filter(Boolean).map(async (target) => {
      try {
        await unlink(target as string);
      } catch {
        // ignore cleanup failures
      }
    }));
  }
}
