/**
 * Studio endpoint gate. Two layers:
 *   1. `ALGOPHONY_ENABLE_STUDIO` must be true (existing behaviour).
 *   2. The caller must be on localhost, OR present a valid
 *      `x-studio-token` matching `ALGOPHONY_STUDIO_TOKEN`.
 *
 * If `ALGOPHONY_STUDIO_TOKEN` is unset, only the localhost check applies —
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
  return process.env.ALGOPHONY_ENABLE_STUDIO === "true";
}

export function authorizeStudio(request: Request): { ok: true } | { ok: false; status: number; reason: string } {
  if (!studioEnabled()) {
    return { ok: false, status: 404, reason: "studio disabled" };
  }

  const expectedToken = process.env.ALGOPHONY_STUDIO_TOKEN;
  const providedToken = request.headers.get("x-studio-token") || "";

  if (expectedToken) {
    if (providedToken && timingSafeEqual(providedToken, expectedToken)) {
      return { ok: true };
    }
    // Token configured: require it. Localhost does not bypass.
    return { ok: false, status: 401, reason: "missing or invalid x-studio-token" };
  }

  // No token configured — fall back to localhost-only.
  const forwarded = request.headers.get("x-forwarded-for");
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (forwarded) {
    // Behind a proxy without a configured token: refuse.
    return { ok: false, status: 401, reason: "studio requires ALGOPHONY_STUDIO_TOKEN behind a proxy" };
  }
  if (LOCAL_HOSTNAMES.has(host)) {
    return { ok: true };
  }
  return { ok: false, status: 401, reason: "studio is localhost-only unless ALGOPHONY_STUDIO_TOKEN is set" };
}
