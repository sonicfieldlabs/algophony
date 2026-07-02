import { NextRequest, NextResponse } from "next/server";
import { criticize } from "@/lib/sfx/critic";
import { sfxPromptSchema } from "@/lib/sfx/prompt-schema";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";

export async function POST(request: NextRequest) {
  try {
    let _profile;
    try { _profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const attributes = body?.attributes;

    if (!attributes) {
      return NextResponse.json(
        { error: "Attributes object is required" },
        { status: 400 }
      );
    }

    const parsed = sfxPromptSchema.safeParse(attributes);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid attributes",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 400 }
      );
    }

    const report = criticize(parsed.data);

    return NextResponse.json(report);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to run critic" },
      { status: 500 }
    );
  }
}
