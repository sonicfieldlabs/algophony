import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listSoundSets, createSoundSet } from "@/lib/local/repositories/ui-elements";
import { logger } from "@/lib/logger";

const createSetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  project_id: z.string().uuid().optional(),
  brand_description: z.string().optional(),
  interface_type: z.string().optional(),
  visual_style: z.string().optional(),
  sonic_style: z.string().optional(),
  default_exclusions: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const sets = await listSoundSets(profile.id);
    const res = NextResponse.json({ sets });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return res;
  } catch (error) {
    logger.error({ err: error }, "List sound sets error");
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
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const set = await createSoundSet(profile.id, parsed.data);
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create sound set error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
