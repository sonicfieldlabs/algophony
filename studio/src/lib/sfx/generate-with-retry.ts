/**
 * One-attempt retry for /api/elevenlabs/generate-sfx calls.
 *
 * On 429, reads Retry-After (seconds) and sleeps before a single retry.
 * Returns the final Response so callers can read the JSON body themselves.
 */

export interface GenerateRetryOptions {
  /** Max single backoff in ms (default 8000). */
  maxBackoffMs?: number;
  /** Fallback delay if Retry-After is missing (default 1500ms). */
  fallbackDelayMs?: number;
}

export async function fetchSfxWithRetry(
  body: unknown,
  opts: GenerateRetryOptions = {}
): Promise<Response> {
  const maxBackoffMs = opts.maxBackoffMs ?? 8000;
  const fallbackDelayMs = opts.fallbackDelayMs ?? 1500;

  const send = () => fetch("/api/elevenlabs/generate-sfx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let res = await send();
  if (res.status !== 429) return res;

  const retryAfter = res.headers.get("Retry-After");
  let delayMs = fallbackDelayMs;
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (!Number.isNaN(seconds)) {
      delayMs = Math.min(maxBackoffMs, Math.ceil(seconds * 1000));
    }
  }
  await new Promise((r) => setTimeout(r, delayMs));
  res = await send();
  return res;
}
