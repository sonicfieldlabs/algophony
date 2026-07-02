import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import {
  FeatureGateError,
  buildFeatureGateResponse,
  requireFeature,
} from "@/lib/local/access";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { sanitizePromptText } from "@/lib/sfx/sanitize";
import { requireApiKey, ELEVENLABS_BASE, fetchWithRetry } from "@/lib/elevenlabs/headers";
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
 * POST /api/elevenlabs/tts-chat
 *
 * Text-to-speech for Wilhelm chat responses.
 * Returns audio/mpeg binary stream.
 */

const requestSchema = z.object({
  text: z.string().min(1).max(5000),
});

function resolveVoiceId(): string {
  const envVoice = process.env.ELEVENLABS_WILHELM_VOICE_ID;
  if (envVoice) return envVoice;
  if (process.env.NODE_ENV === "production") {
    logger.warn("[tts-chat] ELEVENLABS_WILHELM_VOICE_ID not configured; using default voice");
  }
  return "JBFqnCBsd6RMkjVDRZzb"; // Default: George
}

export async function POST(req: NextRequest) {
  let demoGenerationId: string | null = null;
  try {
    let profile;
    try {
      profile = await requireProfile();
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse(err.message);
      throw err;
    }

    const rl = await checkRateLimit(
      `tts-chat:${profile.id}`,
      RATE_LIMITS.api.maxRequests,
      RATE_LIMITS.api.windowMs,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again shortly.", retryAfterMs: rl.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) } },
      );
    }

    try {
      await requireFeature(profile.id, "supervisor_chat");
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json(buildFeatureGateResponse(err), { status: err.status });
      }
      throw err;
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 },
      );
    }

    const sanitized = sanitizePromptText(parsed.data.text, { maxLength: 5000 });
    if (sanitized.deniedReason) {
      return NextResponse.json(
        { error: "Input rejected", reason: sanitized.deniedReason },
        { status: 422 },
      );
    }
    if (!sanitized.text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const policy = await enforceGenerationPolicy(profile, { kind: "voice" }).catch((err) => {
      if (err instanceof GenerationPolicyError) return err;
      throw err;
    });
    if (policy instanceof GenerationPolicyError) return buildGenerationPolicyResponse(policy);

    const voiceId = resolveVoiceId();
    const apiKey = requireApiKey();

    if (policy.isDemo) {
      const generation = await createPendingGeneration(
        profile.id,
        null,
        { text: sanitized.text, voice_id: voiceId, chat_tts: true },
        "eleven_v3",
        { apiRoute: "tts_chat", appCreditCost: 0 },
      );
      demoGenerationId = generation.id;
    }

    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: sanitized.text,
          model_id: "eleven_v3",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const upstreamDetail = await response.text().catch(() => "");
      if (demoGenerationId) await failGeneration(demoGenerationId, upstreamDetail || "TTS generation failed");
      logger.error(
        { status: response.status, detail: upstreamDetail, userId: profile.id },
        "[tts-chat] ElevenLabs error",
      );
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        {
          error: "TTS generation failed",
          ...(isProd ? {} : { detail: upstreamDetail }),
        },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    if (demoGenerationId) {
      await completeStreamingGeneration(demoGenerationId, "audio/mpeg", {
        metadata: { action: "tts_chat" },
      });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (demoGenerationId) {
      await failGeneration(demoGenerationId, err instanceof Error ? err.message : "Internal error").catch(() => null);
    }
    logger.error({ err }, "[tts-chat] internal error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
