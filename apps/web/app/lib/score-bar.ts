/** Score-bar level mapping and direction lookup, shared by all dashboards. */

export const POSITIVE_AXES = [
  "prompt_adherence",
  "source_accuracy",
  "spatial_coherence",
  "event_density_score",
  "ecological_plausibility",
  "causal_coherence",
  "loopability",
] as const;

export const RISK_AXES = [
  "false_source_index",
  "generic_naturalism_index",
  "cultural_cliche_index",
] as const;

export const SCORE_AXES = [
  "prompt_adherence",
  "source_accuracy",
  "spatial_coherence",
  "event_density_score",
  "ecological_plausibility",
  "causal_coherence",
  "false_source_index",
  "generic_naturalism_index",
  "cultural_cliche_index",
  "loopability",
] as const;

const RISK_AXES_SET = new Set<string>(RISK_AXES);

export type ScoreLevel = "low" | "mid" | "high" | "empty";

export function scoreLevel(value: number | null | undefined, axis: string): ScoreLevel {
  if (value === null || value === undefined || Number.isNaN(value)) return "empty";
  const risk = RISK_AXES_SET.has(axis);
  if (risk) return value <= 1 ? "high" : value <= 2.5 ? "mid" : "low";
  return value <= 2 ? "low" : value <= 3.5 ? "mid" : "high";
}

export function scorePct(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return (value / 5) * 100;
}
