/**
 * Algophony Studio — ElevenLabs Sound Effects Client
 *
 * Server-only. Calls POST /v1/sound-generation with proper validation,
 * shared retry logic via fetchWithRetry, and mock mode support.
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
} from "./headers";

const ELEVENLABS_ENDPOINT = `${ELEVENLABS_BASE}/v1/sound-generation`;

export const generateSfxInputSchema = z.object({
  text: z.string().min(1, "Prompt text is required").max(2000, "Prompt text must be under 2,000 characters"),
  duration_seconds: z.number().min(0.5).max(30).nullable().optional(),
  loop: z.boolean().default(false),
  prompt_influence: z.number().min(0).max(1).default(0.3),
  model_id: z.enum(["eleven_text_to_sound_v2"]).default("eleven_text_to_sound_v2"),
  output_format: z.string().optional(),
});

export type GenerateSfxInput = z.infer<typeof generateSfxInputSchema>;

export interface GenerateSfxResult {
  success: true;
  audioBuffer: Buffer;
  contentType: string;
  characterCost: number | null;
  requestId: string | null;
  isMock: boolean;
}

export interface GenerateSfxError {
  success: false;
  statusCode: number;
  errorType: string;
  message: string;
  isMock: boolean;
}

/**
 * Generate a sound effect via ElevenLabs API.
 * Server-only — never call from client code.
 * Uses shared fetchWithRetry from headers.ts for consistent retry behavior.
 */
export async function generateSoundEffect(
  input: GenerateSfxInput
): Promise<GenerateSfxResult | GenerateSfxError> {
  // Mock mode
  if (process.env.MOCK_ELEVENLABS === "true") {
    return generateMockAudio(input);
  }

  let apiKey: string;
  try {
    apiKey = requireApiKey();
  } catch {
    return {
      success: false,
      statusCode: 500,
      errorType: "configuration",
      message: "ELEVENLABS_API_KEY is not configured",
      isMock: false,
    };
  }

  // Build request body
  const body: Record<string, unknown> = {
    text: input.text,
    loop: input.loop,
    prompt_influence: input.prompt_influence,
    model_id: input.model_id,
  };
  if (input.duration_seconds != null) {
    body.duration_seconds = input.duration_seconds;
  }

  // Build URL with optional output_format query param
  let url = ELEVENLABS_ENDPOINT;
  if (input.output_format) {
    url += `?output_format=${encodeURIComponent(input.output_format)}`;
  }

  try {
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const metadata = extractResponseMetadata(response);

      return {
        success: true,
        audioBuffer,
        contentType: metadata.contentType || "audio/mpeg",
        characterCost: metadata.characterCost,
        requestId: metadata.requestId,
        isMock: false,
      };
    }

    // Non-retryable error (fetchWithRetry already handled retries)
    const errorType = mapElevenLabsErrorType(response.status);
    const message = await parseErrorBody(response);

    return {
      success: false,
      statusCode: response.status,
      errorType,
      message,
      isMock: false,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      errorType: "network",
      message: err instanceof Error ? err.message : "Network error",
      isMock: false,
    };
  }
}

/** Generate a mock audio response — short WAV tone */
function generateMockAudio(input: GenerateSfxInput): GenerateSfxResult {
  const sampleRate = 44100;
  const duration = input.duration_seconds ?? 1;
  const numSamples = Math.floor(sampleRate * Math.min(duration, 2)); // cap at 2s for mock
  const frequency = 440; // A4

  // WAV header + PCM data
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return {
    success: true,
    audioBuffer: buffer,
    contentType: "audio/wav",
    characterCost: input.text.length,
    requestId: "mock-sfx-request",
    isMock: true,
  };
}
