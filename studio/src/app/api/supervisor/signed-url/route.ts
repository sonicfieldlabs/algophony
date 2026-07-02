import { NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import {
  FeatureGateError,
  buildFeatureGateResponse,
  requireFeature,
} from "@/lib/local/access";
import { getAgentSignedUrl } from "@/lib/elevenlabs/agents";
import { logger } from "@/lib/logger";

/** GET /api/supervisor/signed-url — get a signed URL for the supervisor agent */
export async function GET() {
  try {
    const profile = await requireProfile();
    try {
      await requireFeature(profile.id, "supervisor_chat");
    } catch (err) {
      if (err instanceof FeatureGateError) {
        return NextResponse.json(buildFeatureGateResponse(err), { status: err.status });
      }
      throw err;
    }

    const result = await getAgentSignedUrl();
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({ signedUrl: result.signedUrl });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    logger.error({ err: err }, "Signed URL error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
