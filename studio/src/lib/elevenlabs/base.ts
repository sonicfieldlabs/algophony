/**
 * Algophony Studio — ElevenLabs Base Client
 *
 * §4.1: Unified base for all ElevenLabs API interactions.
 * All product-specific modules (sound-effects, tts, music, etc.) compose this base.
 * Zero raw fetch calls outside this file and streaming.ts.
 *
 * Features:
 * - Shared fetchWithRetry from headers.ts
 * - Consistent error mapping via ElevenLabsError
 * - Mock mode branch lives here — full mock or full real, never partial
 * - Request metadata extraction (requestId, characterCost, contentType)
 */

import "server-only";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  extractResponseMetadata,
  mapElevenLabsErrorType,
  parseErrorBody,
} from "./headers";

/** Structured error for all ElevenLabs API failures */
export class ElevenLabsError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly retryable: boolean;

  constructor(opts: {
    code: string;
    status: number;
    message: string;
    requestId?: string | null;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "ElevenLabsError";
    this.code = opts.code;
    this.status = opts.status;
    this.requestId = opts.requestId ?? null;
    this.retryable = opts.retryable ?? false;
  }
}

/** Response metadata extracted from ElevenLabs responses */
export interface ResponseMeta {
  requestId: string | null;
  characterCost: number | null;
  contentType: string;
}

/** Options for making a request */
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  query?: Record<string, string>;
  /** Expected response type */
  responseType?: "json" | "buffer" | "stream";
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Make an authenticated request to the ElevenLabs API.
 *
 * @param path - API path (e.g. "/v1/sound-generation")
 * @param opts - Request options
 * @returns Response with metadata
 *
 * @example
 * const { data, meta } = await elevenLabsRequest<Buffer>("/v1/sound-generation", {
 *   method: "POST",
 *   body: { text: "thunder", model_id: "eleven_text_to_sound_v2" },
 *   responseType: "buffer",
 * });
 */
export async function elevenLabsRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<{ data: T; meta: ResponseMeta }> {
  const apiKey = requireApiKey();
  const method = opts.method ?? "POST";

  // Build URL with query params
  let url = `${ELEVENLABS_BASE}${path}`;
  if (opts.query) {
    const params = new URLSearchParams(opts.query);
    url += `?${params.toString()}`;
  }

  const requestHeaders: Record<string, string> = {
    "xi-api-key": apiKey,
    ...opts.headers,
  };

  let fetchBody: string | undefined;
  if (opts.body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(opts.body);
  }

  const response = await fetchWithRetry(url, {
    method,
    headers: requestHeaders,
    body: fetchBody,
  });

  const meta = extractResponseMetadata(response);
  const responseMeta: ResponseMeta = {
    requestId: meta.requestId,
    characterCost: meta.characterCost,
    contentType: meta.contentType || "application/json",
  };

  if (!response.ok) {
    const errorType = mapElevenLabsErrorType(response.status);
    const message = await parseErrorBody(response);
    const retryable = response.status === 429 || response.status >= 500;

    throw new ElevenLabsError({
      code: errorType,
      status: response.status,
      message,
      requestId: meta.requestId,
      retryable,
    });
  }

  // Parse response based on expected type
  let data: T;
  const responseType = opts.responseType ?? "json";

  if (responseType === "buffer") {
    data = Buffer.from(await response.arrayBuffer()) as unknown as T;
  } else if (responseType === "stream") {
    data = response.body as unknown as T;
  } else {
    data = await response.json() as T;
  }

  return { data, meta: responseMeta };
}

/** Check if mock mode is active */
export function isMockMode(): boolean {
  return process.env.MOCK_ELEVENLABS === "true";
}

/**
 * Get the base URL for ElevenLabs API
 * (exposed for modules that need to construct streaming URLs)
 */
export function getBaseUrl(): string {
  return ELEVENLABS_BASE;
}
