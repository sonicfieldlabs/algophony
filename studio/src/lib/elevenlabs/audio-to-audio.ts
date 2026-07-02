/**
 * Algophony Studio — ElevenLabs Audio-to-Audio (Sound-to-Sound)
 *
 * §3.3: Transform existing audio using text prompts.
 * POST /v1/sound-generation with source audio input.
 */

import "server-only";

import { z } from "zod";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  extractResponseMetadata,
  mapElevenLabsErrorType,
  parseErrorBody,
  type ElevenLabsError,
  type ElevenLabsResponseMetadata,
} from "./headers";

export const audioToAudioInputSchema = z.object({
  audioBuffer: z.instanceof(Buffer),
  filename: z.string().default("source.wav"),
  contentType: z.string().default("audio/wav"),
  prompt: z.string().min(1).max(2000),
  model_id: z.string().default("eleven_text_to_sound_v2"),
  seed: z.number().int().optional(),
  strength: z.number().min(0).max(1).default(0.5),
});

export type AudioToAudioInput = z.infer<typeof audioToAudioInputSchema>;

export interface AudioToAudioResult {
  success: true;
  audioBuffer: Buffer;
  metadata: ElevenLabsResponseMetadata;
  isMock: boolean;
}

export async function transformAudio(
  input: AudioToAudioInput
): Promise<AudioToAudioResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return {
      success: true,
      audioBuffer: Buffer.alloc(128),
      metadata: { requestId: "mock-a2a", characterCost: null, contentType: "audio/mpeg" },
      isMock: true,
    };
  }

  const apiKey = requireApiKey();
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(input.audioBuffer)], { type: input.contentType });
  formData.append("audio", blob, input.filename);
  formData.append("text", input.prompt);
  formData.append("model_id", input.model_id);
  formData.append("strength", String(input.strength));
  if (input.seed != null) formData.append("seed", String(input.seed));

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/sound-generation`,
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

    const metadata = extractResponseMetadata(response);
    return {
      success: true,
      audioBuffer: Buffer.from(await response.arrayBuffer()),
      metadata,
      isMock: false,
    };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}
