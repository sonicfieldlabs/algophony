import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getCreditCost } from "@/lib/sfx/credits";
import { checkDailyQuota } from "@/lib/admin/quotas";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { executeGenerateSfx } from "@/lib/operations/generate-sfx";
import { sanitizePromptText } from "@/lib/sfx/sanitize";
import { assertOwnedProject, NotFoundError } from "@/lib/auth/owner-guard";
import { requireFeature, FeatureGateError, buildFeatureGateResponse } from "@/lib/local/access";
import { logger } from "@/lib/logger";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

const cueSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1).max(2000),
  category: z.string().optional(),
  timecodeIn: z.string().optional(),
  durationSeconds: z.number().min(0.5).max(22).optional(),
});

const requestSchema = z.object({
  cues: z.array(cueSchema).min(1).max(200),
  projectId: z.string().uuid().optional(),
  outputFormat: z.string().optional(),
  promptInfluence: z.number().min(0).max(1).optional(),
});

interface BatchResult {
  cueId: string;
  status: "completed" | "failed";
  generationId?: string;
  audioUrl?: string;
  characterCost?: number;
  errorMessage?: string;
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    // Compatibility gate: local workspaces have batch generation access.
    try {
      await requireFeature(profile.id, "batch_prompt_generation");
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json(buildFeatureGateResponse(err), { status: err.status });
      }
      throw err;
    }

    const rl = await checkRateLimit(
      `timeline-batch:${profile.id}`,
      RATE_LIMITS.generation.maxRequests,
      RATE_LIMITS.generation.windowMs
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) } }
      );
    }

    // Quota check
    const quota = await checkDailyQuota(profile.id, profile.plan);
    if (!quota.allowed) {
      return NextResponse.json({
        error: "Daily generation limit reached",
        dailyUsed: quota.dailyUsed,
        dailyLimit: quota.dailyLimit,
        resetAtUtc: quota.resetAtUtc,
      }, { status: 429 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Invalid request",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      }, { status: 422 });
    }

    const { cues, projectId, outputFormat, promptInfluence } = parsed.data;
    await assertOwnedProject(projectId, profile.id);

    const fmt = outputFormat ?? "mp3_44100_128";
    const influence = promptInfluence ?? 0.3;
    try {
      await enforceGenerationPolicy(profile, {
        kind: "sfx",
        requestedCount: cues.length,
        durationSeconds: Math.max(...cues.map((cue) => cue.durationSeconds ?? 4)),
      });
    } catch (err) {
      if (err instanceof GenerationPolicyError) return buildGenerationPolicyResponse(err);
      throw err;
    }

    // Credit check (1 credit per cue)
    const creditCost = getCreditCost("sound_effects");
    const totalCost = cues.length * creditCost;
    if (profile.credits_remaining < totalCost) {
      return NextResponse.json({
        error: "Insufficient credits",
        required: totalCost,
        remaining: profile.credits_remaining,
      }, { status: 402 });
    }
    if (cues.length > quota.remaining) {
      return NextResponse.json({
        error: "Daily generation limit would be exceeded",
        dailyRemaining: quota.remaining,
        requested: cues.length,
        resetAtUtc: quota.resetAtUtc,
      }, { status: 429 });
    }

    // Sequential generation
    const results: BatchResult[] = [];
    let creditsRemaining = profile.credits_remaining;
    let succeeded = 0;
    let failed = 0;

    for (const cue of cues) {
      const durSec = cue.durationSeconds ?? 4;
      try {
        const sanitized = sanitizePromptText(cue.prompt);
        if (sanitized.deniedReason) {
          throw new Error(`Input rejected: ${sanitized.deniedReason}`);
        }

        const result = await executeGenerateSfx(
          {
            text: sanitized.text,
            duration_seconds: durSec,
            loop: false,
            prompt_influence: influence,
            model_id: "eleven_text_to_sound_v2",
            output_format: fmt,
            exclusion_constraints: ["no music", "no dialogue"],
          },
          {
            userId: profile.id,
            plan: profile.plan,
            creditsRemaining,
            projectId: projectId ?? null,
            apiRoute: "timeline_batch",
          }
        );

        if (!result.success) {
          throw new Error(result.message);
        }

        creditsRemaining = result.creditsRemaining;

        results.push({
          cueId: cue.id,
          status: "completed",
          generationId: result.generationId,
          audioUrl: result.audioUrl,
          characterCost: result.characterCost,
        });
        succeeded++;
      } catch (err) {
        results.push({
          cueId: cue.id,
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Generation failed",
        });
        failed++;
      }
    }

    return NextResponse.json({
      results,
      summary: {
        total: cues.length,
        succeeded,
        failed,
        creditsUsed: succeeded * creditCost,
        creditsRemaining,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Timeline batch generation error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
