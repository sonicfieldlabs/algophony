/**
 * Playground endpoint gate. Two layers:
 *   1. `ALGOPHONY_ENABLE_PLAYGROUND` must be true.
 *   2. The caller must be on localhost, OR present a valid
 *      `x-playground-token` matching `ALGOPHONY_PLAYGROUND_TOKEN`.
 *
 * If `ALGOPHONY_PLAYGROUND_TOKEN` is unset, only the localhost check applies —
 * keeping single-user dev frictionless while preventing accidental exposure.
 */

const LOCAL_HOSTNAMES = new Set([
  "127.0.0.1",
  "::1",
  "localhost",
  "0.0.0.0",
]);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function studioEnabled(): boolean {
  return process.env.ALGOPHONY_ENABLE_PLAYGROUND === "true";
}

export function authorizeStudio(request: Request): { ok: true } | { ok: false; status: number; reason: string } {
  if (!studioEnabled()) {
    return { ok: false, status: 404, reason: "playground disabled" };
  }

  const expectedToken = process.env.ALGOPHONY_PLAYGROUND_TOKEN;
  const providedToken = request.headers.get("x-playground-token") || "";

  if (expectedToken) {
    if (providedToken && timingSafeEqual(providedToken, expectedToken)) {
      return { ok: true };
    }
    // Token configured: require it. Localhost does not bypass.
    return { ok: false, status: 401, reason: "missing or invalid x-playground-token" };
  }

  // No token configured — fall back to localhost-only.
  const forwarded = request.headers.get("x-forwarded-for");
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (forwarded) {
    // Behind a proxy without a configured token: refuse.
    return { ok: false, status: 401, reason: "playground requires ALGOPHONY_PLAYGROUND_TOKEN behind a proxy" };
  }
  if (LOCAL_HOSTNAMES.has(host)) {
    return { ok: true };
  }
  return { ok: false, status: 401, reason: "playground is localhost-only unless ALGOPHONY_PLAYGROUND_TOKEN is set" };
}
