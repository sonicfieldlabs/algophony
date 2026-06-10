import { getGenerations, getPrompts, getReports } from "../lib/data";
import ReportsList from "./ReportsList";

export default function ReportsPage() {
  const reports = getReports();
  const prompts = getPrompts();
  const generations = getGenerations();

  const promptMap = Object.fromEntries(
    prompts.map((p) => [p.prompt_id, { prompt_id: p.prompt_id, category: p.category }] as const),
  );
  const genMap = Object.fromEntries(
    generations.map((g) => [g.audio_id, { audio_id: g.audio_id, source_type: g.source_type }] as const),
  );

  const lean = reports.map((r) => ({
    report_id: r.report_id,
    audio_id: r.audio_id,
    prompt_id: r.prompt_id,
    listener_type: r.listener_type as string,
    review_status: r.review_status as string,
    listening_process: r.listening_process as string,
    regeneration_recommendation: r.regeneration_recommendation as string,
    scores: (r.scores || r.score_sets?.final_scores || null) as unknown as Record<string, number | string | null> | null,
  }));

  const categories = Array.from(new Set(prompts.map((p) => p.category))).sort();

  return (
    <ReportsList
      reports={lean}
      promptMap={promptMap}
      genMap={genMap}
      categories={categories}
      totalReports={reports.length}
    />
  );
}
