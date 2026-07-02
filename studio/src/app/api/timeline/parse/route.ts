import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { parseTimeline } from "@/lib/timeline/parsers";
import { detectScenes, enrichScenesWithAmbience } from "@/lib/timeline/scene-detector";
import { convertAllCuesToPrompts, applyCuePrompts } from "@/lib/timeline/cue-to-prompt";
import { createTimelineImport, TIMELINE_FORMATS } from "@/lib/timeline/types";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(512_000),
  format: z.enum(TIMELINE_FORMATS).optional(),
  frameRate: z.number().int().positive().max(240).optional(),
  filename: z.string().max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 }
      );
    }
    const { text, format, frameRate, filename } = parsed.data;

    const rate = frameRate ?? 24;

    // 1. Parse
    const { format: detectedFormat, cues: parsedCues } = parseTimeline(text, format, rate);

    if (parsedCues.length === 0) {
      return NextResponse.json({
        error: "No cues could be parsed from the input",
        detectedFormat,
      }, { status: 422 });
    }

    // 2. Detect scenes
    let scenes = detectScenes(parsedCues);
    scenes = enrichScenesWithAmbience(scenes, parsedCues);

    // 3. Generate prompts for each cue
    const promptResults = convertAllCuesToPrompts(parsedCues, scenes);
    const cuesWithPrompts = applyCuePrompts(parsedCues, promptResults);

    // Collect implicit cues from all prompt results
    const implicitCues = Array.from(promptResults.values())
      .flatMap((r) => r.implicitCues);

    // 4. Build the import object
    const timeline = createTimelineImport(
      detectedFormat,
      filename ?? "untitled",
      cuesWithPrompts,
      scenes,
      { frameRate: rate, userId: profile.id }
    );

    // Estimate cost (1 credit per cue)
    const estimatedCredits = cuesWithPrompts.length + implicitCues.length;

    return NextResponse.json({
      timeline,
      implicitCues,
      stats: {
        format: detectedFormat,
        totalCues: cuesWithPrompts.length,
        sceneCount: scenes.length,
        implicitCueCount: implicitCues.length,
        estimatedCredits,
        creditsRemaining: profile.credits_remaining,
        canAfford: profile.credits_remaining >= estimatedCredits,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Timeline parse error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
