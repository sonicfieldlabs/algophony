import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createServiceLocalClient } from "@/lib/local/db-client";
import { assertOwnedProject, assertOwner, NotFoundError } from "@/lib/auth/owner-guard";
import { SFX_CATEGORIES, getCategoryDefinition } from "@/lib/sfx/taxonomy";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  referenceUploadId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * Rules-based Listen Mode analyzer.
 * Combines STT output, event tags, filename, notes, project context,
 * and taxonomy to produce structured analysis. No external agent required.
 */
export async function POST(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 });
    }

    const { referenceUploadId, projectId, notes } = parsed.data;
    const service = createServiceLocalClient();
    await assertOwnedProject(projectId, profile.id);

    // Load reference upload + verify ownership (§1.3 IDOR fix)
    const { data: ref } = await service.from("reference_uploads").select("*").eq("id", referenceUploadId).single();
    assertOwner(ref, profile.id, "Reference upload");

    // Load existing analysis
    const { data: analyses } = await service.from("listen_analyses")
      .select("*").eq("reference_upload_id", referenceUploadId).order("created_at", { ascending: false }).limit(1);

    const analysis = analyses?.[0];
    const transcript = analysis?.transcript ?? "";
    const detectedEvents: Array<{ tag: string }> = analysis?.detected_events ?? [];
    const filename = ref.filename ?? "";

    // Load project context
    let _projectContext: Record<string, unknown> = {};
    if (projectId) {
      const { data: proj } = await service.from("projects").select("*").eq("id", projectId).eq("user_id", profile.id).single();
      if (proj) _projectContext = proj.sonic_brief ?? {};
    }

    // Rules-based interpretation
    const allSignals = [
      ...detectedEvents.map((e) => e.tag),
      ...filename.replace(/[._-]/g, " ").split(/\s+/),
      ...transcript.toLowerCase().split(/\s+/),
      ...(notes ?? "").toLowerCase().split(/\s+/),
    ].map((s) => s.toLowerCase().trim()).filter(Boolean);

    // Match signals against taxonomy
    const matchedCategories: string[] = [];
    const suggestedExclusions: string[] = ["no music", "no dialogue"];
    const promptCards: Array<Record<string, unknown>> = [];

    for (const cat of SFX_CATEGORIES) {
      const catLower = cat.category.toLowerCase();
      const subLower = cat.subcategories.map((s) => s.toLowerCase());

      const catMatch = allSignals.some((s) => s.includes(catLower));
      const subMatch = subLower.filter((sub) => allSignals.some((s) => s.includes(sub)));

      if (catMatch || subMatch.length > 0) {
        matchedCategories.push(cat.category);
        suggestedExclusions.push(...cat.defaultExclusions);

        // Create suggested prompt card per matched subcategory
        for (const sub of subMatch.slice(0, 3)) {
          promptCards.push({
            title: `${cat.category} — ${sub}`,
            category: cat.category,
            subcategory: sub,
            environment: cat.environments?.[0] ?? null,
            exclusions: cat.defaultExclusions,
            api_route: "sound_effects",
          });
        }

        // If no sub matched but category did, suggest a generic card
        if (subMatch.length === 0) {
          promptCards.push({
            title: `${cat.category} — reference match`,
            category: cat.category,
            subcategory: cat.subcategories[0],
            exclusions: cat.defaultExclusions,
            api_route: "sound_effects",
          });
        }
      }
    }

    // Deduplicate exclusions
    const uniqueExclusions = [...new Set(suggestedExclusions)];

    // Quality questions
    const qualityQuestions: string[] = [];
    if (matchedCategories.length === 0) {
      qualityQuestions.push("No clear category match found. Please add descriptive notes or tags.");
    }
    if (!transcript && detectedEvents.length === 0) {
      qualityQuestions.push("No transcript or audio events detected. Consider re-uploading a clearer reference.");
    }

    // Determine recommended route
    const creatureCategories = ["Creature", "Animal"];
    const isCreature = matchedCategories.some((c) => creatureCategories.includes(c));

    const result = {
      summary: `Analyzed reference "${filename}". Found ${matchedCategories.length} matching categories and ${detectedEvents.length} audio events.`,
      detected_sound_events: detectedEvents,
      suggested_categories: matchedCategories,
      prompt_cards: promptCards.slice(0, 10),
      exclusion_constraints: uniqueExclusions,
      related_prompt_families: matchedCategories.map((c) => getCategoryDefinition(c)?.subcategories ?? []).flat().slice(0, 15),
      quality_questions: qualityQuestions,
      recommended_api_route: isCreature ? "creature_sfx" : "sound_effects",
    };

    // Save analysis
    await service.from("listen_analyses").upsert({
      id: analysis?.id ?? undefined,
      user_id: profile.id,
      project_id: projectId ?? null,
      reference_upload_id: referenceUploadId,
      transcript,
      detected_events: detectedEvents,
      suggested_categories: matchedCategories,
      suggested_exclusions: uniqueExclusions,
      suggested_prompt_cards: promptCards.slice(0, 10),
      interpreter_mode: "rules",
    }, { onConflict: "id" });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err: error }, "Listen-mode analyze error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
