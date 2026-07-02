import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { transcribeAudio } from "@/lib/elevenlabs/speech-to-text";
import { getCreditCost } from "@/lib/sfx/credits";
import {
  completeStreamingGeneration,
  createPendingGeneration,
  failGeneration,
  InsufficientCreditsError,
  refundCreditForGeneration,
  reserveCreditForGeneration,
} from "@/lib/local/repositories/generations";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { createServiceLocalClient } from "@/lib/local/db-client";
import { logger } from "@/lib/logger";
import {
  assertOwnedProject,
  assertOwnedReferenceUpload,
  NotFoundError,
} from "@/lib/auth/owner-guard";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { assertAcceptableUpload, MAX_AUDIO_UPLOAD_BYTES } from "@/lib/storage/upload-guards";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const rl = await checkRateLimit(
      `transcribe:${profile.id}`,
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
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 422 });
    }
    const guard = assertAcceptableUpload(file);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason }, { status: 422 });
    }
    await assertOwnedProject(projectId, profile.id);
    await assertOwnedReferenceUpload(referenceUploadId, profile.id);

    const apiRoute = "listen_mode_transcription";
    try {
      await enforceGenerationPolicy(profile, { kind: "hybrid" });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    const creditCost = getCreditCost(apiRoute);

    if (profile.credits_remaining < creditCost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());

    const generation = await createPendingGeneration(
      profile.id, null, { filename: file.name, action: "transcribe" }, "scribe_v2",
      { projectId: projectId, apiRoute, appCreditCost: creditCost }
    );

    let creditsRemaining: number;
    try {
      const reserved = await reserveCreditForGeneration(profile.id, generation.id, creditCost);
      creditsRemaining = reserved.creditsRemaining;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        await failGeneration(generation.id, "Insufficient credits at reservation time");
        return NextResponse.json({ error: "Insufficient credits", generationId: generation.id }, { status: 402 });
      }
      throw err;
    }

    let result: Awaited<ReturnType<typeof transcribeAudio>>;
    try {
      result = await transcribeAudio({
        audioBuffer, filename: file.name, contentType: file.type || "audio/wav",
        model_id: "scribe_v2", tag_audio_events: true, timestamps_granularity: "word", diarize: false,
      });
    } catch (err) {
      await failGeneration(generation.id, err instanceof Error ? err.message : "Transcription failed");
      const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      if (refund) creditsRemaining = refund.creditsRemaining;
      throw err;
    }

    if (!result.success) {
      await failGeneration(generation.id, result.message);
      const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      if (refund) creditsRemaining = refund.creditsRemaining;
      return NextResponse.json({ error: result.message }, { status: result.statusCode || 500 });
    }

    await completeStreamingGeneration(generation.id, "json", {
      requestId: result.metadata.requestId,
      metadata: { action: "transcribe", filename: file.name },
    });

    // Store analysis if reference upload exists
    if (referenceUploadId) {
      const service = createServiceLocalClient();
      await service.from("listen_analyses").insert({
        user_id: profile.id,
        project_id: projectId,
        reference_upload_id: referenceUploadId,
        transcript: result.transcript,
        detected_events: result.audioEvents,
        raw_provider_response: result.rawResponse,
      });
    }

    logUsageEvent({
      userId: profile.id, projectId: projectId, generatedSoundId: generation.id,
      apiRoute, modelId: "scribe_v2", requestId: result.metadata.requestId,
      characterCost: result.metadata.characterCost, appCreditCost: creditCost,
    }).catch((err) => logger.error({ err }, "usage log error"));

    return NextResponse.json({
      transcript: result.transcript,
      audioEvents: result.audioEvents,
      words: result.words,
      creditsRemaining,
      isMock: result.isMock,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Transcribe reference error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
