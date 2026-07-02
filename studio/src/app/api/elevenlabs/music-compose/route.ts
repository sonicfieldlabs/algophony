import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { composeMusic, musicComposeInputSchema } from "@/lib/elevenlabs/music";
import {
  createPendingGeneration, completeGeneration, failGeneration,
  InsufficientCreditsError, refundCreditForGeneration, reserveCreditForGeneration,
  uploadGenerationAudio,
} from "@/lib/local/repositories/generations";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { getCreditCost } from "@/lib/sfx/credits";
import { assertOwnedProject, NotFoundError } from "@/lib/auth/owner-guard";
import { logger } from "@/lib/logger";
import { formatStorageBytes, getStorageLimitBytes, StorageQuotaError } from "@/lib/storage/objects";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

const requestSchema = musicComposeInputSchema.extend({
  projectId: z.string().uuid().optional(),
  layerType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const input = parsed.data;
    await assertOwnedProject(input.projectId, profile.id);

    const apiRoute = "music_synth_layer";
    try {
      await enforceGenerationPolicy(profile, {
        kind: "music",
        durationSeconds: input.duration_ms / 1000,
      });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    const creditCost = getCreditCost(apiRoute);

    if (profile.credits_remaining < creditCost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const generation = await createPendingGeneration(
      profile.id, null,
      { prompt: input.prompt, duration_ms: input.duration_ms, layerType: input.layerType },
      "music_v1",
      { projectId: input.projectId, apiRoute, appCreditCost: creditCost }
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

    const result = await composeMusic(input);

    if (!result.success) {
      await failGeneration(generation.id, result.message);
      await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      return NextResponse.json({ error: result.message, generationId: generation.id }, { status: result.statusCode || 500 });
    }

    let audioUrl: string, storagePath: string;
    try {
      const upload = await uploadGenerationAudio(generation.id, result.audioBuffer, result.metadata.contentType);
      audioUrl = upload.signedUrl; storagePath = upload.storagePath;
    } catch (uploadError) {
      await failGeneration(generation.id, uploadError instanceof Error ? uploadError.message : "Storage upload failed");
      const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      if (refund) creditsRemaining = refund.creditsRemaining;
      const quotaExceeded = uploadError instanceof StorageQuotaError;
      return NextResponse.json(
        { error: quotaExceeded ? `Storage limit reached. Algophony Studio is capped at ${formatStorageBytes(getStorageLimitBytes())}.` : "Storage failed" },
        { status: quotaExceeded ? 413 : 500 },
      );
    }

    await completeGeneration(generation.id, storagePath, audioUrl, null, result.metadata.durationMs / 1000, input.output_format.includes("wav") ? "wav" : "mp3", { requestId: result.metadata.requestId, isMock: result.isMock });

    logUsageEvent({
      userId: profile.id, projectId: input.projectId,
      generatedSoundId: generation.id, apiRoute,
      modelId: "music_v1", requestId: result.metadata.requestId,
      appCreditCost: creditCost,
    }).catch((err) => logger.error({ err }, "usage log error"));

    return NextResponse.json({
      generationId: generation.id, audioUrl, creditsRemaining,
      durationMs: result.metadata.durationMs, isMock: result.isMock, status: "succeeded",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Music synth error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
