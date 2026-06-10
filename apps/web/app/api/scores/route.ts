import { NextRequest, NextResponse } from "next/server";
import { getScores } from "../../lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const summary = request.nextUrl.searchParams.get("summary") === "1";
  const scores = getScores();

  if (summary) {
    const lean = scores.map((s) => ({
      prompt_id: s.prompt_id,
      audio_id: s.audio_id,
      report_id: s.report_id,
      model: s.model,
      final_scores: s.final_scores,
      date: s.date,
    }));
    return NextResponse.json(lean);
  }

  return NextResponse.json(scores);
}
