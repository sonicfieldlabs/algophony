import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getSoundSet, updateSoundSet, deleteSoundSet } from "@/lib/local/repositories/ui-elements";
import { logger } from "@/lib/logger";

const updateSetSchema = z.object({
  name: z.string().min(1).optional(),
  brand_description: z.string().optional(),
  interface_type: z.string().optional(),
  visual_style: z.string().optional(),
  sonic_style: z.string().optional(),
  default_exclusions: z.array(z.string()).optional(),
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
    const set = await getSoundSet(id, profile.id);
    if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ set });
  } catch (error) {
    logger.error({ err: error }, "Get sound set error");
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
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 }
      );
    }

    const set = await updateSoundSet(id, profile.id, parsed.data);
    return NextResponse.json({ set });
  } catch (error) {
    logger.error({ err: error }, "Update sound set error");
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
    await deleteSoundSet(id, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete sound set error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
