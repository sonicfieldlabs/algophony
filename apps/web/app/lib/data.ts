import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  type BenchmarkSuite,
  type Generation,
  type Prompt,
  type ProviderStatus,
  type Report,
  type ScoreRecord,
  type ScoreSet,
  type SourceType,
  type ListeningProcess,
} from "./types";

export type {
  BenchmarkSuite,
  Generation,
  Prompt,
  ProviderStatus,
  Report,
  ScoreRecord,
  ScoreSet,
  SourceType,
  ListeningProcess,
};

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

function safeJsonParse<T>(line: string, context: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch (err) {
    console.error(`[data] skipping malformed JSON in ${context}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function mtimeKey(target: string): string {
  try {
    const st = fs.statSync(target);
    return `${target}:${st.mtimeMs}:${st.size}`;
  } catch {
    return `${target}:missing`;
  }
}

function loadJsonlFile<T>(target: string): T[] {
  if (!fs.existsSync(target)) return [];
  return fs
    .readFileSync(target, "utf-8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => safeJsonParse<T>(line, target))
    .filter((value): value is T => value !== null);
}

function loadJsonFile<T>(target: string): T | null {
  if (!fs.existsSync(target)) return null;
  return safeJsonParse<T>(fs.readFileSync(target, "utf-8"), target);
}

function dirMtimeKey(target: string): string {
  try {
    const st = fs.statSync(target);
    return `${target}:${st.mtimeMs}`;
  } catch {
    return `${target}:missing`;
  }
}

function loadJsonDir<T>(target: string): T[] {
  if (!fs.existsSync(target)) return [];
  return fs
    .readdirSync(target)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const fullPath = path.join(target, file);
      return safeJsonParse<T>(fs.readFileSync(fullPath, "utf-8"), fullPath);
    })
    .filter((value): value is T => value !== null);
}

/**
 * Module-scoped mtime-keyed memo. Survives across requests in the same Node process.
 * `cache()` from React dedupes within a single request.
 */
function memoize<T>(load: (key: string) => T): (key: string) => T {
  const store = new Map<string, T>();
  return (key: string) => {
    const existing = store.get(key);
    if (existing !== undefined) return existing;
    const value = load(key);
    store.set(key, value);
    return value;
  };
}

const promptsMemo = memoize<Prompt[]>(() => loadJsonlFile<Prompt>(DATA_PATHS.prompts));
const generationsMemo = memoize<Generation[]>(() => loadJsonlFile<Generation>(DATA_PATHS.generations));
const reportsMemo = memoize<Report[]>(() => loadJsonDir<Report>(DATA_PATHS.reports));
const scoresMemo = memoize<ScoreRecord[]>(() => loadJsonlFile<ScoreRecord>(DATA_PATHS.scores));
const suiteMemo = memoize<BenchmarkSuite | null>(() => loadJsonFile<BenchmarkSuite>(DATA_PATHS.suite));
const comparisonMemo = memoize<Record<string, unknown> | null>(() =>
  loadJsonFile<Record<string, unknown>>(DATA_PATHS.comparison),
);
const providerStatusMemo = memoize<ProviderStatus[]>(
  () => loadJsonFile<ProviderStatus[]>(DATA_PATHS.providerStatus) || [],
);

export const getPrompts = cache((): Prompt[] => promptsMemo(mtimeKey(DATA_PATHS.prompts)));
export const getGenerations = cache((): Generation[] => generationsMemo(mtimeKey(DATA_PATHS.generations)));
export const getReports = cache((): Report[] => reportsMemo(dirMtimeKey(DATA_PATHS.reports)));
export const getScores = cache((): ScoreRecord[] => scoresMemo(mtimeKey(DATA_PATHS.scores)));
export const getSuite = cache((): BenchmarkSuite | null => suiteMemo(mtimeKey(DATA_PATHS.suite)));
export const getComparison = cache((): Record<string, unknown> | null =>
  comparisonMemo(mtimeKey(DATA_PATHS.comparison)),
);
export const getProviderStatuses = cache((): ProviderStatus[] =>
  providerStatusMemo(mtimeKey(DATA_PATHS.providerStatus)),
);

export function fileExists(relPath: string): boolean {
  const target = path.resolve(REPO_ROOT, relPath);
  return target.startsWith(REPO_ROOT) && fs.existsSync(target);
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

export { POSITIVE_AXES, RISK_AXES, SCORE_AXES, axisDirection } from "./score-bar";

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

export function isKnownCategory(value: string): boolean {
  return (CATEGORIES as readonly string[]).includes(value);
}

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
