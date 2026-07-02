import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createSession, listRecentSessions } from "@/lib/supervisor/session-manager";
import { logger } from "@/lib/logger";

const createSessionSchema = z.object({
  project_id: z.string().uuid().nullable().default(null),
  mode: z.enum(["supervisor", "quick"]).default("supervisor"),
  page_context: z.string().nullable().default(null),
});

/** POST /api/supervisor/session — create a new supervisor session */
export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile();
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 422 }
      );
    }

    const session = await createSession(
      profile.id,
      parsed.data.project_id,
      parsed.data.mode,
      parsed.data.page_context
    );

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Create session error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/supervisor/session — list user's recent sessions */
export async function GET() {
  try {
    const profile = await requireProfile();
    const sessions = await listRecentSessions(profile.id, 20);
    return NextResponse.json({ sessions });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "List sessions error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
