import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listAtmosphereProjects, createAtmosphereProject } from "@/lib/local/repositories/atmosphere";
import { logger } from "@/lib/logger";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  project_id: z.string().uuid().optional(),
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
  avoided_sounds: z.array(z.string()).default([]),
  dramatic_values: z.record(z.string(), z.number()).default({}),
  default_duration: z.number().optional(),
  loop: z.boolean().optional(),
  prompt_influence: z.number().optional(),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const projects = await listAtmosphereProjects(profile.id);
    const res = NextResponse.json({ projects });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return res;
  } catch (error) {
    logger.error({ err: error }, "List atmosphere projects error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const project = await createAtmosphereProject(profile.id, parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create atmosphere project error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
