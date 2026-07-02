import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getModels, refreshModelsCache, validateWorkflowSupport, type WorkflowType } from "@/lib/elevenlabs/models";
import { logger } from "@/lib/logger";

const refreshSchema = z.object({
  action: z.literal("refresh"),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const workflow = request.nextUrl.searchParams.get("workflow") as WorkflowType | null;
    const models = await getModels();

    const result = models.map((model) => ({
      ...model,
      workflow: workflow ? validateWorkflowSupport(model, workflow) : undefined,
    }));

    const res = NextResponse.json({ models: result, userId: profile.id });
    res.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    return res;
  } catch (error) {
    logger.error({ err: error }, "Models route error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 422 });
    }

    const models = await refreshModelsCache();
    return NextResponse.json({
      models,
      refreshedAt: new Date().toISOString(),
      userId: profile.id,
    });
  } catch (error) {
    logger.error({ err: error }, "Models refresh error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
