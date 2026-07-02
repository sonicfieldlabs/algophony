import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getCreditCost } from "@/lib/sfx/credits";
import { generateTtsWithTiming } from "@/lib/elevenlabs/tts";
import { logger } from "@/lib/logger";
import {
  completeStreamingGeneration,
  createPendingGeneration,
  failGeneration,
} from "@/lib/local/repositories/generations";
import {
  buildGenerationPolicyResponse,
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";

/**
 * POST /api/elevenlabs/tts-with-timing
 *
 * Calls ElevenLabs TTS with-timestamps endpoint to return
 * character-level and word-level timing alignment data.
 * Used by TimingSyncPanel for cue sheets, subtitles, and game engine exports.
 *
 * Timing-aware TTS endpoint backed by the shared tts.ts module.
 */

const requestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  voice_id: z.string().min(1, "Voice ID is required"),
  model_id: z.string().default("eleven_v3"),
  output_format: z.string().default("mp3_44100_128"),
  language_code: z.string().optional(),
  seed: z.number().int().optional(),
  voice_settings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarity_boost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    speed: z.number().min(0.7).max(1.2).optional(),
    use_speaker_boost: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  let demoGenerationId: string | null = null;
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const input = parsed.data;
    const apiRoute = "tts_with_timing";
    const policy = await enforceGenerationPolicy(profile, { kind: "voice" }).catch((err) => {
      if (err instanceof GenerationPolicyError) return err;
      throw err;
    });
    if (policy instanceof GenerationPolicyError) return buildGenerationPolicyResponse(policy);

    const creditCost = getCreditCost("tts_creature_layer");

    if (profile.credits_remaining < creditCost) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    if (policy.isDemo) {
      const generation = await createPendingGeneration(
        profile.id,
        null,
        { text: input.text, voice_id: input.voice_id, timed: true },
        input.model_id,
        { apiRoute, appCreditCost: 0 },
      );
      demoGenerationId = generation.id;
    }

    // Use shared TTS module — handles mock mode, retry, and error mapping
    const result = await generateTtsWithTiming({
      text: input.text,
      voice_id: input.voice_id,
      model_id: input.model_id,
      output_format: input.output_format,
      language_code: input.language_code,
      seed: input.seed,
      voice_settings: input.voice_settings,
    });

    if (!result.success) {
      if (demoGenerationId) await failGeneration(demoGenerationId, result.message);
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode || 500 }
      );
    }

    if (demoGenerationId) {
      await completeStreamingGeneration(demoGenerationId, "json", {
        metadata: { action: "tts_with_timing" },
      });
    }

    return NextResponse.json({
      timing: result.timing,
      audioBase64: result.audioBase64,
    });
  } catch (err) {
    if (demoGenerationId) {
      await failGeneration(demoGenerationId, err instanceof Error ? err.message : "Internal error").catch(() => null);
    }
    logger.error({ err: err }, "[tts-with-timing] Error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
