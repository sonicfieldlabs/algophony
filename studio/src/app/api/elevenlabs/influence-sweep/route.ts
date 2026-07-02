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
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { INFLUENCE_PRESETS, type InfluencePresetId } from "@/lib/sfx/prompt-influence";
import { checkDailyQuota } from "@/lib/admin/quotas";
import { sanitizePromptText } from "@/lib/sfx/sanitize";
import { assertOwnedProject, NotFoundError } from "@/lib/auth/owner-guard";
import { logger } from "@/lib/logger";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

const sweepSchema = z.object({
  text: z.string().min(1).max(2000),
  presetId: z.enum(["round_robin", "ui_sounds", "ambiences", "strict", "sweep", "micro", "custom"]),
  customValues: z.array(z.number().min(0).max(1)).max(10).optional(),
  duration_seconds: z.number().min(0.5).max(30).nullable().optional(),
  loop: z.boolean().default(false),
  model_id: z.enum(["eleven_text_to_sound_v2"]).default("eleven_text_to_sound_v2"),
  output_format: z.string().optional(),
  exclusion_constraints: z.array(z.string().max(100)).max(20).default([]),
  projectId: z.string().uuid().optional(),
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

    // Rate limiting (sweep counts as one burst)
    const rl = await checkRateLimit(
      `sweep:${profile.id}`,
      RATE_LIMITS.generation.maxRequests,
      RATE_LIMITS.generation.windowMs
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } }
      );
    }

    const quota = await checkDailyQuota(profile.id, profile.plan);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "Daily generation limit reached",
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          resetAtUtc: quota.resetAtUtc,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = sweepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const sanitized = sanitizePromptText(parsed.data.text);
    if (sanitized.deniedReason) {
      return NextResponse.json(
        { error: "Input rejected", reason: sanitized.deniedReason },
        { status: 422 }
      );
    }

    const input = { ...parsed.data, text: sanitized.text };
    await assertOwnedProject(input.projectId, profile.id);

    const preset = INFLUENCE_PRESETS[input.presetId as InfluencePresetId];
    const values = input.presetId === "custom" && input.customValues?.length
      ? input.customValues
      : preset.values;

    try {
      await enforceGenerationPolicy(profile, {
        kind: "sfx",
        requestedCount: values.length,
        durationSeconds: input.duration_seconds,
      });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    // Credit check
    const apiRoute = "sound_effects";
    const creditCost = getCreditCost(apiRoute);
    const totalCost = values.length * creditCost;
    if (values.length > quota.remaining) {
      return NextResponse.json(
        {
          error: "Daily generation limit would be exceeded",
          dailyRemaining: quota.remaining,
          generationCount: values.length,
          resetAtUtc: quota.resetAtUtc,
        },
        { status: 429 }
      );
    }

    if (profile.credits_remaining < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient credits for sweep",
          creditsRemaining: profile.credits_remaining,
          totalCost,
          generationCount: values.length,
        },
        { status: 402 }
      );
    }

    // Run sequential generations at each influence value
    const results: Array<{
      index: number;
      influence: number;
      status: "completed" | "failed";
      audioUrl?: string;
      generationId?: string;
      characterCost?: number;
      errorMessage?: string;
    }> = [];

    let creditsUsed = 0;
    let creditsRemaining = profile.credits_remaining;

    for (let i = 0; i < values.length; i++) {
      const influence = values[i];

      const generation = await createPendingGeneration(
        profile.id,
        null,
        {
          text: input.text,
          duration_seconds: input.duration_seconds,
          loop: input.loop,
          prompt_influence: influence,
          model_id: input.model_id,
          exclusion_constraints: input.exclusion_constraints,
          sweep_index: i,
          sweep_preset: input.presetId,
        },
        input.model_id,
        { projectId: input.projectId, apiRoute, appCreditCost: creditCost }
      );

      let reservedCredit = false;
      try {
        try {
          const reserved = await reserveCreditForGeneration(profile.id, generation.id, creditCost);
          creditsRemaining = reserved.creditsRemaining;
          reservedCredit = true;
        } catch (err) {
          if (err instanceof InsufficientCreditsError) {
            await failGeneration(generation.id, "Insufficient credits at reservation time");
            results.push({
              index: i,
              influence,
              status: "failed",
              generationId: generation.id,
              errorMessage: "Insufficient credits",
            });
            continue;
          }
          throw err;
        }

        const result = await generateAdvancedSfx({
          text: input.text,
          duration_seconds: input.duration_seconds ?? undefined,
          loop: input.loop,
          prompt_influence: influence,
          model_id: input.model_id,
          output_format: input.output_format,
          exclusion_constraints: input.exclusion_constraints,
        });

        if (!result.success) {
          await failGeneration(generation.id, result.message);
          const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
          if (refund) creditsRemaining = refund.creditsRemaining;
          results.push({ index: i, influence, status: "failed", generationId: generation.id, errorMessage: result.message });
          continue;
        }

        const upload = await uploadGenerationAudio(
          generation.id,
          Buffer.from(result.audioBuffer),
          result.contentType
        );

        await completeGeneration(
          generation.id,
          upload.storagePath,
          upload.signedUrl,
          result.characterCost,
          input.duration_seconds ?? null,
          result.contentType.includes("wav") ? "wav" : "mp3",
          { requestId: result.requestId, metadata: { sweep_index: i, prompt_influence: influence } }
        );

        creditsUsed += creditCost;

        logUsageEvent({
          userId: profile.id,
          projectId: input.projectId,
          generatedSoundId: generation.id,
          apiRoute,
          modelId: input.model_id,
          requestId: result.requestId,
          characterCost: result.characterCost,
          outputFormat: input.output_format ?? "mp3",
          appCreditCost: creditCost,
          metadata: { sweep_preset: input.presetId, sweep_index: i, prompt_influence: influence },
        }).catch((err) => logger.error({ err }, "usage log error"));

        results.push({
          index: i,
          influence,
          status: "completed",
          audioUrl: upload.signedUrl,
          generationId: generation.id,
          characterCost: result.characterCost ?? undefined,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        await failGeneration(generation.id, msg);
        if (reservedCredit) {
          const refund = await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
          if (refund) creditsRemaining = refund.creditsRemaining;
        }
        results.push({ index: i, influence, status: "failed", generationId: generation.id, errorMessage: msg });
      }
    }

    const completed = results.filter((r) => r.status === "completed").length;

    return NextResponse.json({
      presetId: input.presetId,
      prompt: input.text,
      results,
      summary: {
        total: values.length,
        completed,
        failed: values.length - completed,
        creditsUsed,
        creditsRemaining,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Influence sweep error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
