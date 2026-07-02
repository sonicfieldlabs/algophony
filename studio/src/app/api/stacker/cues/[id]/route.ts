import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getStackerCue, updateStackerCue, deleteStackerCue } from "@/lib/local/repositories/stacker";
import { logger } from "@/lib/logger";

const updateCueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  context: z.string().optional(),
  naming_convention: z.string().optional(),
  status: z.string().optional(),
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
    const cue = await getStackerCue(id, profile.id);
    if (!cue) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ cue });
  } catch (error) {
    logger.error({ err: error }, "Get stacker cue error");
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
    const parsed = updateCueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const cue = await updateStackerCue(id, profile.id, parsed.data);
    return NextResponse.json({ cue });
  } catch (error) {
    logger.error({ err: error }, "Update stacker cue error");
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
    await deleteStackerCue(id, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete stacker cue error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
