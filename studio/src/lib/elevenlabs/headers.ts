/**
 * Algophony Studio — ElevenLabs Response Header Utilities
 *
 * Shared extraction of provider response metadata.
 * Server-only — import only from API routes and server-side modules.
 */

import "server-only";
import { readElevenLabsApiKeySync } from "@/lib/local/provider-settings";

// §1.8 — Refuse to start in production with mock mode enabled
if (process.env.NODE_ENV === "production" && process.env.MOCK_ELEVENLABS === "true") {
  throw new Error(
    "[FATAL] MOCK_ELEVENLABS=true is forbidden in production. " +
    "Mock mode generates fake audio that corrupts the library. " +
    "Remove MOCK_ELEVENLABS from your production environment."
  );
}

export interface ElevenLabsResponseMetadata {
  requestId: string | null;
  characterCost: number | null;
  contentType: string | null;
}

/**
 * Extract standard metadata headers from an ElevenLabs API response.
 */
export function extractResponseMetadata(
  response: Response
): ElevenLabsResponseMetadata {
  const requestId = response.headers.get("request-id");
  const charCost =
    response.headers.get("character-cost") ||
    response.headers.get("x-character-count");
  const contentType = response.headers.get("content-type");

  return {
    requestId: requestId || null,
    characterCost: charCost ? parseInt(charCost, 10) : null,
    contentType: contentType || null,
  };
}

/**
 * Standard error type mapping from ElevenLabs HTTP status codes.
 */
export function mapElevenLabsErrorType(status: number): string {
  if (status === 401 || status === 403) return "auth";
  if (status === 402) return "quota";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "unknown";
}

/** Base error shape returned by all ElevenLabs clients */
export interface ElevenLabsError {
  success: false;
  statusCode: number;
  errorType: string;
  message: string;
}

/** Shared constants */
export const ELEVENLABS_BASE = "https://api.elevenlabs.io";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const BACKOFF_BASE_MS = 800;
export const MAX_RETRIES = 2;
export const RETRYABLE_CODES = [429, 500, 502, 503, 504];

/**
 * Get the ElevenLabs API key from the local workspace first, then the
 * environment for backward-compatible development setups.
 */
export function requireApiKey(): string {
  const key = readElevenLabsApiKeySync();
  if (!key) {
    throw new Error("ElevenLabs API key is not configured. Add your own key in Settings -> Providers.");
  }
  return key;
}

/**
 * Parse an error body from an ElevenLabs response.
 */
export async function parseErrorBody(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.detail?.message || body?.message || `ElevenLabs API error (${response.status})`;
  } catch {
    return `ElevenLabs API error (${response.status})`;
  }
}

/**
 * Execute a fetch with retry logic for transient failures.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? MAX_RETRIES;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const jitter = Math.random() * 200;
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok || !RETRYABLE_CODES.includes(response.status)) {
        return response;
      }

      // Retryable error — continue loop
      lastError = new Error(`ElevenLabs API error (${response.status})`);
      // We need to consume the body to avoid memory leaks
      await response.text().catch(() => {});
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Network error");
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new Error("Request timed out");
      }
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}
