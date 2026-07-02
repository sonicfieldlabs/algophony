import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import {
  FeatureGateError,
  buildFeatureGateResponse,
  requireFeature,
} from "@/lib/local/access";
import { createSession, getSession } from "@/lib/supervisor/session-manager";
import { isValidToolName } from "@/lib/supervisor/types";
import { executeTool } from "@/lib/supervisor/tool-handlers";
import { getRequiredEntitlementForTool } from "@/lib/supervisor/tool-access";
import { logger } from "@/lib/logger";

interface Params { params: Promise<{ tool: string }> }

// Tool payloads vary widely (each tool has its own arg shape), but every call
// must carry at minimum a session_id/sessionId and an optional project_id.
// The deeper executeTool() validates the rest per-tool.
const toolBodySchema = z.object({
  session_id: z.string().max(200).optional(),
  sessionId: z.string().max(200).optional(),
  project_id: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  page_context: z.string().max(300).nullable().optional(),
  pageContext: z.string().max(300).nullable().optional(),
}).passthrough();

const uuidSchema = z.string().uuid();

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function getOrCreateOwnedSession(
  userId: string,
  requestedSessionId: string | null,
  projectId: string | null,
  pageContext: string | null
): Promise<string> {
  if (requestedSessionId) {
    const session = await getSession(requestedSessionId);
    if (session?.user_id === userId) return session.id;
  }

  const session = await createSession(userId, projectId, "supervisor", pageContext);
  return session.id;
}

/**
 * POST /api/supervisor/tools/[tool] — Execute a supervisor server tool.
 *
 * This is called by the ElevenLabs agent via server tool configuration,
 * or directly by the Algophony Studio frontend for manual tool execution.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const profile = await requireProfile();
    const { tool } = await params;

    if (!isValidToolName(tool)) {
      return NextResponse.json(
        { error: `Unknown tool: ${tool}` },
        { status: 400 }
      );
    }

    const rawBody = await request.json();
    const parsed = toolBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 }
      );
    }
    const body = parsed.data;
    const projectId = body.project_id ?? body.projectId ?? null;
    const pageContext = body.page_context ?? body.pageContext ?? `/api/supervisor/tools/${tool}`;

    try {
      await requireFeature(profile.id, getRequiredEntitlementForTool(tool));
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json(buildFeatureGateResponse(err), { status: err.status });
      }
      throw err;
    }

    const requestedSessionId = normalizeUuid(body.session_id) ?? normalizeUuid(body.sessionId);
    const sessionId = await getOrCreateOwnedSession(
      profile.id,
      requestedSessionId,
      projectId,
      pageContext
    );

    const result = await executeTool(tool, body, {
      userId: profile.id,
      sessionId,
      projectId,
      userPlan: profile.plan,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Tool execution error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
