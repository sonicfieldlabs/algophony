import { timingSafeEqual } from "node:crypto";

/** Provider-backed Playground is disabled by default and never trusts forwarded identity. */
export function requirePlaygroundAccess(request: Request): { ok: true } | { ok: false; status: number; reason: string } {
  if (process.env.ALGOPHONY_ENABLE_PLAYGROUND !== "true") return { ok: false, status: 403, reason: "playground is disabled" };
  const token = process.env.ALGOPHONY_PLAYGROUND_TOKEN;
  if (token) {
    const actual = Buffer.from(request.headers.get("x-playground-token") ?? "");
    const expected = Buffer.from(token);
    if (token.length >= 32 && actual.length === expected.length && timingSafeEqual(actual, expected)) return { ok: true };
    return { ok: false, status: 401, reason: "valid playground token required" };
  }
  const host = request.headers.get("host");
  try {
    if (!host || /[\s,@/\\?#]/.test(host)) throw new Error("invalid host");
    const address = new URL(`http://${host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(address.hostname) || address.host !== host.toLowerCase().replace(/:80$/, "")) throw new Error("non-local host");
    const forwarded = request.headers.get("x-forwarded-host");
    if (request.headers.get("forwarded") || forwarded && forwarded !== host) throw new Error("untrusted forwarding");
    if (process.env.ALGOPHONY_STUDIO_ACCESS_MODE !== "local") throw new Error("local launch required");
    const origin = request.headers.get("origin");
    if (origin && origin !== address.origin) throw new Error("cross-origin request");
    return { ok: true };
  } catch {
    return { ok: false, status: 401, reason: "use a loopback local launch or a configured playground token" };
  }
}

export const authorizeStudio = requirePlaygroundAccess;
