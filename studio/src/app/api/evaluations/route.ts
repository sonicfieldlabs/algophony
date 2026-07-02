import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createServerLocalClient } from "@/lib/local/db-client";
import { EVALUATION_TAGS, tagToExclusionGuidance, isPositiveTag, type EvaluationTag } from "@/lib/sfx/evaluations";
import { updateGenerationVerdict } from "@/lib/local/repositories/generations";
import { logger } from "@/lib/logger";

const evaluationSchema = z.object({
  generatedSoundId: z.string().uuid(),
  promptCardId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  is_favorite: z.boolean().default(false),
  is_usable: z.boolean().default(false),
  is_rejected: z.boolean().default(false),
  is_needs_retry: z.boolean().default(false),
  rejection_reason: z.string().optional(),
  qualities: z.array(z.string()).default([]),
  problems: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = evaluationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 422 });
    }

    const input = parsed.data;
    const database = await createServerLocalClient();

    // Insert evaluation
    const { data: evaluation, error } = await database.from("prompt_result_evaluations").insert({
      user_id: profile.id,
      generated_sound_id: input.generatedSoundId,
      prompt_card_id: input.promptCardId ?? null,
      rating: input.rating ?? null,
      is_favorite: input.is_favorite,
      is_usable: input.is_usable,
      is_rejected: input.is_rejected,
      rejection_reason: input.rejection_reason ?? null,
      qualities: input.qualities,
      problems: input.problems,
      notes: input.notes ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update generation verdict
    let verdict: "favorite" | "usable" | "needs_retry" | "rejected" | undefined;
    if (input.is_favorite) verdict = "favorite";
    else if (input.is_usable) verdict = "usable";
    else if (input.is_needs_retry) verdict = "needs_retry";
    else if (input.is_rejected) verdict = "rejected";

    if (verdict) {
      await updateGenerationVerdict(input.generatedSoundId, profile.id, verdict, input.rejection_reason);
    }

    // If prompt card exists, update its status
    if (input.promptCardId) {
      const cardUpdate: Record<string, unknown> = {};
      if (input.is_favorite) cardUpdate.status = "favorite";
      else if (input.is_usable) cardUpdate.status = "usable";
      else if (input.is_rejected) cardUpdate.status = "bad_result";
      if (input.rating) cardUpdate.rating = input.rating;

      // Check for positive tags → mark as reusable
      const hasPositive = input.qualities.some((q) => isPositiveTag(q));
      if (hasPositive && !input.is_rejected) {
        cardUpdate.status = "usable";
      }

      if (Object.keys(cardUpdate).length > 0) {
        await database.from("prompt_cards").update(cardUpdate).eq("id", input.promptCardId).eq("user_id", profile.id);
      }
    }

    // Compute future guidance from negative tags
    const allTags = [...input.problems] as EvaluationTag[];
    const futureGuidance: string[] = [];
    for (const tag of allTags) {
      if (EVALUATION_TAGS.includes(tag as typeof EVALUATION_TAGS[number])) {
        futureGuidance.push(...tagToExclusionGuidance(tag));
      }
    }

    return NextResponse.json({
      evaluation,
      futureGuidance: [...new Set(futureGuidance)],
      verdict,
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "Evaluation error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
