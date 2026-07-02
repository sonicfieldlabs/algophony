import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listGenerations } from "@/lib/local/repositories/generations";

/** GET /api/generations — list user's generation history with cursor pagination */
export async function GET(request: NextRequest) {
  try {
    const profile = await requireProfile();

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const { rows, nextCursor } = await listGenerations(profile.id, { limit, cursor });

    return NextResponse.json({
      generations: rows,
      nextCursor,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    return NextResponse.json(
      { error: "Failed to list generations" },
      { status: 500 }
    );
  }
}
