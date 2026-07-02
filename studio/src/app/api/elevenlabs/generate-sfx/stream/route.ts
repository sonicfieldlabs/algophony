/**
 * Algophony Studio — Streaming SFX API Route
 *
 * §3.1: Returns a streaming Response of audio bytes.
 * First byte audible <600ms on healthy connection.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { streamSfxGeneration } from "@/lib/elevenlabs/streaming";
import { sanitizePromptText } from "@/lib/sfx/sanitize";
import { checkDailyQuota } from "@/lib/admin/quotas";
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
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

const schema = z.object({
  text: z.string().min(1).max(2000),
  duration_seconds: z.number().min(0.5).max(30).nullable().optional(),
  prompt_influence: z.number().min(0).max(1).default(0.3),
  output_format: z.string().optional(),
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

    const rl = await checkRateLimit(
      `stream:${profile.id}`,
      RATE_LIMITS.generation.maxRequests,
      RATE_LIMITS.generation.windowMs
    );
    if (!rl.allowed) {
      return Response.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      );
    }

    const quota = await checkDailyQuota(profile.id, profile.plan);
    if (!quota.allowed) {
      return Response.json(
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request", details: parsed.error.issues }, { status: 422 });
    }

    const sanitized = sanitizePromptText(parsed.data.text);
    if (sanitized.deniedReason) {
      return Response.json({ error: "Input rejected", reason: sanitized.deniedReason }, { status: 422 });
    }

    const apiRoute = "sound_effects";
    try {
      await enforceGenerationPolicy(profile, {
        kind: "sfx",
        durationSeconds: parsed.data.duration_seconds,
      });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    const creditCost = getCreditCost(apiRoute);
    if (profile.credits_remaining < creditCost) {
      return Response.json(
        { error: "Insufficient credits", creditsRemaining: profile.credits_remaining, creditCost },
        { status: 402 }
      );
    }

    const generation = await createPendingGeneration(
      profile.id,
      null,
      {
        text: sanitized.text,
        duration_seconds: parsed.data.duration_seconds,
        prompt_influence: parsed.data.prompt_influence,
        output_format: parsed.data.output_format,
        streaming: true,
      },
      "eleven_text_to_sound_v2",
      { apiRoute, appCreditCost: creditCost }
    );

    let creditsRemaining: number;
    try {
      const reserved = await reserveCreditForGeneration(profile.id, generation.id, creditCost);
      creditsRemaining = reserved.creditsRemaining;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        await failGeneration(generation.id, "Insufficient credits at reservation time");
        return Response.json(
          { error: "Insufficient credits", creditsRemaining: profile.credits_remaining, creditCost },
          { status: 402 }
        );
      }
      throw error;
    }

    let streamResult: Awaited<ReturnType<typeof streamSfxGeneration>>;
    try {
      streamResult = await streamSfxGeneration({
        text: sanitized.text,
        duration_seconds: parsed.data.duration_seconds,
        prompt_influence: parsed.data.prompt_influence,
        output_format: parsed.data.output_format,
      });
    } catch (error) {
      await failGeneration(generation.id, error instanceof Error ? error.message : "Streaming failed");
      await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      throw error;
    }

    await completeStreamingGeneration(
      generation.id,
      parsed.data.output_format ?? streamResult.contentType,
      { requestId: streamResult.requestId, metadata: { streaming: true } }
    );

    logUsageEvent({
      userId: profile.id,
      generatedSoundId: generation.id,
      apiRoute,
      modelId: "eleven_text_to_sound_v2",
      requestId: streamResult.requestId,
      outputFormat: parsed.data.output_format ?? streamResult.contentType,
      appCreditCost: creditCost,
      metadata: { streaming: true },
    }).catch(() => {});

    return new Response(streamResult.stream, {
      headers: {
        "Content-Type": streamResult.contentType,
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-store",
        "X-Generation-Id": generation.id,
        "X-Credits-Remaining": String(creditsRemaining),
        ...(streamResult.requestId ? { "X-Provider-Request-Id": streamResult.requestId } : {}),
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Streaming failed" },
      { status: 500 }
    );
  }
}
