import { NextRequest, NextResponse } from "next/server";
import { authorizeWorkspaceRequest } from "@/lib/auth/request-policy";
export { isLoopbackHost } from "@/lib/auth/request-policy";

export function isLocalRequest(request: NextRequest): boolean {
  return authorizeWorkspaceRequest(request.headers).allowed;
}

export function localOnly(request: NextRequest): NextResponse | null {
  const decision = authorizeWorkspaceRequest(request.headers);
  if (decision.allowed) return null;
  return NextResponse.json({ error: decision.error }, { status: decision.status });
}
