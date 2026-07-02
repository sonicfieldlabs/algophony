import { NextRequest, NextResponse } from "next/server";

export function isLoopbackHost(hostValue: string | null | undefined): boolean {
  if (!hostValue) return false;
  const host = hostValue.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!host) return false;
  if (host.startsWith("[")) return host.startsWith("[::1]");
  const hostname = host.split(":")[0] ?? "";
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1";
}

export function isLocalRequest(request: NextRequest): boolean {
  return isLoopbackHost(request.headers.get("host")) || isLoopbackHost(request.headers.get("x-forwarded-host"));
}

export function localOnly(request: NextRequest): NextResponse | null {
  if (isLocalRequest(request)) return null;
  return NextResponse.json(
    { error: "Local workspace APIs are only available from localhost." },
    { status: 403 }
  );
}
