/**
 * Algophony Studio — ElevenLabs Forced Alignment
 *
 * §3.10: Align text to audio for precise timing data.
 * POST /v1/speech-to-text with alignment mode.
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

export const alignmentInputSchema = z.object({
  audioBuffer: z.instanceof(Buffer),
  filename: z.string().default("audio.wav"),
  contentType: z.string().default("audio/wav"),
  transcript: z.string().min(1),
  model_id: z.string().default("scribe_v2"),
});

export type AlignmentInput = z.infer<typeof alignmentInputSchema>;

export interface AlignmentWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AlignmentResult {
  success: true;
  words: AlignmentWord[];
  metadata: ElevenLabsResponseMetadata;
  isMock: boolean;
}

export async function alignAudio(
  input: AlignmentInput
): Promise<AlignmentResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return getMockAlignment(input.transcript);
  }

  const apiKey = requireApiKey();
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(input.audioBuffer)], { type: input.contentType });
  formData.append("file", blob, input.filename);
  formData.append("model_id", input.model_id);
  formData.append("timestamps_granularity", "word");
  formData.append("text", input.transcript);

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
      let message = `Alignment error (${response.status})`;
      try {
        const body = await response.json();
        message = body?.detail?.message || body?.message || message;
      } catch { /* ignore */ }
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }

    const result = await response.json();
    const metadata = extractResponseMetadata(response);

    return {
      success: true,
      words: (result.words ?? []).map((w: Record<string, unknown>) => ({
        text: String(w.text ?? ""),
        start: Number(w.start ?? 0),
        end: Number(w.end ?? 0),
        confidence: Number(w.confidence ?? 1),
      })),
      metadata,
      isMock: false,
    };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

function getMockAlignment(transcript: string): AlignmentResult {
  const words = transcript.split(/\s+/).map((w, i) => ({
    text: w,
    start: i * 0.4,
    end: i * 0.4 + 0.35,
    confidence: 0.95,
  }));
  return {
    success: true,
    words,
    metadata: { requestId: "mock-align", characterCost: transcript.length, contentType: "application/json" },
    isMock: true,
  };
}
