import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
  listAtmosphereLayers,
  createAtmosphereLayer,
  updateAtmosphereLayer,
  deleteAtmosphereLayer,
} from "@/lib/local/repositories/atmosphere";

const createLayerSchema = z.object({
  atmosphere_project_id: z.string().uuid(),
  layer_type: z.enum(["base_bed", "ecology", "texture", "spatial", "dramatic", "synthetic", "micro_event"]),
  layer_role: z.string().optional(),
  prompt_text: z.string().optional(),
  intensity: z.number().optional(),
  density: z.number().optional(),
  distance: z.number().optional(),
  movement: z.number().optional(),
  frequency_role: z.enum(["low", "mid", "high", "full"]).optional(),
  loopable: z.boolean().optional(),
  duration_seconds: z.number().optional(),
  prompt_influence: z.number().optional(),
  priority: z.number().optional(),
  audio_url: z.string().optional(),
  generated_sound_id: z.string().uuid().optional(),
  status: z.string().optional(),
});

const updateLayerSchema = z.object({
  id: z.string().uuid(),
  layer_role: z.string().optional(),
  prompt_text: z.string().optional(),
  intensity: z.number().optional(),
  density: z.number().optional(),
  distance: z.number().optional(),
  movement: z.number().optional(),
  frequency_role: z.enum(["low", "mid", "high", "full"]).optional(),
  loopable: z.boolean().optional(),
  duration_seconds: z.number().optional(),
  prompt_influence: z.number().optional(),
  priority: z.number().optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
  audio_url: z.string().nullable().optional(),
  generated_sound_id: z.string().uuid().nullable().optional(),
  status: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const projectId = request.nextUrl.searchParams.get("atmosphere_project_id") ?? undefined;
    const layers = await listAtmosphereLayers(profile.id, projectId);
    return NextResponse.json({ layers });
  } catch (error) {
    logger.error({ err: error }, "List atmosphere layers error");
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
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const layer = await createAtmosphereLayer(profile.id, parsed.data);
    return NextResponse.json({ layer }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create atmosphere layer error");
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
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const { id, ...updates } = parsed.data;
    const layer = await updateAtmosphereLayer(id, profile.id, updates);
    return NextResponse.json({ layer });
  } catch (error) {
    logger.error({ err: error }, "Update atmosphere layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Layer ID required" }, { status: 400 });
    }

    await deleteAtmosphereLayer(id, profile.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "Delete atmosphere layer error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
