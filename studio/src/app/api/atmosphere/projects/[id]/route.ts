import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
  getAtmosphereProject,
  updateAtmosphereProject,
  deleteAtmosphereProject,
} from "@/lib/local/repositories/atmosphere";

const updateProjectSchema = z.object({
  name: z.string().optional(),
  scene_description: z.string().optional(),
  location: z.string().optional(),
  time_of_day: z.string().optional(),
  weather: z.string().optional(),
  emotional_tone: z.string().optional(),
  narrative_function: z.string().optional(),
  realism_level: z.string().optional(),
  density: z.string().optional(),
  human_presence: z.string().optional(),
  animal_presence: z.string().optional(),
  machine_presence: z.string().optional(),
  synthetic_presence: z.string().optional(),
  avoided_sounds: z.array(z.string()).optional(),
  dramatic_values: z.record(z.string(), z.number()).optional(),
  default_duration: z.number().optional(),
  loop: z.boolean().optional(),
  prompt_influence: z.number().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { id } = await params;
    const project = await getAtmosphereProject(id, profile.id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    logger.error({ err: error }, "Get atmosphere project error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const project = await updateAtmosphereProject(id, profile.id, parsed.data);
    return NextResponse.json({ project });
  } catch (error) {
    logger.error({ err: error }, "Update atmosphere project error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { id } = await params;
    await deleteAtmosphereProject(id, profile.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "Delete atmosphere project error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
