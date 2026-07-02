/**
 * Algophony Studio — ElevenLabs Music Composition Client
 *
 * Server-only. Uses POST /v1/music for sound-design-oriented layer generation.
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

export const musicComposeInputSchema = z.object({
  prompt: z.string().min(1).max(4100),
  duration_ms: z.number().int().min(3000).max(600000).default(15000),
  instrumental: z.boolean().default(true),
  output_format: z.string().default("mp3_44100_128"),
  seed: z.number().int().optional(),
});

export type MusicComposeInput = z.infer<typeof musicComposeInputSchema>;

export interface MusicComposeResult {
  success: true;
  audioBuffer: Buffer;
  isMock: boolean;
  metadata: {
    contentType: string;
    durationMs: number;
    requestId: string | null;
  };
}

export async function composeMusic(
  input: MusicComposeInput
): Promise<MusicComposeResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    // Return a minimal mock for dev
    return {
      success: true,
      audioBuffer: Buffer.alloc(128),
      isMock: true,
      metadata: {
        contentType: "audio/mpeg",
        durationMs: input.duration_ms,
        requestId: "mock-music-001",
      },
    };
  }

  const apiKey = requireApiKey();
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    duration_ms: input.duration_ms,
    instrumental: input.instrumental,
    output_format: input.output_format,
  };
  if (input.seed != null) body.seed = input.seed;

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/music`,
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

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const requestId = response.headers.get("x-request-id");

    return {
      success: true,
      audioBuffer,
      isMock: false,
      metadata: {
        contentType: response.headers.get("content-type") || "audio/mpeg",
        durationMs: input.duration_ms,
        requestId,
      },
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
