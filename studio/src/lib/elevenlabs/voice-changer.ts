/**
 * Algophony Studio — ElevenLabs Voice Changer
 *
 * §3.7: Change the voice of existing audio while preserving timing/prosody.
 * POST /v1/speech-to-speech/{voice_id}
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

export const voiceChangerInputSchema = z.object({
  audioBuffer: z.instanceof(Buffer),
  filename: z.string().default("input.wav"),
  contentType: z.string().default("audio/wav"),
  voice_id: z.string().min(1),
  model_id: z.string().default("eleven_english_sts_v2"),
  output_format: z.string().default("mp3_44100_128"),
});

export type VoiceChangerInput = z.infer<typeof voiceChangerInputSchema>;

export interface VoiceChangerResult {
  success: true;
  audioBuffer: Buffer;
  contentType: string;
  isMock: boolean;
}

export async function changeVoice(
  input: VoiceChangerInput
): Promise<VoiceChangerResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return {
      success: true,
      audioBuffer: Buffer.alloc(128),
      contentType: "audio/mpeg",
      isMock: true,
    };
  }

  const apiKey = requireApiKey();
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(input.audioBuffer)], { type: input.contentType });
  formData.append("audio", blob, input.filename);
  formData.append("model_id", input.model_id);
  formData.append("output_format", input.output_format);

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/speech-to-speech/${input.voice_id}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: formData,
      },
      { timeoutMs: 60_000 }
    );

    if (!response.ok) {
      const message = await parseErrorBody(response);
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }

    return {
      success: true,
      audioBuffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || "audio/mpeg",
      isMock: false,
    };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}
