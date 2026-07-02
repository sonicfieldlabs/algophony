import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listSoundFamilies, createSoundFamily } from "@/lib/local/repositories/variation";
import { logger } from "@/lib/logger";

const createFamilySchema = z.object({
  name: z.string().min(1).max(200),
  variation_batch_id: z.string().uuid().optional(),
  variation_strategy: z.string().optional(),
  preservation_settings: z.record(z.string(), z.unknown()).default({}),
  variation_axes: z.array(z.string()).default([]),
  project_id: z.string().uuid().optional(),
  source_prompt_card_id: z.string().uuid().optional(),
  source_generated_sound_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id") ?? undefined;
    const families = await listSoundFamilies(profile.id, batchId);
    return NextResponse.json({ families });
  } catch (error) {
    logger.error({ err: error }, "List sound families error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createFamilySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const family = await createSoundFamily(profile.id, parsed.data);
    return NextResponse.json({ family }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create sound family error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
