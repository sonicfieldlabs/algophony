import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listFoleyItems, createFoleyItem, updateFoleyItem } from "@/lib/local/repositories/foley";
import { logger } from "@/lib/logger";

const createItemSchema = z.object({
  foley_set_id: z.string().uuid().optional(),
  category: z.string().min(1),
  action: z.string().optional(),
  performer_weight: z.string().optional(),
  gesture_speed: z.string().optional(),
  contact_force: z.string().optional(),
  surface: z.string().optional(),
  shoe_type: z.string().optional(),
  cloth_type: z.string().optional(),
  object_material: z.string().optional(),
  object_size: z.string().optional(),
  mic_perspective: z.string().optional(),
  room_size: z.string().optional(),
  realism: z.string().optional(),
  sync_looseness: z.string().optional(),
  take_number: z.number().int().min(1).default(1),
  side: z.string().optional(),
  variation_role: z.string().optional(),
  prompt_text: z.string().default(""),
  audio_url: z.string().optional(),
  generation_id: z.string().optional(),
  status: z.string().default("draft"),
});

const updateItemSchema = z.object({
  id: z.string().uuid(),
  status: z.string().optional(),
  audio_url: z.string().optional(),
  generation_id: z.string().optional(),
  error_message: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("set_id") ?? undefined;
    const items = await listFoleyItems(profile.id, setId);
    return NextResponse.json({ items });
  } catch (error) {
    logger.error({ err: error }, "List Foley items error");
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

    const item = await createFoleyItem(profile.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create Foley item error");
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
    const item = await updateFoleyItem(id, profile.id, updates);
    return NextResponse.json({ item });
  } catch (error) {
    logger.error({ err: error }, "Update Foley item error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
