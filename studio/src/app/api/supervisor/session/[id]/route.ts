import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
  getSession,
  updateSession,
  endSession,
  listSessionActions,
  listSessionSuggestions,
} from "@/lib/supervisor/session-manager";

interface Params { params: Promise<{ id: string }> }

/** GET /api/supervisor/session/[id] — get session details with actions */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const profile = await requireProfile();
    const { id } = await params;
    const session = await getSession(id);
    if (!session || session.user_id !== profile.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const [actions, suggestions] = await Promise.all([
      listSessionActions(id),
      listSessionSuggestions(id),
    ]);

    return NextResponse.json({ session, actions, suggestions });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Get session error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/supervisor/session/[id] — update session */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const profile = await requireProfile();
    const { id } = await params;
    const session = await getSession(id);
    if (!session || session.user_id !== profile.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "end") {
      const updated = await endSession(id, body.summary);
      return NextResponse.json({ session: updated });
    }

    const updated = await updateSession(id, {
      mode: body.mode ?? session.mode,
      conversation_id: body.conversation_id ?? session.conversation_id,
    });

    return NextResponse.json({ session: updated });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Update session error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
