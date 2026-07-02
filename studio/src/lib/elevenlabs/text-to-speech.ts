/**
 * Algophony Studio — ElevenLabs Text to Speech Client
 *
 * Server-only. Calls POST /v1/text-to-speech/:voice_id
 * for creature, animal, monster vocal layers.
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

export const ttsInputSchema = z.object({
  voice_id: z.string().min(1, "Voice ID is required"),
  text: z.string().min(1, "Text is required"),
  model_id: z.string().default("eleven_v3"),
  output_format: z.string().default("mp3_44100_128"),
  voice_settings: z
    .object({
      stability: z.number().min(0).max(1).optional(),
      similarity_boost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      speed: z.number().min(0.7).max(1.2).optional(),
      use_speaker_boost: z.boolean().optional(),
    })
    .optional(),
  language_code: z.string().optional(),
  seed: z.number().int().optional(),
});

export type TtsInput = z.infer<typeof ttsInputSchema>;

export interface TtsResult {
  success: true;
  audioBuffer: Buffer;
  metadata: ElevenLabsResponseMetadata;
  isMock: boolean;
}

/**
 * Generate creature vocal layer via ElevenLabs TTS.
 */
export async function generateTtsLayer(
  input: TtsInput
): Promise<TtsResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return generateMockTts(input);
  }

  const apiKey = requireApiKey();

  const body: Record<string, unknown> = {
    text: input.text,
    model_id: input.model_id,
  };
  if (input.voice_settings) body.voice_settings = input.voice_settings;
  if (input.language_code) body.language_code = input.language_code;
  if (input.seed != null) body.seed = input.seed;

  const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${encodeURIComponent(input.voice_id)}?output_format=${encodeURIComponent(input.output_format)}`;

  try {
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await parseErrorBody(response);
      return {
        success: false,
        statusCode: response.status,
        errorType: mapElevenLabsErrorType(response.status),
        message,
      };
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const metadata = extractResponseMetadata(response);

    return {
      success: true,
      audioBuffer,
      metadata,
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

function generateMockTts(input: TtsInput): TtsResult {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * 1);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 220 * t) * 0.2;
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  return {
    success: true,
    audioBuffer: buffer,
    metadata: {
      requestId: "mock-tts-request",
      characterCost: input.text.length,
      contentType: "audio/wav",
    },
    isMock: true,
  };
}
