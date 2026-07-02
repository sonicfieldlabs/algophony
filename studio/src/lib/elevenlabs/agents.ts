/**
 * Algophony Studio — ElevenLabs Agents Client
 *
 * Server-only. Generates signed URLs for the Agent.
 */

import "server-only";

import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  mapElevenLabsErrorType,
  type ElevenLabsError,
} from "./headers";

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID ?? "";

/**
 * Get a signed URL for starting an ElevenLabs agent conversation.
 * The signed URL is passed to the React SDK's startSession().
 */
export async function getAgentSignedUrl(): Promise<
  { success: true; signedUrl: string } | ElevenLabsError
> {
  if (!AGENT_ID) {
    return {
      success: false,
      statusCode: 500,
      errorType: "configuration",
      message: "ELEVENLABS_AGENT_ID is not configured",
    };
  }

  const apiKey = requireApiKey();

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      },
      { timeoutMs: 10_000 }
    );

    if (!response.ok) {
      let message = `Signed URL error (${response.status})`;
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

    const body = await response.json();
    return { success: true, signedUrl: body.signed_url };
  } catch (err) {
    return {
      success: false,
      statusCode: 0,
      errorType: "network",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Get the configured agent ID.
 */
export function getAgentId(): string {
  return AGENT_ID;
}
