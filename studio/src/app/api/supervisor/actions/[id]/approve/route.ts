import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getAction, approveAction } from "@/lib/supervisor/session-manager";
import { executeApprovedAction } from "@/lib/supervisor/tool-handlers";
import { isValidToolName } from "@/lib/supervisor/types";
import { logger } from "@/lib/logger";

interface Params { params: Promise<{ id: string }> }

/** POST /api/supervisor/actions/[id]/approve — approve and execute a pending action */
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

    // Mark as approved
    await approveAction(id, profile.id);

    // Execute the tool
    const toolName = action.tool_name ?? "";
    if (!isValidToolName(toolName)) {
      return NextResponse.json({ error: "Invalid tool name" }, { status: 400 });
    }

    const result = await executeApprovedAction(
      id,
      toolName,
      action.tool_input,
      {
        userId: profile.id,
        sessionId: action.session_id,
        projectId: action.project_id,
        userPlan: profile.plan,
      }
    );

    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Approve action error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
