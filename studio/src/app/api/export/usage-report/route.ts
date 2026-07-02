import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getUserUsageEvents } from "@/lib/local/repositories/usage-events";
import { logger } from "@/lib/logger";
import {
  buildCsvFromRows, buildUsageReport, USAGE_REPORT_COLUMNS,
} from "@/lib/sfx/export-builders";

/**
 * GET /api/export/usage-report?format=csv|json
 */
export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "csv";

    const events = await getUserUsageEvents(profile.id, { limit: 5000 });
    const exported = buildUsageReport(events as unknown as Record<string, unknown>[]);

    if (format === "json") {
      return NextResponse.json({
        type: "usage_report",
        exported_at: new Date().toISOString(),
        count: exported.length,
        data: exported,
      });
    }

    const csv = buildCsvFromRows(exported, USAGE_REPORT_COLUMNS);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="algophony_studio_usage_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    logger.error({ err: err }, "[export/usage-report] Error");
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
