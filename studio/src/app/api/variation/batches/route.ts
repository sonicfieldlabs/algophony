import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listVariationBatches, createVariationBatch } from "@/lib/local/repositories/variation";
import { logger } from "@/lib/logger";

const createBatchSchema = z.object({
  name: z.string().min(1).max(200),
  source_type: z.string().min(1),
  strategy: z.string().min(1),
  batch_mode: z.string().min(1),
  preservation_settings: z.record(z.string(), z.unknown()).default({}),
  variation_axes: z.array(z.string()).default([]),
  batch_size: z.number().int().min(1).max(200).default(4),
  generations_per_source: z.number().int().min(1).max(32).default(1),
  estimated_cost: z.number().default(0),
  project_id: z.string().uuid().optional(),
});

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const batches = await listVariationBatches(profile.id);
    return NextResponse.json({ batches });
  } catch (error) {
    logger.error({ err: error }, "List variation batches error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const batch = await createVariationBatch(profile.id, parsed.data);
    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create variation batch error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
