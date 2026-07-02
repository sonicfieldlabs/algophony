import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listStackerLayers, createStackerLayer, updateStackerLayer, deleteStackerLayer } from "@/lib/local/repositories/stacker";
import { logger } from "@/lib/logger";

const createLayerSchema = z.object({
  stacker_cue_id: z.string().uuid(),
  layer_type: z.string().min(1),
  frequency_role: z.string().default("wide"),
  prompt_text: z.string().default(""),
  duration_seconds: z.number().min(0.5).max(30).default(2),
  loop: z.boolean().default(false),
  prompt_influence: z.number().min(0).max(1).default(0.3),
  priority: z.number().int().min(0).max(9).default(0),
  audio_url: z.string().optional(),
  generation_id: z.string().optional(),
  generated_sound_id: z.string().optional(),
  imported_from: z.string().optional(),
  imported_module: z.string().optional(),
  status: z.string().default("draft"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateLayerSchema = z.object({
  id: z.string().uuid(),
  layer_type: z.string().optional(),
  frequency_role: z.string().optional(),
  prompt_text: z.string().optional(),
  duration_seconds: z.number().min(0.5).max(30).optional(),
  loop: z.boolean().optional(),
  prompt_influence: z.number().min(0).max(1).optional(),
  priority: z.number().int().min(0).max(9).optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
  audio_url: z.string().optional(),
  generation_id: z.string().optional(),
  generated_sound_id: z.string().optional(),
  imported_from: z.string().optional(),
  imported_module: z.string().optional(),
  status: z.string().optional(),
  error_message: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const cueId = searchParams.get("cue_id") ?? undefined;
    const layers = await listStackerLayers(profile.id, cueId);
    return NextResponse.json({ layers });
  } catch (error) {
    logger.error({ err: error }, "List stacker layers error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createLayerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const layer = await createStackerLayer(profile.id, parsed.data);
    return NextResponse.json({ layer }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create stacker layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = updateLayerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const { id, ...updates } = parsed.data;
    const layer = await updateStackerLayer(id, profile.id, updates);
    return NextResponse.json({ layer });
  } catch (error) {
    logger.error({ err: error }, "Update stacker layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const layerId = searchParams.get("id");
    if (!layerId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteStackerLayer(layerId, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete stacker layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
