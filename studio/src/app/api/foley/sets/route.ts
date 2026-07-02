import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listFoleySets, createFoleySet } from "@/lib/local/repositories/foley";
import { logger } from "@/lib/logger";

const createSetSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  description: z.string().default(""),
  surface: z.string().optional(),
  material: z.string().optional(),
  performance_style: z.string().optional(),
  mic_perspective: z.string().optional(),
  realism_level: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const sets = await listFoleySets(profile.id);
    return NextResponse.json({ sets });
  } catch (error) {
    logger.error({ err: error }, "List Foley sets error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const set = await createFoleySet(profile.id, parsed.data);
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create Foley set error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
