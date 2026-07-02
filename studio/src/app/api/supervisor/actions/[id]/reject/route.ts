import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getAction, rejectAction } from "@/lib/supervisor/session-manager";
import { logger } from "@/lib/logger";

interface Params { params: Promise<{ id: string }> }

/** POST /api/supervisor/actions/[id]/reject — reject a pending action */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const profile = await requireProfile();
    const { id } = await params;

    const action = await getAction(id);
    if (!action || action.user_id !== profile.id) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }
    if (action.status !== "pending_approval") {
      return NextResponse.json(
        { error: `Action is not pending approval (status: ${action.status})` },
        { status: 400 }
      );
    }

    const rejected = await rejectAction(id, profile.id);
    return NextResponse.json({ action: rejected });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Reject action error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
