import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listPromptCards } from "@/lib/local/repositories/prompt-cards";
import {
  buildCsvFromRows, buildPromptDatabaseExport,
  PROMPT_DB_COLUMNS, applyExportFilters,
} from "@/lib/sfx/export-builders";
import { defaultExportFilter, type ExportFilter } from "@/lib/sfx/export-taxonomy";
import { logger } from "@/lib/logger";

/**
 * GET /api/export/prompt-database?format=csv|json
 */
export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "csv";

    const cards = await listPromptCards(profile.id);
    const exported = buildPromptDatabaseExport(cards as unknown as Record<string, unknown>[]);

    // Apply any filters passed as JSON query param
    let filtered = exported;
    const filterParam = url.searchParams.get("filters");
    if (filterParam) {
      try {
        const filters = { ...defaultExportFilter(), ...JSON.parse(filterParam) } as ExportFilter;
        filtered = applyExportFilters(exported, filters);
      } catch { /* ignore invalid filter JSON */ }
    }

    if (format === "json") {
      return NextResponse.json({
        type: "prompt_database",
        exported_at: new Date().toISOString(),
        count: filtered.length,
        data: filtered,
      });
    }

    // CSV
    const csv = buildCsvFromRows(filtered, PROMPT_DB_COLUMNS);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="algophony_studio_prompts_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logger.error({ err: err }, "[export/prompt-database] Error");
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
