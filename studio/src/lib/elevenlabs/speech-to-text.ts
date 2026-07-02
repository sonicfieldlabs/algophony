/**
 * Algophony Studio — ElevenLabs Speech to Text Client
 *
 * Server-only. POST /v1/speech-to-text for Listen Mode reference analysis.
 * Supports audio-event tagging and timestamps.
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

export const sttInputSchema = z.object({
  audioBuffer: z.instanceof(Buffer),
  filename: z.string().default("audio.wav"),
  contentType: z.string().default("audio/wav"),
  model_id: z.string().default("scribe_v2"),
  tag_audio_events: z.boolean().default(true),
  timestamps_granularity: z.enum(["word", "character", "none"]).default("word"),
  diarize: z.boolean().default(false),
});

export type SttInput = z.infer<typeof sttInputSchema>;

export interface SttResult {
  success: true;
  transcript: string;
  audioEvents: Array<{ tag: string; start?: number; end?: number }>;
  words: Array<{ text: string; start: number; end: number }>;
  metadata: ElevenLabsResponseMetadata;
  rawResponse: Record<string, unknown>;
  isMock: boolean;
}

export async function transcribeAudio(
  input: SttInput
): Promise<SttResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return getMockTranscription();
  }

  const apiKey = requireApiKey();

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(input.audioBuffer)], { type: input.contentType });
  formData.append("file", blob, input.filename);
  formData.append("model_id", input.model_id);
  formData.append("tag_audio_events", String(input.tag_audio_events));
  formData.append("timestamps_granularity", input.timestamps_granularity);
  if (input.diarize) formData.append("diarize", "true");

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/speech-to-text`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: formData,
      },
      { timeoutMs: 60_000 }
    );

    if (!response.ok) {
      let message = `STT error (${response.status})`;
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

    const result = await response.json();
    const metadata = extractResponseMetadata(response);

    return {
      success: true,
      transcript: result.text ?? "",
      audioEvents: (result.audio_events ?? []).map(
        (e: Record<string, unknown>) => ({
          tag: String(e.tag ?? e.type ?? ""),
          start: typeof e.start === "number" ? e.start : undefined,
          end: typeof e.end === "number" ? e.end : undefined,
        })
      ),
      words: (result.words ?? []).map(
        (w: Record<string, unknown>) => ({
          text: String(w.text ?? ""),
          start: Number(w.start ?? 0),
          end: Number(w.end ?? 0),
        })
      ),
      metadata,
      rawResponse: result,
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

function getMockTranscription(): SttResult {
  return {
    success: true,
    transcript: "[sound of footsteps on gravel]",
    audioEvents: [
      { tag: "footsteps", start: 0.0, end: 2.5 },
      { tag: "gravel_crunch", start: 0.5, end: 2.0 },
    ],
    words: [
      { text: "[sound", start: 0, end: 0.3 },
      { text: "of", start: 0.3, end: 0.5 },
      { text: "footsteps", start: 0.5, end: 1.2 },
      { text: "on", start: 1.2, end: 1.4 },
      { text: "gravel]", start: 1.4, end: 2.0 },
    ],
    metadata: {
      requestId: "mock-stt-request",
      characterCost: 30,
      contentType: "application/json",
    },
    rawResponse: {},
    isMock: true,
  };
}
