import { NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getModels, refreshModelsCache } from "@/lib/elevenlabs/models";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    let profile;
    try {
      profile = await requireProfile();
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse(err.message);
      throw err;
    }

    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    const models = forceRefresh
      ? await refreshModelsCache()
      : await getModels();

    return NextResponse.json({
      models,
      userId: profile.id,
      cached: !forceRefresh,
    });
  } catch (error) {
    logger.error({ err: error }, "Models route error");
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
