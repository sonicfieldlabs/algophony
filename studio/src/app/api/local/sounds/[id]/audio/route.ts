import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { localOnly } from "@/lib/local/request";
import {
  contentTypeForAudioExtension,
  getLocalSoundById,
} from "@/lib/local/sound-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const { id } = await params;
  const sound = getLocalSoundById(id);
  if (!sound) {
    return NextResponse.json({ error: "Local sound not found" }, { status: 404 });
  }

  let size: number;
  try {
    size = statSync(sound.path).size;
  } catch {
    return NextResponse.json({ error: "Local sound file is no longer available" }, { status: 404 });
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
      },
    });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  const stream = createReadStream(sound.path, { start, end });
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": contentTypeForAudioExtension(sound.extension),
    "Content-Length": String(end - start + 1),
    "X-Content-Type-Options": "nosniff",
  });

  if (range) {
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  if (request.nextUrl.searchParams.get("download") === "1") {
    headers.set("Content-Disposition", `attachment; filename="${safeFilename(sound.fileName)}"`);
  }

  return new NextResponse(Readable.toWeb(stream) as BodyInit, {
    status: range ? 206 : 200,
    headers,
  });
}

function parseRange(value: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (!value) return null;
  const match = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return "invalid";

  let start: number;
  let end: number;

  if (!match[1] && !match[2]) return "invalid";
  if (!match[1]) {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return "invalid";
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number.parseInt(match[1], 10);
    end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return "invalid";
  }

  return { start, end: Math.min(end, size - 1) };
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_") || "algophony-studio-audio";
}
