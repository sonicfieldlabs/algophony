import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listSoundItems, createSoundItem, updateSoundItem, deleteSoundItem } from "@/lib/local/repositories/ui-elements";
import { logger } from "@/lib/logger";

const createItemSchema = z.object({
  sound_set_id: z.string().uuid().optional(),
  element_type: z.string().min(1),
  action_type: z.string().min(1),
  state: z.string().optional(),
  importance_level: z.string().optional(),
  frequency_of_use: z.string().optional(),
  engine_mode: z.string().default("sound_effects"),
  duration_target: z.number().optional(),
  sonic_role: z.string().optional(),
  prompt_text: z.string().optional(),
  audio_url: z.string().optional(),
  generated_sound_id: z.string().uuid().optional(),
  fader_state: z.record(z.string(), z.number()).default({}),
  ui_metadata: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["draft", "generated", "favorite", "rejected"]).default("draft"),
});

const updateItemSchema = z.object({
  status: z.enum(["draft", "generated", "favorite", "rejected"]).optional(),
  audio_url: z.string().optional(),
  generated_sound_id: z.string().uuid().optional(),
  prompt_text: z.string().optional(),
  fader_state: z.record(z.string(), z.number()).optional(),
  ui_metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const soundSetId = searchParams.get("sound_set_id") ?? undefined;

    const items = await listSoundItems(profile.id, soundSetId);
    const res = NextResponse.json({ items });
    res.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=20");
    return res;
  } catch (error) {
    logger.error({ err: error }, "List sound items error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const item = await createSoundItem(profile.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create sound item error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

    const parsed = updateItemSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const item = await updateSoundItem(id, profile.id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    logger.error({ err: error }, "Update sound item error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

    await deleteSoundItem(id, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete sound item error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
