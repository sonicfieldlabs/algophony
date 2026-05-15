import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "../..");

function loadJsonl<T>(relPath: string): T[] {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return [];
  return fs
    .readFileSync(fullPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

function loadJson<T>(relPath: string): T | null {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

function loadJsonDir<T>(relPath: string): T[] {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return [];
  return fs
    .readdirSync(fullPath)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(fullPath, f), "utf-8")) as T);
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

export interface Generation {
  audio_id: string;
  prompt_id: string;
  model: string;
  model_version?: string;
  date: string;
  duration: number;
  storage_uri: string;
  parameters: Record<string, unknown>;
  sha256?: string;
}

export interface Report {
  report_id: string;
  audio_id: string;
  prompt_id: string;
  listening_date: string;
  listener_type: string;
  basic_description: string;
  scores: Record<string, number | string>;
  regeneration_recommendation: string;
  ecological_plausibility: string;
  causal_coherence: string;
  prompt_comparison: string;
  sources: { detected: string[]; inferred: string[]; absent_expected: string[] };
}

export interface ScoreRecord {
  prompt_id: string;
  audio_id: string;
  report_id: string;
  model: { provider: string; version?: string };
  scores: Record<string, number | string>;
  date: string;
}

export interface BenchmarkSuite {
  suite_id: string;
  title: string;
  description: string;
  version: string;
  models_compared: { provider_id: string; name: string; type: string; description: string; status?: string }[];
  scoring_axes: { axis: string; range: number[]; description: string }[];
  total_generations: number;
  total_reports: number;
}

export function getPrompts(): Prompt[] {
  return loadJsonl<Prompt>("atlas/prompts/algophony-atlas-v0.1.jsonl");
}

export function getGenerations(): Generation[] {
  return loadJsonl<Generation>("generations/metadata/generations-v0.1.jsonl");
}

export function getReports(): Report[] {
  return loadJsonDir<Report>("reports/json");
}

export function getScores(): ScoreRecord[] {
  return loadJsonl<ScoreRecord>("benchmark/scores/scores-v0.1.jsonl");
}

export function getSuite(): BenchmarkSuite | null {
  return loadJson<BenchmarkSuite>("benchmark/suites/algophony-benchmark-lite-v0.1.json");
}

export function getComparison(): Record<string, unknown> | null {
  return loadJson<Record<string, unknown>>("benchmark/exports/model-comparison-v0.1.json");
}

export const SCORE_AXES = [
  "prompt_adherence", "source_accuracy", "spatial_coherence",
  "event_density_score", "ecological_plausibility", "causal_coherence",
  "false_source_index", "generic_naturalism_index", "cultural_cliche_index",
  "loopability",
] as const;

export const CATEGORIES = [
  "forest", "city", "coast", "interior", "machine",
  "ritual", "archive", "club_exterior", "ruin", "impossible_ecology",
] as const;
