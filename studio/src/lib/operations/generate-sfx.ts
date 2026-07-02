/**
 * Algophony Studio — Generate SFX Operation
 *
 * Core business logic for generating a sound effect via ElevenLabs.
 * Extracted from the route handler so both HTTP routes and supervisor
 * tool handlers can invoke the same pipeline.
 *
 * §1.2 / §4.3 — Operations layer: route is thin wrapper, supervisor calls directly.
 */

import { generateAdvancedSfx, type AdvancedSfxInput } from "@/lib/elevenlabs/sound-effects";
import {
  createPendingGeneration,
  completeGeneration,
  failGeneration,
  reserveCreditForGeneration,
  refundCreditForGeneration,
  uploadGenerationAudio,
  InsufficientCreditsError,
} from "@/lib/local/repositories/generations";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { getCreditCost } from "@/lib/sfx/credits";
import { logger } from "@/lib/logger";
import { applyLocalFullAccessToProfile } from "@/lib/local/full-access";
import {
  formatStorageBytes,
  getStorageLimitBytes,
  StorageQuotaError,
} from "@/lib/storage/objects";
import {
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

export interface GenerateSfxContext {
  userId: string;
  userEmail?: string | null;
  plan: string;
  creditsRemaining: number;
  projectId?: string | null;
  promptCardId?: string | null;
  apiRoute?: string;
}

export interface GenerateSfxOperationInput {
  text: string;
  duration_seconds?: number | null;
  loop?: boolean;
  prompt_influence?: number;
  model_id?: "eleven_text_to_sound_v2";
  output_format?: string;
  exclusion_constraints?: string[];
}

export interface GenerateSfxOperationResult {
  success: true;
  generationId: string;
  audioUrl: string;
  characterCost: number;
  requestId: string | null;
  isMock: boolean;
  creditsRemaining: number;
  finalPromptText: string;
}

export interface GenerateSfxOperationError {
  success: false;
  code: string;
  message: string;
  statusCode: number;
  generationId?: string;
}

/**
 * Execute a complete SFX generation pipeline:
 * validate provider-call allowance → create pending → call ElevenLabs → upload → complete → log
 */
export async function executeGenerateSfx(
  input: GenerateSfxOperationInput,
  ctx: GenerateSfxContext
): Promise<GenerateSfxOperationResult | GenerateSfxOperationError> {
  const apiRoute = ctx.apiRoute ?? "sound_effects";
  const creditCost = getCreditCost(apiRoute);
  const effectiveAccess = applyLocalFullAccessToProfile({
    plan: ctx.plan,
    credits_remaining: ctx.creditsRemaining,
    monthly_credit_limit: ctx.creditsRemaining,
  });
  const effectiveCreditsRemaining = effectiveAccess.credits_remaining ?? ctx.creditsRemaining;

  // Cheap pre-flight check — the real enforcement is the atomic reservation below.
  if (effectiveCreditsRemaining < creditCost) {
    return {
      success: false,
      code: "insufficient_credits",
      message: "Insufficient credits",
      statusCode: 402,
    };
  }

  const sfxInput: AdvancedSfxInput = {
    text: input.text,
    duration_seconds: input.duration_seconds ?? null,
    loop: input.loop ?? false,
    prompt_influence: input.prompt_influence ?? 0.3,
    model_id: input.model_id ?? "eleven_text_to_sound_v2",
    output_format: input.output_format,
    exclusion_constraints: input.exclusion_constraints ?? [],
  };

  try {
    await enforceGenerationPolicy(
      { id: ctx.userId, email: ctx.userEmail ?? null },
      { kind: "sfx", durationSeconds: sfxInput.duration_seconds },
    );
  } catch (error) {
    if (error instanceof GenerationPolicyError) {
      return {
        success: false,
        code: error.code,
        message: error.message,
        statusCode: error.status,
      };
    }
    throw error;
  }

  // Create pending generation record
  const generation = await createPendingGeneration(
    ctx.userId,
    ctx.promptCardId ?? null,
    {
      text: sfxInput.text,
      duration_seconds: sfxInput.duration_seconds,
      loop: sfxInput.loop,
      prompt_influence: sfxInput.prompt_influence,
      model_id: sfxInput.model_id,
      exclusion_constraints: sfxInput.exclusion_constraints,
    },
    sfxInput.model_id,
    {
      projectId: ctx.projectId ?? undefined,
      apiRoute,
      appCreditCost: creditCost,
    }
  );

  // Atomically reserve credit BEFORE calling ElevenLabs.
  // The RPC's `WHERE credits_remaining >= amount` prevents concurrent
  // requests from both passing the pre-flight check and going negative.
  let creditsRemaining: number;
  try {
    const reserved = await reserveCreditForGeneration(ctx.userId, generation.id, creditCost);
    creditsRemaining = reserved.creditsRemaining;
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      await failGeneration(generation.id, "Insufficient credits at reservation time");
      return {
        success: false,
        code: "insufficient_credits",
        message: "Insufficient credits",
        statusCode: 402,
        generationId: generation.id,
      };
    }
    throw err;
  }

  // From here on, any failure must refund the reservation.
  const refundOnFailure = async () => {
    try {
      const refund = await refundCreditForGeneration(ctx.userId, generation.id, creditCost);
      creditsRemaining = refund.creditsRemaining;
    } catch (refundErr) {
      logger.error({ generationId: generation.id, err: refundErr }, "[generate-sfx] Refund failed; manual reconciliation required");
    }
  };

  // Call ElevenLabs
  const result = await generateAdvancedSfx(sfxInput);

  if (!result.success) {
    await failGeneration(generation.id, result.message);
    await refundOnFailure();
    return {
      success: false,
      code: result.errorType,
      message: result.message,
      statusCode: result.statusCode || 500,
      generationId: generation.id,
    };
  }

  // Upload audio to storage
  let audioUrl: string;
  let storagePath: string;
  try {
    const upload = await uploadGenerationAudio(
      generation.id,
      Buffer.from(result.audioBuffer),
      result.contentType
    );
    audioUrl = upload.signedUrl;
    storagePath = upload.storagePath;
  } catch (uploadError) {
    const message = uploadError instanceof Error ? uploadError.message : "Storage upload failed";
    await failGeneration(generation.id, message);
    await refundOnFailure();
    return {
      success: false,
      code: "storage_error",
      message: uploadError instanceof StorageQuotaError
        ? `Storage limit reached. Algophony Studio is capped at ${formatStorageBytes(getStorageLimitBytes())}. Credit was refunded.`
        : "Generated audio could not be stored. Credit was refunded.",
      statusCode: uploadError instanceof StorageQuotaError ? 413 : 500,
      generationId: generation.id,
    };
  }

  // Complete generation record
  await completeGeneration(
    generation.id,
    storagePath,
    audioUrl,
    result.characterCost,
    input.duration_seconds ?? null,
    result.contentType.includes("wav") ? "wav" : "mp3",
    { requestId: result.requestId, isMock: result.isMock }
  );

  // Log usage (non-blocking)
  logUsageEvent({
    userId: ctx.userId,
    projectId: ctx.projectId ?? undefined,
    generatedSoundId: generation.id,
    apiRoute,
    modelId: sfxInput.model_id,
    requestId: result.requestId,
    characterCost: result.characterCost,
    outputFormat: input.output_format ?? "mp3",
    appCreditCost: creditCost,
  }).catch(() => {});

  return {
    success: true,
    generationId: generation.id,
    audioUrl,
    characterCost: result.characterCost ?? 0,
    requestId: result.requestId,
    isMock: result.isMock,
    creditsRemaining,
    finalPromptText: result.finalPromptText,
  };
}
