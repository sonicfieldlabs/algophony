/**
 * Algophony Studio — ElevenLabs Voices CRUD Client
 *
 * §3.4: Full voice library management — list, get, add, edit, delete.
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

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  description: string | null;
  preview_url: string | null;
}

export interface VoiceListResult {
  success: true;
  voices: Voice[];
}

/**
 * List all available voices.
 */
export async function listVoices(): Promise<VoiceListResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return { success: true, voices: MOCK_VOICES };
  }

  const apiKey = requireApiKey();
  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/voices`,
      { method: "GET", headers: { "xi-api-key": apiKey } }
    );
    if (!response.ok) {
      const message = await parseErrorBody(response);
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }
    const data = await response.json();
    return { success: true, voices: (data.voices ?? []) as Voice[] };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Get a single voice by ID.
 */
export async function getVoice(voiceId: string): Promise<{ success: true; voice: Voice } | ElevenLabsError> {
  const apiKey = requireApiKey();
  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/voices/${voiceId}`,
      { method: "GET", headers: { "xi-api-key": apiKey } }
    );
    if (!response.ok) {
      const message = await parseErrorBody(response);
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }
    return { success: true, voice: await response.json() as Voice };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

export const addVoiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  labels: z.record(z.string(), z.string()).optional(),
});

/**
 * Add a new cloned voice from audio samples.
 */
export async function addVoice(
  input: z.infer<typeof addVoiceSchema>,
  files: Array<{ buffer: Buffer; filename: string; contentType: string }>
): Promise<{ success: true; voice_id: string } | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return { success: true, voice_id: `mock-clone-${Date.now()}` };
  }

  const apiKey = requireApiKey();
  const formData = new FormData();
  formData.append("name", input.name);
  if (input.description) formData.append("description", input.description);
  if (input.labels) formData.append("labels", JSON.stringify(input.labels));

  for (const file of files) {
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.contentType });
    formData.append("files", blob, file.filename);
  }

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/voices/add`,
      { method: "POST", headers: { "xi-api-key": apiKey }, body: formData },
      { timeoutMs: 60_000 }
    );
    if (!response.ok) {
      const message = await parseErrorBody(response);
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }
    const result = await response.json();
    return { success: true, voice_id: result.voice_id };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Delete a voice by ID.
 */
export async function deleteVoice(voiceId: string): Promise<{ success: true } | ElevenLabsError> {
  const apiKey = requireApiKey();
  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/voices/${voiceId}`,
      { method: "DELETE", headers: { "xi-api-key": apiKey } }
    );
    if (!response.ok) {
      const message = await parseErrorBody(response);
      return { success: false, statusCode: response.status, errorType: mapElevenLabsErrorType(response.status), message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, statusCode: 0, errorType: "network", message: err instanceof Error ? err.message : "Network error" };
  }
}

const MOCK_VOICES: Voice[] = [
  { voice_id: "mock-narrator", name: "Narrator", category: "premade", labels: { accent: "american" }, description: "Warm narrator", preview_url: null },
  { voice_id: "mock-creature", name: "Creature", category: "cloned", labels: { use_case: "sfx" }, description: "Creature vocalizations", preview_url: null },
];
