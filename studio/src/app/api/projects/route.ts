import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createServerLocalClient } from "@/lib/local/db-client";
import { logger } from "@/lib/logger";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  medium: z.string().optional(),
  description: z.string().optional(),
  sonic_brief: z.record(z.string(), z.unknown()).default({}),
  default_settings: z.record(z.string(), z.unknown()).default({}),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const database = await createServerLocalClient();
    const { data, error } = await database
      .from("projects").select("*").eq("user_id", profile.id)
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const res = NextResponse.json({ projects: data ?? [] });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
    logger.error({ err: error }, "List projects error");
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
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const database = await createServerLocalClient();
    const { data, error } = await database
      .from("projects").insert({ user_id: profile.id, ...parsed.data }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create project error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
