/**
 * Algophony Studio — ElevenLabs Audio Isolation Client
 *
 * Server-only. POST /v1/audio-isolation for reference cleanup.
 */

import "server-only";

import { z } from "zod";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  extractResponseMetadata,
  mapElevenLabsErrorType,
  type ElevenLabsError,
  type ElevenLabsResponseMetadata,
} from "./headers";

export const isolationInputSchema = z.object({
  audioBuffer: z.instanceof(Buffer),
  filename: z.string().default("audio.wav"),
  contentType: z.string().default("audio/wav"),
});

export type IsolationInput = z.infer<typeof isolationInputSchema>;

export interface IsolationResult {
  success: true;
  audioBuffer: Buffer;
  metadata: ElevenLabsResponseMetadata;
  isMock: boolean;
}

export async function isolateAudio(
  input: IsolationInput
): Promise<IsolationResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return {
      success: true,
      audioBuffer: input.audioBuffer, // Return input unchanged in mock
      metadata: {
        requestId: "mock-isolation-request",
        characterCost: null,
        contentType: "audio/wav",
      },
      isMock: true,
    };
  }

  const apiKey = requireApiKey();

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(input.audioBuffer)], { type: input.contentType });
  formData.append("file", blob, input.filename);

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/audio-isolation`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: formData,
      },
      { timeoutMs: 60_000 }
    );

    if (!response.ok) {
      let message = `Audio isolation error (${response.status})`;
      try {
        const body = await response.json();
        message = body?.detail?.message || body?.message || message;
      } catch { /* ignore */ }
      return {
        success: false,
        statusCode: response.status,
        errorType: mapElevenLabsErrorType(response.status),
        message,
      };
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const metadata = extractResponseMetadata(response);

    return { success: true, audioBuffer, metadata, isMock: false };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      errorType: "network",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}
