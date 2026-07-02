import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { queryWorkspaceUsage } from "@/lib/elevenlabs/workspace-usage";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    // Admin-only: check plan level
    if (profile.plan !== "studio" && profile.plan !== "team") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await queryWorkspaceUsage(body.startDate, body.endDate);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.statusCode || 500 });
    }

    return NextResponse.json({ data: result.data, isMock: result.isMock });
  } catch (error) {
    logger.error({ err: error }, "Workspace usage error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
