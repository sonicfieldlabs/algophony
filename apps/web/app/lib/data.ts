import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.env.ALGOPHONY_DATA_ROOT
  ? path.resolve(/* turbopackIgnore: true */ process.env.ALGOPHONY_DATA_ROOT)
  : path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..");

const DATA_PATHS = {
  prompts: path.join(REPO_ROOT, "atlas", "prompts", "algophony-atlas-v0.1.jsonl"),
  generations: path.join(REPO_ROOT, "generations", "metadata", "generations-v0.1.jsonl"),
  reports: path.join(REPO_ROOT, "reports", "json"),
  scores: path.join(REPO_ROOT, "benchmark", "scores", "scores-v0.1.jsonl"),
  suite: path.join(REPO_ROOT, "benchmark", "suites", "algophony-benchmark-lite-v0.1.json"),
  comparison: path.join(REPO_ROOT, "benchmark", "exports", "model-comparison-v0.1.json"),
  providerStatus: path.join(REPO_ROOT, "benchmark", "exports", "provider-status.json"),
};

function loadJsonlFile<T>(target: string): T[] {
  if (!fs.existsSync(target)) return [];
  return fs
    .readFileSync(target, "utf-8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function loadJsonFile<T>(target: string): T | null {
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, "utf-8")) as T;
}

function loadJsonDir<T>(target: string): T[] {
  if (!fs.existsSync(target)) return [];
  return fs
    .readdirSync(target)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(target, file), "utf-8")) as T);
}

export interface Prompt {
  prompt_id: string;
  prompt_text: string;
  category: string;
  subcategories: string[];
  intended_sources: string[];
  forbidden_sources: string[];
  location_imaginary: string;
  listening_mode: string;
  duration_target: number;
  loop_required: boolean;
  difficulty: string;
  evaluation_focus: string[];
}

export type SourceType = "generated_procedural" | "generated_ml" | "field_recording" | "found_sound" | "hybrid";

export interface UploadMetadata {
  original_filename?: string;
  recorder?: string;
  location?: string;
  date_recorded?: string;
  equipment?: string;
  notes?: string;
}

export interface Generation {
  audio_id: string;
  prompt_id: string;
  model: string;
  model_version: string;
  generation_date: string;
  duration: number;
  seed: number | null;
  storage_uri: string;
  parameters: Record<string, unknown>;
  license_status: string;
  file_format: string;
  sha256: string;
  akouo_report_id: string;
  human_notes: string[];
  source_type: SourceType;
  upload_metadata: UploadMetadata | null;
}

export interface ScoreSet {
  prompt_adherence: number;
  source_accuracy: number;
  spatial_coherence: number;
  event_density_score: number;
  ecological_plausibility: number;
  causal_coherence: number;
  false_source_index: number;
  generic_naturalism_index: number;
  cultural_cliche_index: number;
  loopability: number;
  regeneration_potential: "keep" | "revise" | "reject";
  artificiality_discriminability?: number | null;
}

export interface Claim {
  statement: string;
  confidence: "high" | "medium" | "low" | "undetermined";
  basis: string;
}

export type ReportClaimTaxonomy = Record<"heard" | "measured" | "inferred" | "interpreted" | "speculative" | "undetermined", Claim[]>;

export type ListeningProcess = "agent_automated" | "agent_interactive" | "human_blind" | "human_informed" | "hybrid";

export interface Report {
  report_id: string;
  report_type: "signal_report" | "listening_report";
  audio_id: string;
  prompt_id: string;
  listening_date: string;
  listener_type: "human" | "agent" | "hybrid";
  review_status: "unreviewed" | "agent_draft" | "human_reviewed" | "hybrid_reviewed" | "playground_draft";
  listening_process: ListeningProcess;
  source_type_ground_truth: SourceType | null;
  source_type_listener_guess: "generated" | "field_recording" | "uncertain" | null;
  reviewer_notes: string[];
  evidence_inputs: string[];
  classifier_outputs: Record<string, unknown>[];
  revision_history: Record<string, unknown>[];
  claim_taxonomy: ReportClaimTaxonomy;
  akouo_router_output?: {
    object_listened_to: string;
    input_type: string;
    user_intent: string;
    available_evidence: string[];
    unavailable_evidence: string[];
    primary_mode: string;
    secondary_mode: string;
    corrective_mode: string;
    route_reasoning: string[];
    risks: string[];
    must_not_assume: string[];
    recommended_command: string;
    recommended_next_mode: string;
  } | null;
  akouo_mode_outputs?: {
    object_listened_to: string;
    input_type: string;
    listening_mode: string;
    listening_claims: ReportClaimTaxonomy;
    what_appears: string[];
    what_remains_hidden: string[];
    mediations: Record<string, string[]>;
    risks: Record<string, string[]>;
    main_reading: string;
    alternative_reading: string;
    recommended_next_mode: string;
  }[];
  basic_description: string;
  sources: {
    detected: string[];
    inferred: string[];
    absent_expected: string[];
    forbidden_detected: string[];
    hallucinated: string[];
  };
  spatial_structure: Record<string, unknown>;
  temporal_behavior: Record<string, unknown>;
  ecological_plausibility: string;
  causal_coherence: string;
  cultural_assumptions: string;
  false_sources: string[];
  prompt_comparison: string;
  suggested_prompt_revision: string;
  regeneration_recommendation: "keep" | "revise" | "reject";
  score_sets: {
    signal_scores: ScoreSet;
    agent_scores: ScoreSet;
    human_scores: ScoreSet | null;
    final_scores: ScoreSet;
  };
  score_provenance: {
    axis: string;
    score: number;
    scorer: string;
    evidence: string;
    confidence: string;
    notes: string;
  }[];
  scores: ScoreSet;
}

export interface ScoreRecord {
  suite_id: string;
  prompt_id: string;
  audio_id: string;
  report_id: string;
  model: { provider: string; version: string; type: string };
  score_sets: Report["score_sets"];
  score_provenance: Report["score_provenance"];
  final_scores: ScoreSet;
  date: string;
}

export interface BenchmarkSuite {
  id: string;
  title: string;
  description: string;
  benchmark_status: "procedural_pilot" | "ml_benchmark" | "hybrid_benchmark" | "archived";
  version: string;
  models_compared: {
    provider_id: string;
    name: string;
    type: string;
    status: string;
    version?: string;
    description: string;
    synthesis_method: string;
  }[];
  score_axes: { axis: string; range: number[]; direction: string; description: string }[];
  total_generations: number;
  total_reports: number;
  ml_generation_count: number;
  procedural_generation_count: number;
  limitations: string[];
  exports: { csv: string; markdown: string; json: string };
}

export interface ProviderStatus {
  provider_id: string;
  name: string;
  type: string;
  runtime: "api" | "local";
  version: string;
  license_status: string;
  install_hint: string;
  env_requirements: string[];
  optional_dependencies: string[];
  max_duration_seconds: number | null;
  supports_loop: boolean;
  supports_seed: boolean;
  default_parameters: Record<string, unknown>;
  status: "available" | "configured_missing_key" | "not_installed" | "not_implemented" | "failed";
  status_reason: string;
}

export function getPrompts(): Prompt[] {
  return loadJsonlFile<Prompt>(DATA_PATHS.prompts);
}

export function getGenerations(): Generation[] {
  return loadJsonlFile<Generation>(DATA_PATHS.generations);
}

export function getReports(): Report[] {
  return loadJsonDir<Report>(DATA_PATHS.reports);
}

export function getScores(): ScoreRecord[] {
  return loadJsonlFile<ScoreRecord>(DATA_PATHS.scores);
}

export function getSuite(): BenchmarkSuite | null {
  return loadJsonFile<BenchmarkSuite>(DATA_PATHS.suite);
}

export function getComparison(): Record<string, unknown> | null {
  return loadJsonFile<Record<string, unknown>>(DATA_PATHS.comparison);
}

export function fileExists(relPath: string): boolean {
  const target = path.resolve(REPO_ROOT, relPath);
  return target.startsWith(REPO_ROOT) && fs.existsSync(target);
}

export function getProviderStatuses(): ProviderStatus[] {
  return loadJsonFile<ProviderStatus[]>(DATA_PATHS.providerStatus) || [];
}

export function getPrompt(id: string): Prompt | undefined {
  return getPrompts().find((prompt) => prompt.prompt_id === id);
}

export function getGeneration(id: string): Generation | undefined {
  return getGenerations().find((generation) => generation.audio_id === id);
}

export function getReport(id: string): Report | undefined {
  return getReports().find((report) => report.report_id === id);
}

export function getReportsForAudio(audioId: string): Report[] {
  return getReports().filter((report) => report.audio_id === audioId);
}

export function getGenerationsForPrompt(promptId: string): Generation[] {
  return getGenerations().filter((generation) => generation.prompt_id === promptId);
}

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

export const SOURCE_TYPES: SourceType[] = [
  "generated_procedural",
  "generated_ml",
  "field_recording",
  "found_sound",
  "hybrid",
];

export const LISTENING_PROCESSES: ListeningProcess[] = [
  "agent_automated",
  "agent_interactive",
  "human_blind",
  "human_informed",
  "hybrid",
];

export const CATEGORIES = [
  "forest",
  "city",
  "coast",
  "interior",
  "machine",
  "ritual",
  "archive",
  "club_exterior",
  "ruin",
  "impossible_ecology",
] as const;

export function modelTypeLabel(model: string): string {
  return model.includes("Baseline") ? "procedural control" : "ML model";
}

export function sourceTypeLabel(st: SourceType): string {
  const labels: Record<SourceType, string> = {
    generated_procedural: "Generated (Procedural)",
    generated_ml: "Generated (ML)",
    field_recording: "Field Recording",
    found_sound: "Found Sound",
    hybrid: "Hybrid",
  };
  return labels[st] || st;
}

export function listeningProcessLabel(lp: ListeningProcess): string {
  const labels: Record<ListeningProcess, string> = {
    agent_automated: "Agent (Automated)",
    agent_interactive: "Agent (Interactive)",
    human_blind: "Human (Blind)",
    human_informed: "Human (Informed)",
    hybrid: "Hybrid",
  };
  return labels[lp] || lp;
}

export function axisDirection(axis: string): "positive" | "risk" {
  return (RISK_AXES as readonly string[]).includes(axis) ? "risk" : "positive";
}
