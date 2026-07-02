import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { isolateAudio } from "@/lib/elevenlabs/audio-isolation";
import { getCreditCost } from "@/lib/sfx/credits";
import {
  completeGeneration,
  reserveCreditForGeneration,
  refundCreditForGeneration,
  createPendingGeneration,
  failGeneration,
  InsufficientCreditsError,
} from "@/lib/local/repositories/generations";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { createServiceLocalClient } from "@/lib/local/db-client";
import { assertOwnedReferenceUpload, NotFoundError } from "@/lib/auth/owner-guard";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { assertAcceptableUpload, MAX_AUDIO_UPLOAD_BYTES } from "@/lib/storage/upload-guards";
import {
  createStorageObjectUrl,
  formatStorageBytes,
  getStorageLimitBytes,
  putStorageObject,
  StorageQuotaError,
} from "@/lib/storage/objects";
import { logger } from "@/lib/logger";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

export async function POST(request: NextRequest) {
  let profile;
  let generationId: string | null = null;
  let creditReserved = false;
  let creditCost = 0;

  try {
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const rl = await checkRateLimit(
      `isolate:${profile.id}`,
      RATE_LIMITS.generation.maxRequests,
      RATE_LIMITS.generation.windowMs,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.round(MAX_AUDIO_UPLOAD_BYTES / 1024 / 1024)} MB.` },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const referenceUploadId = formData.get("referenceUploadId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 422 });
    }

    const guard = assertAcceptableUpload(file);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason }, { status: 422 });
    }

    await assertOwnedReferenceUpload(referenceUploadId, profile.id);

    const apiRoute = "audio_isolation";
    try {
      await enforceGenerationPolicy(profile, { kind: "hybrid" });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    creditCost = getCreditCost(apiRoute);

    if (profile.credits_remaining < creditCost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());

    const generation = await createPendingGeneration(
      profile.id, null, { filename: file.name, action: "isolate" }, "audio_isolation",
      { apiRoute, appCreditCost: creditCost },
    );
    generationId = generation.id;

    // Reserve credit BEFORE the ElevenLabs call so concurrent requests can't
    // both pass the pre-check and double-spend.
    let creditsRemaining: number;
    try {
      const reserved = await reserveCreditForGeneration(profile.id, generation.id, creditCost);
      creditsRemaining = reserved.creditsRemaining;
      creditReserved = true;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        await failGeneration(generation.id, "Insufficient credits at reservation time");
        return NextResponse.json(
          { error: "Insufficient credits", creditsRemaining: profile.credits_remaining, creditCost, generationId: generation.id },
          { status: 402 },
        );
      }
      throw err;
    }

    const result = await isolateAudio({
      audioBuffer, filename: file.name, contentType: file.type || "audio/wav",
    });

    if (!result.success) {
      await failGeneration(generation.id, result.message);
      if (creditReserved) {
        const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
        if (refund) creditsRemaining = refund.creditsRemaining;
      }
      return NextResponse.json(
        { error: result.message, generationId: generation.id, creditsRemaining },
        { status: result.statusCode || 500 },
      );
    }

    const service = createServiceLocalClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const storagePath = `references/${profile.id}/isolated_${Date.now()}_${safeName}`;
    const isolatedBuffer = Buffer.from(result.audioBuffer);
    const isolatedContentType = result.metadata.contentType || "audio/wav";

    try {
      await putStorageObject(storagePath, isolatedBuffer, isolatedContentType);
    } catch (error) {
      const message = error instanceof StorageQuotaError
        ? `Storage limit reached. Algophony Studio is capped at ${formatStorageBytes(getStorageLimitBytes())}.`
        : "Storage failed";
      await failGeneration(generation.id, error instanceof Error ? error.message : message);
      if (creditReserved) {
        const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
        if (refund) creditsRemaining = refund.creditsRemaining;
      }
      return NextResponse.json(
        { error: message, creditsRemaining, generationId: generation.id },
        { status: error instanceof StorageQuotaError ? 413 : 500 },
      );
    }

    if (referenceUploadId) {
      await service
        .from("reference_uploads")
        .update({
          isolated_storage_path: storagePath,
        })
        .eq("id", referenceUploadId);
    }

    const audioUrl = await createStorageObjectUrl(storagePath, 3600);
    await completeGeneration(generation.id, storagePath, audioUrl, null, null, isolatedContentType.includes("wav") ? "wav" : "mp3", {
      requestId: result.metadata.requestId,
      metadata: { storagePath, action: "isolate", storageSizeBytes: isolatedBuffer.byteLength },
      storageSizeBytes: isolatedBuffer.byteLength,
    });

    logUsageEvent({
      userId: profile.id, generatedSoundId: generation.id, apiRoute,
      appCreditCost: creditCost,
    }).catch((err) => logger.error({ err }, "[isolate-audio] usage log error"));

    return NextResponse.json({ storagePath, audioUrl, creditsRemaining, isMock: result.isMock, status: "succeeded", generationId: generation.id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (generationId && creditReserved && profile) {
      await refundCreditForGeneration(profile.id, generationId, creditCost).catch(() => null);
      await failGeneration(generationId, error instanceof Error ? error.message : "Internal error").catch(() => null);
    }
    logger.error({ err: error, userId: profile?.id }, "[isolate-audio] internal error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
