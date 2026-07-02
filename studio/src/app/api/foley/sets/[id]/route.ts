import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getFoleySet, updateFoleySet, deleteFoleySet } from "@/lib/local/repositories/foley";
import { logger } from "@/lib/logger";

const updateSetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  surface: z.string().optional(),
  material: z.string().optional(),
  performance_style: z.string().optional(),
  mic_perspective: z.string().optional(),
  realism_level: z.string().optional(),
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
    const set = await getFoleySet(id, profile.id);
    if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ set });
  } catch (error) {
    logger.error({ err: error }, "Get Foley set error");
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
    const parsed = updateSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const set = await updateFoleySet(id, profile.id, parsed.data);
    return NextResponse.json({ set });
  } catch (error) {
    logger.error({ err: error }, "Update Foley set error");
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
    await deleteFoleySet(id, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete Foley set error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
