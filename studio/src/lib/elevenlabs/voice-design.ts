/**
 * Algophony Studio — ElevenLabs Voice Design Client
 *
 * Server-only. POST /v1/text-to-voice/design for creature voice previews.
 */

import "server-only";

import { z } from "zod";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  mapElevenLabsErrorType,
  parseErrorBody,
  type ElevenLabsError,
} from "./headers";

export const voiceDesignInputSchema = z.object({
  voice_description: z.string().min(1, "Voice description is required"),
  text: z.string().min(1, "Preview text is required"),
  model_id: z.string().optional(),
  seed: z.number().int().optional(),
  guidance: z.number().min(0).max(1).optional(),
  output_format: z.string().default("mp3_44100_128"),
});

export type VoiceDesignInput = z.infer<typeof voiceDesignInputSchema>;

export interface VoiceDesignResult {
  success: true;
  generatedVoiceId: string | null;
  audioPreviewBase64: string | null;
  audioBuffer: Buffer | null;
  isMock: boolean;
}

export async function designVoice(
  input: VoiceDesignInput
): Promise<VoiceDesignResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return {
      success: true,
      generatedVoiceId: "mock-voice-id-001",
      audioPreviewBase64: null,
      audioBuffer: null,
      isMock: true,
    };
  }

  const apiKey = requireApiKey();
  const body: Record<string, unknown> = {
    voice_description: input.voice_description,
    text: input.text,
  };
  if (input.model_id) body.model_id = input.model_id;
  if (input.seed != null) body.seed = input.seed;
  if (input.guidance != null) body.guidance = input.guidance;
  if (input.output_format) body.output_format = input.output_format;

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/text-to-voice/design`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const message = await parseErrorBody(response);
      return {
        success: false,
        statusCode: response.status,
        errorType: mapElevenLabsErrorType(response.status),
        message,
      };
    }

    const result = await response.json();
    return {
      success: true,
      generatedVoiceId: result.voice_id ?? null,
      audioPreviewBase64: result.audio_preview ?? null,
      audioBuffer: result.audio_preview
        ? Buffer.from(result.audio_preview, "base64")
        : null,
      isMock: false,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      errorType: "network",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}
