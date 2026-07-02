import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createServiceLocalClient } from "@/lib/local/db-client";
import { randomUUID } from "crypto";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { assertAcceptableUpload, MAX_AUDIO_UPLOAD_BYTES } from "@/lib/storage/upload-guards";
import {
  formatStorageBytes,
  getStorageLimitBytes,
  putStorageObject,
  removeStorageObjects,
  StorageQuotaError,
} from "@/lib/storage/objects";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const rl = await checkRateLimit(
      `upload:${profile.id}`,
      RATE_LIMITS.api.maxRequests,
      RATE_LIMITS.api.windowMs,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } },
      );
    }

    // Fast-fail on Content-Length to avoid reading megabytes into memory before
    // the size check fires inside the guard.
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.round(MAX_AUDIO_UPLOAD_BYTES / 1024 / 1024)} MB.` },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 422 });
    }

    const guard = assertAcceptableUpload(file);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason }, { status: 422 });
    }

    const service = createServiceLocalClient();
    const id = randomUUID();
    const storagePath = `reference-uploads/${profile.id}/${id}.${guard.ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await putStorageObject(storagePath, buffer, file.type || "audio/wav");
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        return NextResponse.json(
          {
            error: `Storage limit reached. Algophony Studio is capped at ${formatStorageBytes(getStorageLimitBytes())}.`,
            usedBytes: error.usedBytes,
            incomingBytes: error.incomingBytes,
          },
          { status: 413 },
        );
      }
      throw error;
    }

    const { data: record, error: insertError } = await service.from("reference_uploads").insert({
      id,
      user_id: profile.id,
      filename: file.name,
      content_type: file.type || "audio/wav",
      size_bytes: buffer.length,
      storage_path: storagePath,
      status: "uploaded",
    }).select().single();

    if (insertError) {
      // Best-effort cleanup so a failed insert doesn't leak bytes that aren't referenced anywhere.
      await removeStorageObjects([storagePath]).catch(() => null);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      referenceUploadId: record.id,
      filename: record.filename,
      status: record.status,
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "[listen-mode/upload] internal error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
