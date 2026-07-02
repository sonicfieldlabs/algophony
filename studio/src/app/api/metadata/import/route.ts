import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse, getUserEntitlements } from "@/lib/auth/current-user";
import { hasEntitlement, type EntitlementKey } from "@/lib/sfx/entitlements";
import type { Plan } from "@/lib/sfx/entitlements";
import { buildFeatureGateResponse, FeatureGateError } from "@/lib/local/access";
import { createServerLocalClient } from "@/lib/local/db-client";
import { logger } from "@/lib/logger";

const MAX_ROWS = 500;
const FREE_PREVIEW_LIMIT = 25;

const importSchema = z.object({
  action: z.enum(["preview", "commit"]),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(MAX_ROWS),
  headers: z.array(z.string()).min(1).max(50),
  fileName: z.string().max(255).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    let profile;
    try {
      profile = await requireProfile();
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse(err.message);
      throw err;
    }

    // 2. Parse + validate body
    const body = await request.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 }
      );
    }
    const { action, rows, headers, fileName } = parsed.data;

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ROWS} rows allowed. Got ${rows.length}.` },
        { status: 400 }
      );
    }

    // 4. Preview action: available to all, capped for free users
    if (action === "preview") {
      const entitlements = await getUserEntitlements(profile.id);
      const state = { plan: profile.plan as Plan, entitlements: entitlements as EntitlementKey[] };
      const hasImport = hasEntitlement(state, "metadata_import");

      const previewRows = hasImport ? rows : rows.slice(0, FREE_PREVIEW_LIMIT);
      const truncated = !hasImport && rows.length > FREE_PREVIEW_LIMIT;

      return NextResponse.json({
        preview: previewRows,
        totalRows: rows.length,
        truncated,
        message: truncated
          ? `Showing ${FREE_PREVIEW_LIMIT} of ${rows.length} rows in preview. Commit to store the full local import.`
          : `Preview of ${previewRows.length} rows ready.`,
      });
    }

    // 5. Commit action: requires metadata_import entitlement
    if (action === "commit") {
      const entitlements = await getUserEntitlements(profile.id);
      const state = { plan: profile.plan as Plan, entitlements: entitlements as EntitlementKey[] };

      if (!hasEntitlement(state, "metadata_import")) {
        const gateErr = new FeatureGateError("metadata_import", "studio");
        return NextResponse.json(
          buildFeatureGateResponse(gateErr),
          { status: 402 }
        );
      }

      // 6. Create metadata import record and prompt cards
      const database = await createServerLocalClient();

      const mapping = Object.fromEntries(
        headers.map((header: string) => [header, header])
      );

      // Insert import record
      const { data: importRecord, error: importError } = await database
        .from("metadata_imports")
        .insert({
          user_id: profile.id,
          filename: fileName || "import.csv",
          mapping,
          row_count: rows.length,
          mapped_count: rows.length,
          status: "completed",
        })
        .select()
        .single();

      if (importError) {
        throw new Error(`Failed to record import: ${importError.message}`);
      }

      // Create prompt cards from rows
      const cardInserts = rows.map((row: Record<string, string>) => ({
        user_id: profile.id,
        title: row.description || row.name || row.filename || "Imported SFX",
        category: row.category || "Foley",
        subcategory: row.subcategory || null,
        source_object: row.source || row.sourceObject || null,
        action: row.action || null,
        material: row.material || null,
        surface: row.surface || null,
        environment: row.environment || null,
        perspective: row.perspective || null,
        loop: row.loop === "true" || row.loop === "1",
        prompt_influence: 0.3,
        model_id: "eleven_text_to_sound_v2",
        exclusions: ["no music", "no dialogue"],
        generated_prompt: row.description || row.name || "",
        critic_score: 0,
        is_seed: false,
      }));

      const { error: cardsError } = await database
        .from("prompt_cards")
        .insert(cardInserts);

      if (cardsError) {
        throw new Error(`Failed to create cards: ${cardsError.message}`);
      }

      return NextResponse.json({
        success: true,
        importId: importRecord.id,
        cardsCreated: rows.length,
        message: `Successfully imported ${rows.length} rows as prompt cards.`,
      });
    }

    return NextResponse.json(
      { error: "action must be 'preview' or 'commit'" },
      { status: 400 }
    );
  } catch (error) {
    logger.error({ err: error }, "Import error");
    return NextResponse.json(
      { error: "Import processing failed" },
      { status: 500 }
    );
  }
}
