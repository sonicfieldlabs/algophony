import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getVariationBatch, updateVariationBatch, deleteVariationBatch } from "@/lib/local/repositories/variation";
import { logger } from "@/lib/logger";

const updateBatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  actual_cost: z.number().optional(),
  preservation_settings: z.record(z.string(), z.unknown()).optional(),
  variation_axes: z.array(z.string()).optional(),
  batch_size: z.number().int().min(1).max(200).optional(),
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
    const batch = await getVariationBatch(id, profile.id);
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ batch });
  } catch (error) {
    logger.error({ err: error }, "Get variation batch error");
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
    const parsed = updateBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const batch = await updateVariationBatch(id, profile.id, parsed.data);
    return NextResponse.json({ batch });
  } catch (error) {
    logger.error({ err: error }, "Update variation batch error");
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
    await deleteVariationBatch(id, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Delete variation batch error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
