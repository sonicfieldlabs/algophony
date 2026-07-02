import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listVariationJobs, createVariationJob, updateVariationJob } from "@/lib/local/repositories/variation";
import { logger } from "@/lib/logger";

const createJobSchema = z.object({
  variation_batch_id: z.string().uuid(),
  job_index: z.number().int().min(0),
  strategy: z.string().optional(),
  generated_prompt: z.string().optional(),
  estimated_cost: z.number().default(0),
  sound_family_id: z.string().uuid().optional(),
  source_prompt_card_id: z.string().uuid().optional(),
  source_generated_sound_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
});

const updateJobSchema = z.object({
  id: z.string().uuid(),
  status: z.string().optional(),
  error_message: z.string().optional(),
  actual_cost: z.number().optional(),
  generated_prompt: z.string().optional(),
  output_prompt_card_id: z.string().uuid().optional(),
  output_generated_sound_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id") ?? undefined;
    const jobs = await listVariationJobs(profile.id, batchId);
    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error({ err: error }, "List variation jobs error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const job = await createVariationJob(profile.id, parsed.data);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Create variation job error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const { id, ...updates } = parsed.data;
    const job = await updateVariationJob(id, profile.id, updates);
    return NextResponse.json({ job });
  } catch (error) {
    logger.error({ err: error }, "Update variation job error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
