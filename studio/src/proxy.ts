import { NextRequest, NextResponse } from "next/server";

import { authorizeWorkspaceRequest } from "@/lib/auth/request-policy";

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname === "/api" || request.nextUrl.pathname.startsWith("/dashboard")) {
    const decision = authorizeWorkspaceRequest(request.headers);
    if (!decision.allowed) {
      const blocked = NextResponse.json({ error: decision.error }, { status: decision.status });
      applySecurityHeaders(blocked, nonce);
      return blocked;
    }
  }
  const response = nextWithNonce(request, nonce);
  response.headers.set("x-request-id", crypto.randomUUID());
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

  response.headers.set("X-Frame-Options", "DENY"); // nosemgrep: javascript.express.security.x-frame-options-misconfiguration.x-frame-options-misconfiguration -- constant deny policy
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
