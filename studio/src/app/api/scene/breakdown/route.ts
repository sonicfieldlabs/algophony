import { NextRequest, NextResponse } from "next/server";
import { breakdownScene } from "@/lib/sfx/scene-breakdown";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";

export async function POST(request: NextRequest) {
  try {
    let _profile;
    try { _profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const scene = body?.scene;

    if (!scene || typeof scene !== "string" || scene.trim().length === 0) {
      return NextResponse.json(
        { error: "Scene text is required" },
        { status: 400 }
      );
    }

    if (scene.length > 5000) {
      return NextResponse.json(
        { error: "Scene text must be under 5,000 characters" },
        { status: 422 }
      );
    }

    const events = breakdownScene(scene);

    return NextResponse.json({ events });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process scene" },
      { status: 500 }
    );
  }
}
