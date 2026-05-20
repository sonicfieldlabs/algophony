import { getGenerations, getReports, getScores } from "../lib/data";
import ObservatoryClient from "./ObservatoryClient";

export default function ObservatoryPage() {
  const scores = getScores();
  const reports = getReports();
  const generations = getGenerations();

  const leanScores = scores.map((s) => ({
    prompt_id: s.prompt_id,
    audio_id: s.audio_id,
    report_id: s.report_id,
    model: s.model,
    final_scores: s.final_scores as unknown as Record<string, number | string | null>,
    date: s.date,
  }));

  const leanReports = reports.map((r) => ({
    report_id: r.report_id,
    audio_id: r.audio_id,
    prompt_id: r.prompt_id,
    listener_type: r.listener_type,
    claim_taxonomy: r.claim_taxonomy as unknown as Record<string, { statement: string }[]> | undefined,
  }));

  const leanGenerations = generations.map((g) => ({
    audio_id: g.audio_id,
    prompt_id: g.prompt_id,
    model: g.model,
    source_type: g.source_type,
    duration: g.duration,
  }));

  return <ObservatoryClient scores={leanScores} reports={leanReports} generations={leanGenerations} />;
}
