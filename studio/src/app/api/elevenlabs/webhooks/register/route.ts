import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { registerWebhook, webhookInputSchema } from "@/lib/elevenlabs/webhooks";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    if (profile.plan !== "studio" && profile.plan !== "team") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = webhookInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const result = await registerWebhook(parsed.data);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.statusCode || 500 });
    }

    return NextResponse.json({
      webhookId: result.webhookId,
      isMock: result.isMock,
      status: "created",
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Webhook registration error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
