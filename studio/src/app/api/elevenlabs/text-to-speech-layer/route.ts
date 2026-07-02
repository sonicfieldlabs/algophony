import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { generateTtsLayer } from "@/lib/elevenlabs/text-to-speech";
import {
  createPendingGeneration, completeGeneration, failGeneration,
  InsufficientCreditsError, refundCreditForGeneration, reserveCreditForGeneration,
  uploadGenerationAudio,
} from "@/lib/local/repositories/generations";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { getCreditCost } from "@/lib/sfx/credits";
import { createServiceLocalClient } from "@/lib/local/db-client";
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
  voice_id: z.string().min(1, "Voice ID is required"),
  text: z.string().min(1),
  model_id: z.string().default("eleven_v3"),
  output_format: z.string().default("mp3_44100_128"),
  creature_type: z.string().optional(),
  layer_role: z.enum(["main", "background", "texture", "accent"]).default("main"),
  voice_settings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarity_boost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    speed: z.number().min(0.7).max(1.2).optional(),
    use_speaker_boost: z.boolean().optional(),
  }).optional(),
  language_code: z.string().optional(),
  seed: z.number().int().optional(),
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

    const apiRoute = "tts_creature_layer";
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

    const result = await generateTtsLayer({
      voice_id: input.voice_id, text: input.text, model_id: input.model_id,
      output_format: input.output_format, voice_settings: input.voice_settings,
      language_code: input.language_code,
      seed: input.seed,
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

    const service = createServiceLocalClient();
    await service.from("creature_layers").insert({
      user_id: profile.id, project_id: input.projectId ?? null,
      prompt_card_id: input.promptCardId ?? null, generation_id: generation.id,
      api_route: apiRoute, creature_type: input.creature_type ?? null,
      layer_role: input.layer_role,
    });

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
    logger.error({ err: error }, "TTS creature layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
