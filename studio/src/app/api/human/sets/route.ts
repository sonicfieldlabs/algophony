import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listHumanSets, createHumanSet } from "@/lib/local/repositories/human";
import { logger } from "@/lib/logger";

const createSetSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  description: z.string().default(""),
  engine_mode: z.string().default("sfx"),
  body_profile: z.record(z.string(), z.unknown()).optional(),
  emotion: z.string().optional(),
  realism: z.string().optional(),
  crowd_config: z.record(z.string(), z.unknown()).optional(),
  project_id: z.string().uuid().optional(),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const sets = await listHumanSets(profile.id);
    return NextResponse.json({ sets });
  } catch (error) {
    logger.error({ err: error }, "List Human sets error");
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

    const set = await createHumanSet(profile.id, parsed.data);
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create Human set error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
