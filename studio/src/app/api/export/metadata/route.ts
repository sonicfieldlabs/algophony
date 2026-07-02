import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { listGenerations } from "@/lib/local/repositories/generations";
import {
  buildCsvFromRows, buildSoundMetadataExport,
  SOUND_METADATA_COLUMNS, applyExportFilters,
} from "@/lib/sfx/export-builders";
import { defaultExportFilter, type ExportFilter } from "@/lib/sfx/export-taxonomy";
import { logger } from "@/lib/logger";

/**
 * GET /api/export/metadata?format=csv|json
 */
export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "csv";

    const { rows } = await listGenerations(profile.id, { limit: 1000 });
    const exported = buildSoundMetadataExport(rows as unknown as Record<string, unknown>[]);

    let filtered = exported;
    const filterParam = url.searchParams.get("filters");
    if (filterParam) {
      try {
        const filters = { ...defaultExportFilter(), ...JSON.parse(filterParam) } as ExportFilter;
        filtered = applyExportFilters(exported, filters);
      } catch { /* ignore */ }
    }

    if (format === "json") {
      return NextResponse.json({
        type: "sound_metadata",
        exported_at: new Date().toISOString(),
        count: filtered.length,
        data: filtered,
      });
    }

    const csv = buildCsvFromRows(filtered, SOUND_METADATA_COLUMNS);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="algophony_studio_metadata_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logger.error({ err: err }, "[export/metadata] Error");
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
