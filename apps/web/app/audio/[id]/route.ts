import { NextRequest } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { getGenerations } from "../../lib/data";

const REPO_ROOT = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "../..");

const MIME: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  aiff: "audio/aiff",
  aif: "audio/aiff",
};

const EXTENSIONS = Object.keys(MIME);

/** Validate audio ID to prevent path traversal. */
function isValidId(id: string): boolean {
  return (
    /^ALG-[0-9]{4}-[A-Z][A-Z0-9_]+-[A-Z]$/.test(id) ||
    /^PG-[0-9]{6,}-[A-Z][A-Z0-9_-]+-[A-Z]$/.test(id) ||
    /^UPL-[0-9]{6,}-UPLOAD-[A-Z0-9]+$/.test(id)
  );
}

async function findAudioFile(id: string): Promise<{ filePath: string; size: number } | null> {
  const searchDirs = [
    path.join(REPO_ROOT, "generations", "audio"),
    path.join(REPO_ROOT, "uploads", "audio"),
  ];

  for (const dir of searchDirs) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(dir, `${id}.${ext}`);
      // Defense in depth — candidate must remain inside its parent dir.
      if (!candidate.startsWith(dir + path.sep)) continue;
      try {
        const s = await stat(candidate);
        if (s.isFile()) return { filePath: candidate, size: s.size };
      } catch {
        // Try next candidate.
      }
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return new Response("Not found", { status: 404 });
  }

  if (id.startsWith("ALG-")) {
    const generations = getGenerations();
    if (generations.length > 0 && !generations.some((g) => g.audio_id === id)) {
      return new Response("Audio not found", { status: 404 });
    }
  }

  const found = await findAudioFile(id);
  if (!found) {
    return new Response("Audio not found", { status: 404 });
  }

  const { filePath, size: fileSize } = found;
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new Response("Invalid range", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (start >= fileSize || end >= fileSize || start > end) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }
    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(fileSize) },
  });
}
