import { NextRequest } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { getGenerations } from "../../lib/data";

const REPO_ROOT = path.resolve(process.cwd(), "../..");

const MIME: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  aiff: "audio/aiff",
  aif: "audio/aiff",
};

/** Validate audio ID to prevent path traversal. */
function isValidId(id: string): boolean {
  return /^ALG-[0-9]{4}-[A-Z0-9-]+-[A-Z]$/.test(id)
    || /^PG-[0-9]+-[A-Z0-9-]+-[A-Z]$/.test(id)
    || /^UPL-[0-9]+-UPLOAD-[A-Z]$/.test(id);
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
    if (generations.length > 0 && !generations.some((generation) => generation.audio_id === id)) {
      return new Response("Audio not found", { status: 404 });
    }
  }

  // Search in both generations/audio and uploads/audio
  const searchDirs = [
    path.join(REPO_ROOT, "generations", "audio"),
    path.join(REPO_ROOT, "uploads", "audio"),
  ];
  const extensions = Object.keys(MIME);

  let filePath: string | null = null;
  let fileStat: Awaited<ReturnType<typeof stat>> | null = null;

  for (const dir of searchDirs) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `${id}.${ext}`);
      try {
        const s = await stat(candidate);
        if (s.isFile()) {
          filePath = candidate;
          fileStat = s;
          break;
        }
      } catch {
        // File doesn't exist, try next
      }
    }
    if (filePath) break;
  }

  if (!filePath || !fileStat) {
    return new Response("Audio not found", { status: 404 });
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const fileSize = fileStat.size;

  // Handle Range requests for seeking
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new Response("Invalid range", { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
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
    const webStream = readableNodeToWeb(stream);

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Full file response (streaming)
  const stream = createReadStream(filePath);
  const webStream = readableNodeToWeb(stream);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/** Convert Node.js ReadableStream to Web ReadableStream. */
function readableNodeToWeb(nodeStream: ReturnType<typeof createReadStream>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        controller.enqueue(new Uint8Array(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}
