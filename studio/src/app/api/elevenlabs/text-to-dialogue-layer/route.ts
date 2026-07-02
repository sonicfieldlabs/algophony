import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { generateDialogue } from "@/lib/elevenlabs/text-to-dialogue";
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

const requestSchema = z.object({
  projectId: z.string().uuid().optional(),
  promptCardId: z.string().uuid().optional(),
  inputs: z.array(z.object({
    text: z.string().min(1),
    voice_id: z.string().min(1),
  })).min(1),
  model_id: z.string().default("eleven_v3"),
  output_format: z.string().default("mp3_44100_128"),
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

    const apiRoute = "text_to_dialogue";
    try {
      await enforceGenerationPolicy(profile, { kind: "voice" });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    const creditCost = getCreditCost(apiRoute);

    if (profile.credits_remaining < creditCost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const generation = await createPendingGeneration(
      profile.id, input.promptCardId ?? null, { ...input }, input.model_id,
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

    const result = await generateDialogue({
      inputs: input.inputs, model_id: input.model_id, output_format: input.output_format,
    });

    if (!result.success) {
      await failGeneration(generation.id, result.message);
      await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      return NextResponse.json({ error: result.message, generationId: generation.id }, { status: result.statusCode || 500 });
    }

    let audioUrl: string, storagePath: string;
    try {
      const upload = await uploadGenerationAudio(generation.id, result.audioBuffer, result.metadata.contentType || "audio/mpeg");
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

    await completeGeneration(generation.id, storagePath, audioUrl, result.metadata.characterCost, null, input.output_format.includes("wav") ? "wav" : "mp3", { requestId: result.metadata.requestId, isMock: result.isMock });

    logUsageEvent({
      userId: profile.id, projectId: input.projectId, generatedSoundId: generation.id,
      apiRoute, modelId: input.model_id, requestId: result.metadata.requestId,
      characterCost: result.metadata.characterCost, appCreditCost: creditCost,
    }).catch((err) => logger.error({ err }, "usage log error"));

    return NextResponse.json({
      generationId: generation.id, audioUrl, creditsRemaining,
      characterCost: result.metadata.characterCost, isMock: result.isMock, status: "succeeded",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Text-to-dialogue layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
