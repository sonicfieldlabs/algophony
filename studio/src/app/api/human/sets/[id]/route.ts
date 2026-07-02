import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getHumanSet, updateHumanSet, deleteHumanSet } from "@/lib/local/repositories/human";
import { logger } from "@/lib/logger";

const updateSetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  engine_mode: z.string().optional(),
  body_profile: z.record(z.string(), z.unknown()).optional(),
  emotion: z.string().optional(),
  realism: z.string().optional(),
  crowd_config: z.record(z.string(), z.unknown()).optional(),
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
    const set = await getHumanSet(id, profile.id);
    if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ set });
  } catch (error) {
    logger.error({ err: error }, "Get Human set error");
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

    const set = await updateHumanSet(id, profile.id, parsed.data);
    return NextResponse.json({ set });
  } catch (error) {
    logger.error({ err: error }, "Update Human set error");
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
    await deleteHumanSet(id, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete Human set error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
