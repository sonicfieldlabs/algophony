/**
 * Algophony Studio — ElevenLabs Dubbing Client
 *
 * §3.5: Wrap the dubbing API for video/audio translation.
 * Supports: create dubbing → poll status → get result.
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

export const dubbingInputSchema = z.object({
  source_url: z.string().url().optional(),
  source_lang: z.string().default("auto"),
  target_lang: z.string().min(2),
  num_speakers: z.number().int().min(0).max(50).default(0),
  watermark: z.boolean().default(false),
  name: z.string().max(200).optional(),
});

export type DubbingInput = z.infer<typeof dubbingInputSchema>;

export interface DubbingJob {
  dubbing_id: string;
  status: "dubbing" | "dubbed" | "failed";
  expected_duration_sec?: number;
  target_languages: string[];
  error?: string;
}

export interface DubbingResult {
  success: true;
  dubbing_id: string;
  expected_duration_sec: number;
}

/**
 * Create a new dubbing job.
 */
export async function createDubbing(
  input: DubbingInput,
  audioFile?: { buffer: Buffer; filename: string; contentType: string }
): Promise<DubbingResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return {
      success: true,
      dubbing_id: `mock-dub-${Date.now()}`,
      expected_duration_sec: 30,
    };
  }

  const apiKey = requireApiKey();
  const formData = new FormData();

  if (audioFile) {
    const blob = new Blob([new Uint8Array(audioFile.buffer)], { type: audioFile.contentType });
    formData.append("file", blob, audioFile.filename);
  }
  if (input.source_url) formData.append("source_url", input.source_url);

  formData.append("source_lang", input.source_lang);
  formData.append("target_lang", input.target_lang);
  formData.append("num_speakers", String(input.num_speakers));
  formData.append("watermark", String(input.watermark));
  if (input.name) formData.append("name", input.name);

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/dubbing`,
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

    const result = await response.json();
    return {
      success: true,
      dubbing_id: result.dubbing_id,
      expected_duration_sec: result.expected_duration_sec ?? 0,
    };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Poll dubbing job status.
 */
export async function getDubbingStatus(dubbingId: string): Promise<DubbingJob | ElevenLabsError> {
  const apiKey = requireApiKey();

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/dubbing/${dubbingId}`,
      { method: "GET", headers: { "xi-api-key": apiKey } },
      { timeoutMs: 10_000 }
    );

    if (!response.ok) {
      const message = await parseErrorBody(response);
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }

    return await response.json() as DubbingJob;
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Get dubbed audio for a specific language.
 */
export async function getDubbedAudio(
  dubbingId: string,
  languageCode: string
): Promise<{ success: true; audioBuffer: Buffer; contentType: string } | ElevenLabsError> {
  const apiKey = requireApiKey();

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/dubbing/${dubbingId}/audio/${languageCode}`,
      { method: "GET", headers: { "xi-api-key": apiKey } },
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
    };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}
