import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createServerLocalClient } from "@/lib/local/db-client";
import { logger } from "@/lib/logger";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  medium: z.string().optional(),
  description: z.string().optional(),
  sonic_brief: z.record(z.string(), z.unknown()).optional(),
  default_settings: z.record(z.string(), z.unknown()).optional(),
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
    const database = await createServerLocalClient();
    const { data, error } = await database
      .from("projects").select("*").eq("id", id).eq("user_id", profile.id).single();

    if (error || !data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ project: data });
  } catch (error) {
    logger.error({ err: error }, "Get project error");
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
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const database = await createServerLocalClient();
    const { data, error } = await database
      .from("projects").update(parsed.data).eq("id", id).eq("user_id", profile.id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  } catch (error) {
    logger.error({ err: error }, "Update project error");
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
    const database = await createServerLocalClient();
    const { error } = await database
      .from("projects").delete().eq("id", id).eq("user_id", profile.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error({ err: error }, "Delete project error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
