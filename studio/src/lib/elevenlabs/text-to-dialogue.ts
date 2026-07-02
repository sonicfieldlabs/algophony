/**
 * Algophony Studio — ElevenLabs Text to Dialogue Client
 *
 * Server-only. Calls POST /v1/text-to-dialogue for multi-creature
 * call-response or layered vocal sketches. Maximum 10 unique voices.
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

const dialogueInputEntrySchema = z.object({
  text: z.string().min(1),
  voice_id: z.string().min(1),
});

export const dialogueInputSchema = z.object({
  inputs: z
    .array(dialogueInputEntrySchema)
    .min(1, "At least one dialogue input is required"),
  model_id: z.string().default("eleven_v3"),
  output_format: z.string().default("mp3_44100_128"),
});

export type DialogueInput = z.infer<typeof dialogueInputSchema>;

export interface DialogueResult {
  success: true;
  audioBuffer: Buffer;
  metadata: ElevenLabsResponseMetadata;
  isMock: boolean;
}

const MAX_UNIQUE_VOICES = 10;

/**
 * Generate multi-voice creature dialogue via ElevenLabs.
 */
export async function generateDialogue(
  input: DialogueInput
): Promise<DialogueResult | ElevenLabsError> {
  // Validate max unique voices
  const uniqueVoices = new Set(input.inputs.map((i) => i.voice_id));
  if (uniqueVoices.size > MAX_UNIQUE_VOICES) {
    return {
      success: false,
      statusCode: 422,
      errorType: "validation",
      message: `Too many unique voices (${uniqueVoices.size}). Maximum is ${MAX_UNIQUE_VOICES}.`,
    };
  }

  if (process.env.MOCK_ELEVENLABS === "true") {
    return generateMockDialogue(input);
  }

  const apiKey = requireApiKey();

  const body = {
    inputs: input.inputs,
    model_id: input.model_id,
  };

  const url = `${ELEVENLABS_BASE}/v1/text-to-dialogue?output_format=${encodeURIComponent(input.output_format)}`;

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

function generateMockDialogue(input: DialogueInput): DialogueResult {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * input.inputs.length * 0.5);
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
    const sample = Math.sin(2 * Math.PI * 330 * t) * 0.15;
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  return {
    success: true,
    audioBuffer: buffer,
    metadata: {
      requestId: "mock-dialogue-request",
      characterCost: input.inputs.reduce((sum, i) => sum + i.text.length, 0),
      contentType: "audio/wav",
    },
    isMock: true,
  };
}
