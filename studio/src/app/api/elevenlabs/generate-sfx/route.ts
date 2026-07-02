import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse, type UserProfile } from "@/lib/auth/current-user";
import { advancedSfxInputSchema, generateAdvancedSfx } from "@/lib/elevenlabs/sound-effects";
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
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { checkDailyQuota } from "@/lib/admin/quotas";
import { logApiRequest, extractClientIp, startRequestTimer } from "@/lib/admin/audit-log";
import { sanitizePromptText } from "@/lib/sfx/sanitize";
import { assertOwnedProject, NotFoundError } from "@/lib/auth/owner-guard";
import { requestLogger } from "@/lib/logger";
import {
  formatStorageBytes,
  getStorageLimitBytes,
  StorageQuotaError,
} from "@/lib/storage/objects";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

const requestSchema = advancedSfxInputSchema.extend({
  projectId: z.string().uuid().optional(),
  promptCardId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const elapsed = startRequestTimer();
  const clientIp = extractClientIp(request.headers);
  const log = requestLogger(request.headers.get("x-request-id"));
  let profile: UserProfile | undefined;
  let creditCost = 1;
  let statusCode = 200;
  try {
    try {
      profile = await requireProfile();
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse(err.message);
      throw err;
    }

    // Rate limiting
    const rl = await checkRateLimit(`gen:${profile.id}`, RATE_LIMITS.generation.maxRequests, RATE_LIMITS.generation.windowMs);
    if (!rl.allowed) {
      statusCode = 429;
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } }
      );
    }

    // Daily quota enforcement
    const quota = await checkDailyQuota(profile.id, profile.plan);
    if (!quota.allowed) {
      statusCode = 429;
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
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      statusCode = 422;
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 }
      );
    }

    // §2.5: Centralized sanitization with prompt-injection detection
    const sanitized = sanitizePromptText(parsed.data.text);
    if (sanitized.deniedReason) {
      statusCode = 422;
      return NextResponse.json(
        { error: "Input rejected", reason: sanitized.deniedReason },
        { status: 422 }
      );
    }
    const input = { ...parsed.data, text: sanitized.text };
    await assertOwnedProject(input.projectId, profile.id);

    const apiRoute = "sound_effects";
    try {
      await enforceGenerationPolicy(profile, {
        kind: "sfx",
        durationSeconds: input.duration_seconds,
      });
    } catch (err) {
      if (err instanceof GenerationPolicyError) {
        statusCode = err.status;
        return buildGenerationPolicyResponse(err);
      }
      throw err;
    }

    creditCost = getCreditCost(apiRoute);

    if (profile.credits_remaining < creditCost) {
      statusCode = 402;
      return NextResponse.json(
        {
          error: "Insufficient credits",
          creditsRemaining: profile.credits_remaining,
          creditCost,
        },
        { status: 402 }
      );
    }

    const generation = await createPendingGeneration(
      profile.id,
      input.promptCardId ?? null,
      {
        text: input.text,
        duration_seconds: input.duration_seconds,
        loop: input.loop,
        prompt_influence: input.prompt_influence,
        model_id: input.model_id,
        exclusion_constraints: input.exclusion_constraints,
      },
      input.model_id,
      {
        projectId: input.projectId,
        apiRoute,
        appCreditCost: creditCost,
      }
    );

    // Atomically reserve credit BEFORE the ElevenLabs call.
    // RPC's WHERE credits_remaining >= amount prevents concurrent overspend.
    let creditsRemaining: number;
    try {
      const reserved = await reserveCreditForGeneration(profile.id, generation.id, creditCost);
      creditsRemaining = reserved.creditsRemaining;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        await failGeneration(generation.id, "Insufficient credits at reservation time");
        statusCode = 402;
        return NextResponse.json(
          {
            error: "Insufficient credits",
            creditsRemaining: profile.credits_remaining,
            creditCost,
            generationId: generation.id,
          },
          { status: 402 }
        );
      }
      throw err;
    }

    const refundOnFailure = async () => {
      try {
        const refund = await refundCreditForGeneration(profile!.id, generation.id, creditCost);
        creditsRemaining = refund.creditsRemaining;
      } catch (refundErr) {
        log.error({ generationId: generation.id, err: refundErr }, "[generate-sfx] Refund failed; manual reconciliation required");
      }
    };

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
      await refundOnFailure();
      statusCode = result.statusCode || 500;
      return NextResponse.json(
        {
          error: result.message,
          errorType: result.errorType,
          generationId: generation.id,
          creditsRemaining,
        },
        { status: result.statusCode || 500 }
      );
    }

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
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Storage upload failed";
      await failGeneration(generation.id, message);
      await refundOnFailure();
      statusCode = uploadError instanceof StorageQuotaError ? 413 : 500;
      return NextResponse.json(
        {
          error: uploadError instanceof StorageQuotaError
            ? `Storage limit reached. Algophony Studio is capped at ${formatStorageBytes(getStorageLimitBytes())}. Credit was refunded.`
            : "Generated audio could not be stored. Credit was refunded.",
          generationId: generation.id,
          creditsRemaining,
        },
        { status: statusCode }
      );
    }

    await completeGeneration(
      generation.id,
      storagePath,
      audioUrl,
      result.characterCost,
      input.duration_seconds ?? null,
      result.contentType.includes("wav") ? "wav" : "mp3",
      { requestId: result.requestId, isMock: result.isMock }
    );

    // Log usage event (non-blocking)
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
    }).catch((err) => log.error({ err }, "usage log error"));

    return NextResponse.json({
      generationId: generation.id,
      audioUrl,
      characterCost: result.characterCost ?? 0,
      requestId: result.requestId,
      isMock: result.isMock,
      creditsRemaining,
      finalPromptText: result.finalPromptText,
      status: "succeeded",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      statusCode = 404;
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    statusCode = 500;
    log.error({ err: error, userId: profile?.id }, "[generate-sfx] internal error");
    // In dev/preview, leak the actual error to make debugging possible; in
    // production keep the message generic. The errorType field always travels
    // so the frontend can surface a helpful hint either way.
    const isProd = process.env.NODE_ENV === "production";
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: isProd ? "Internal server error" : message,
        errorType: "internal",
        ...(isProd ? {} : { stack: error instanceof Error ? error.stack : undefined }),
      },
      { status: 500 }
    );
  } finally {
    // Non-blocking audit log
    logApiRequest({
      userId: profile?.id ?? null,
      method: "POST",
      path: "/api/elevenlabs/generate-sfx",
      statusCode,
      durationMs: elapsed(),
      creditCost,
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent"),
    }).catch(() => {});
  }
}
