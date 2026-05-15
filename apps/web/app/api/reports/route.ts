import { NextRequest, NextResponse } from "next/server";
import { getReports } from "../../lib/data";

export async function GET(request: NextRequest) {
  const summary = request.nextUrl.searchParams.get("summary") === "1";
  const reports = getReports();

  if (summary) {
    const lean = reports.map((r) => ({
      report_id: r.report_id,
      audio_id: r.audio_id,
      prompt_id: r.prompt_id,
      listener_type: r.listener_type,
      review_status: r.review_status,
      listening_process: r.listening_process,
      source_type_ground_truth: r.source_type_ground_truth,
      regeneration_recommendation: r.regeneration_recommendation,
      scores: r.scores,
    }));
    return NextResponse.json(lean);
  }

  return NextResponse.json(reports);
}
