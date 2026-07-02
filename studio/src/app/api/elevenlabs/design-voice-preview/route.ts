import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { designVoice, voiceDesignInputSchema } from "@/lib/elevenlabs/voice-design";
import { logUsageEvent } from "@/lib/local/repositories/usage-events";
import { getCreditCost } from "@/lib/sfx/credits";
import {
  completeStreamingGeneration,
  createPendingGeneration,
  failGeneration,
  InsufficientCreditsError,
  refundCreditForGeneration,
  reserveCreditForGeneration,
} from "@/lib/local/repositories/generations";
import { assertOwnedProject, NotFoundError } from "@/lib/auth/owner-guard";
import { logger } from "@/lib/logger";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

const requestSchema = voiceDesignInputSchema.extend({
  projectId: z.string().uuid().optional(),
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

    const apiRoute = "voice_design_preview";
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

    // Create a minimal generation record for credit tracking
    const generation = await createPendingGeneration(
      profile.id, null,
      { voice_description: input.voice_description, text: input.text },
      input.model_id ?? "voice_design",
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

    const result = await designVoice(input);

    if (!result.success) {
      await failGeneration(generation.id, result.message);
      await refundCreditForGeneration(profile.id, generation.id, creditCost).catch(() => null);
      return NextResponse.json({ error: result.message, generationId: generation.id }, { status: result.statusCode || 500 });
    }

    await completeStreamingGeneration(generation.id, "voice_design", {
      metadata: { generatedVoiceId: result.generatedVoiceId },
    });

    logUsageEvent({
      userId: profile.id, projectId: input.projectId,
      generatedSoundId: generation.id, apiRoute,
      appCreditCost: creditCost,
    }).catch((err) => logger.error({ err }, "usage log error"));

    return NextResponse.json({
      generatedVoiceId: result.generatedVoiceId,
      audioPreviewBase64: result.audioPreviewBase64,
      isMock: result.isMock,
      creditsRemaining,
      status: "succeeded",
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Voice design error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
