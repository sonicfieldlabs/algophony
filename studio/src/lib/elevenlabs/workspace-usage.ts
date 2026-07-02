/**
 * Algophony Studio — ElevenLabs Workspace Usage Client
 *
 * Server-only. POST /v1/workspace/analytics/query/usage-by-product-over-time
 */

import "server-only";

import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  mapElevenLabsErrorType,
  parseErrorBody,
  type ElevenLabsError,
} from "./headers";

export interface WorkspaceUsageResult {
  success: true;
  data: Record<string, unknown>[];
  isMock: boolean;
}

export async function queryWorkspaceUsage(
  startDate?: string,
  endDate?: string
): Promise<WorkspaceUsageResult | ElevenLabsError> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return {
      success: true,
      data: [
        {
          product: "sound_effects",
          date: new Date().toISOString().slice(0, 10),
          character_count: 12500,
          request_count: 42,
        },
      ],
      isMock: true,
    };
  }

  const apiKey = requireApiKey();
  const body: Record<string, unknown> = {};
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;

  try {
    const response = await fetchWithRetry(
      `${ELEVENLABS_BASE}/v1/workspace/analytics/query/usage-by-product-over-time`,
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

    const result = await response.json();
    return {
      success: true,
      data: Array.isArray(result) ? result : result?.data ?? [],
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
