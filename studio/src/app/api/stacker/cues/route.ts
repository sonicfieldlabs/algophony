import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listStackerCues, createStackerCue } from "@/lib/local/repositories/stacker";
import { logger } from "@/lib/logger";

const createCueSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().default(""),
  context: z.string().default("film_scene"),
  naming_convention: z.string().default("film_foley"),
  project_id: z.string().uuid().optional(),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const cues = await listStackerCues(profile.id);
    return NextResponse.json({ cues });
  } catch (error) {
    logger.error({ err: error }, "List stacker cues error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createCueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const cue = await createStackerCue(profile.id, parsed.data);
    return NextResponse.json({ cue }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create stacker cue error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
