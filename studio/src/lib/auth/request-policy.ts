import { timingSafeEqual } from "node:crypto";

type HeaderSource = Pick<Headers, "get">;
export type AccessDecision = { allowed: true } | { allowed: false; status: number; error: string };

export function parseAuthority(value: string | null | undefined): string | null {
  if (!value || /[\s,@/\\?#]/.test(value)) return null;
  try {
    const parsed = new URL(`http://${value}`);
    if (!parsed.hostname || parsed.username || parsed.password || parsed.pathname !== "/") return null;
    if (parsed.port && Number(parsed.port) < 1) return null;
    // URL parsers normalize alternative numeric IP forms. Accept only explicit authorities.
    if (parsed.host.toLowerCase() !== value.toLowerCase().replace(/:80$/, "")) return null;
    return parsed.host.toLowerCase();
  } catch {
    return null;
  }
}

export function isLoopbackHost(value: string | null | undefined): boolean {
  const authority = parseAuthority(value);
  if (!authority) return false;
  const hostname = new URL(`http://${authority}`).hostname;
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

function denied(error: string, status = 403): AccessDecision {
  return { allowed: false, status, error };
}

export function authorizeWorkspaceRequest(headers: HeaderSource, env: Record<string, string | undefined> = process.env): AccessDecision {
  const authority = parseAuthority(headers.get("host"));
  if (!authority) return denied("A valid workspace host is required.");
  const forwarded = headers.get("x-forwarded-host");
  if (forwarded && parseAuthority(forwarded) !== authority) return denied("Forwarded host does not match the workspace host.");
  // A Forwarded header is not a trusted source of workspace identity.
  if (headers.get("forwarded")) return denied("Forwarded requests require a direct, configured endpoint.");
  const mode = env.ALGOPHONY_STUDIO_ACCESS_MODE;
  let expectedOrigin: URL;
  if (mode === "local") {
    if (!isLoopbackHost(authority)) return denied("Local workspace access requires localhost.");
    expectedOrigin = new URL(`http://${authority}`);
  } else if (mode === "remote") {
    const token = env.ALGOPHONY_STUDIO_ACCESS_TOKEN;
    if (!token || token.length < 32 || !env.ALGOPHONY_STUDIO_ORIGIN) return denied("Remote workspace access is not configured.", 503);
    try {
      expectedOrigin = new URL(env.ALGOPHONY_STUDIO_ORIGIN);
      if (!["http:", "https:"].includes(expectedOrigin.protocol) || expectedOrigin.username || expectedOrigin.password || expectedOrigin.pathname !== "/" || expectedOrigin.search || expectedOrigin.hash) return denied("Invalid configured workspace origin.", 503);
    } catch {
      return denied("Invalid configured workspace origin.", 503);
    }
    if (parseAuthority(expectedOrigin.host) !== authority) return denied("Host does not match the configured workspace origin.");
    const supplied = headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    const actual = Buffer.from(supplied);
    const expected = Buffer.from(token);
    if (!headers.get("authorization")?.startsWith("Bearer ") || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return denied("Workspace access token required.", 401);
  } else {
    return denied("Start Studio with a configured local or authenticated remote access mode.", 503);
  }
  const origin = headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.origin !== expectedOrigin.origin || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return denied("Cross-origin workspace requests are not allowed.");
    } catch {
      return denied("Invalid workspace origin.");
    }
  }
  return { allowed: true };
}
