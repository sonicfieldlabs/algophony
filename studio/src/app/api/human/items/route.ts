import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listHumanItems, createHumanItem, updateHumanItem } from "@/lib/local/repositories/human";
import { logger } from "@/lib/logger";

const createItemSchema = z.object({
  human_set_id: z.string().uuid().optional(),
  category: z.string().min(1),
  engine_mode: z.string().default("sfx"),
  action: z.string().optional(),
  emotion: z.string().optional(),
  intensity: z.string().optional(),
  body_profile: z.record(z.string(), z.unknown()).optional(),
  distance: z.string().optional(),
  crowd_size: z.string().optional(),
  intelligibility: z.string().optional(),
  language: z.string().optional(),
  chant_phrase: z.string().optional(),
  take_number: z.number().int().min(1).default(1),
  variation_role: z.string().optional(),
  prompt_text: z.string().default(""),
  audio_url: z.string().optional(),
  generation_id: z.string().optional(),
  status: z.string().default("draft"),
  daw_notes: z.string().optional(),
});

const updateItemSchema = z.object({
  id: z.string().uuid(),
  status: z.string().optional(),
  audio_url: z.string().optional(),
  generation_id: z.string().optional(),
  error_message: z.string().optional(),
  daw_notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("set_id") ?? undefined;
    const items = await listHumanItems(profile.id, setId);
    return NextResponse.json({ items });
  } catch (error) {
    logger.error({ err: error }, "List Human items error");
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
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const item = await createHumanItem(profile.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create Human item error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const { id, ...updates } = parsed.data;
    const item = await updateHumanItem(id, profile.id, updates);
    return NextResponse.json({ item });
  } catch (error) {
    logger.error({ err: error }, "Update Human item error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
