import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { generateAdvancedSfx } from "@/lib/elevenlabs/sound-effects";
import {
  createPendingGeneration,
  completeGeneration,
  failGeneration,
  InsufficientCreditsError,
  refundCreditForGeneration,
  reserveCreditForGeneration,
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
  text: z.string().min(1),
  duration_seconds: z.number().min(0.5).max(30).nullable().optional(),
  loop: z.boolean().default(false),
  prompt_influence: z.number().min(0).max(1).default(0.3),
  model_id: z.enum(["eleven_text_to_sound_v2"]).default("eleven_text_to_sound_v2"),
  output_format: z.string().default("mp3_44100_128"),
  exclusion_constraints: z.array(z.string()).default(["no music", "no dialogue"]),
  creature_type: z.string().optional(),
  animal_reference: z.string().optional(),
  body_size: z.string().optional(),
  mouth_type: z.string().optional(),
  breath_texture: z.string().optional(),
  pitch_register: z.string().optional(),
  speed: z.string().optional(),
  aggression_level: z.string().optional(),
  wet_dry_texture: z.string().optional(),
  distance: z.string().optional(),
  acoustic_space: z.string().optional(),
  realism_level: z.string().optional(),
  layer_role: z.enum(["main", "background", "texture", "accent"]).default("main"),
});

export async function POST(request: NextRequest) {
  try {
    let profile;
    try {
      profile = await requireProfile();
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse(err.message);
      throw err;
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const input = parsed.data;
    await assertOwnedProject(input.projectId, profile.id);

    const apiRoute = "sound_effects";
    try {
      await enforceGenerationPolicy(profile, {
        kind: "sfx",
        durationSeconds: input.duration_seconds,
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
      profile.id,
      input.promptCardId ?? null,
      { ...input },
      input.model_id,
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

    const result = await generateAdvancedSfx({
      text: input.text,
      duration_seconds: input.duration_seconds,
      loop: input.loop,
      prompt_influence: input.prompt_influence,
      model_id: input.model_id,
      output_format: input.output_format,
      exclusion_constraints: input.exclusion_constraints,
    });

    if (!result.success) {
      await failGeneration(generation.id, result.message);
      await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      return NextResponse.json({ error: result.message, generationId: generation.id }, { status: result.statusCode || 500 });
    }

    let audioUrl: string, storagePath: string;
    try {
      const upload = await uploadGenerationAudio(generation.id, Buffer.from(result.audioBuffer), result.contentType);
      audioUrl = upload.signedUrl;
      storagePath = upload.storagePath;
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

    await completeGeneration(generation.id, storagePath, audioUrl, result.characterCost, input.duration_seconds ?? null, result.contentType.includes("wav") ? "wav" : "mp3", { requestId: result.requestId, isMock: result.isMock });

    // Store creature layer metadata
    const service = createServiceLocalClient();
    await service.from("creature_layers").insert({
      user_id: profile.id,
      project_id: input.projectId ?? null,
      prompt_card_id: input.promptCardId ?? null,
      generation_id: generation.id,
      api_route: apiRoute,
      creature_type: input.creature_type ?? null,
      animal_reference: input.animal_reference ?? null,
      body_size: input.body_size ?? null,
      mouth_type: input.mouth_type ?? null,
      breath_texture: input.breath_texture ?? null,
      pitch_register: input.pitch_register ?? null,
      speed: input.speed ?? null,
      aggression_level: input.aggression_level ?? null,
      wet_dry_texture: input.wet_dry_texture ?? null,
      distance: input.distance ?? null,
      acoustic_space: input.acoustic_space ?? null,
      realism_level: input.realism_level ?? null,
      layer_role: input.layer_role,
    });

    logUsageEvent({
      userId: profile.id, projectId: input.projectId, generatedSoundId: generation.id,
      apiRoute, modelId: input.model_id, requestId: result.requestId,
      characterCost: result.characterCost, outputFormat: input.output_format,
      appCreditCost: creditCost,
    }).catch((err) => logger.error({ err }, "usage log error"));

    return NextResponse.json({
      generationId: generation.id, audioUrl, creditsRemaining,
      characterCost: result.characterCost, isMock: result.isMock, status: "succeeded",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Generate creature layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
