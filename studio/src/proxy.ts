import { NextRequest, NextResponse } from "next/server";

let _remoteWarned = false;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();
  const response = nextWithNonce(request, nonce);
  response.headers.set("x-request-id", crypto.randomUUID());

  if (!isLocalRequest(request) && isLocalOnlyPath(pathname)) {
    if (!_remoteWarned) {
      console.warn("[local-first] blocked remote request to local-only app path");
      _remoteWarned = true;
    }
    const blocked = NextResponse.json(
      { error: "Algophony Studio local workspace routes are only available from localhost." },
      { status: 403 }
    );
    applySecurityHeaders(blocked, nonce);
    return blocked;
  }

  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }
      if (originHost !== host) {
        return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
      }
    }
  }

  applySecurityHeaders(response, nonce);
  return response;
}

function nextWithNonce(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function isLocalOnlyPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/local");
}

function isLoopbackHost(hostValue: string | null | undefined): boolean {
  if (!hostValue) return false;
  const host = hostValue.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!host) return false;
  if (host.startsWith("[")) return host.startsWith("[::1]");
  const hostname = host.split(":")[0] ?? "";
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalRequest(request: NextRequest): boolean {
  return isLoopbackHost(request.headers.get("host")) || isLoopbackHost(request.headers.get("x-forwarded-host"));
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

function applySecurityHeaders(response: NextResponse, nonce?: string) {
  const isProd = process.env.NODE_ENV === "production";
  const scriptSrc = nonce
    ? isProd
      ? `'self' 'nonce-${nonce}'`
      : `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : isProd
      ? "'self'"
      : "'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data:",
    "connect-src 'self' https://api.elevenlabs.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const reportOnly = process.env.CSP_REPORT_ONLY === "true";
  response.headers.set(
    reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    csp,
  );

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProd) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  if (nonce) {
    response.headers.set("x-csp-nonce", nonce);
  }
}

export const config = {
  matcher: ["/:path*"],
};
