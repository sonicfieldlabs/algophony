/**
 * Algophony Studio — Variation Lab Prompt Engine
 *
 * Builds variation prompts from source prompts using preservation locks,
 * mutation axes, and strategy templates. Also handles mutation matrices,
 * evaluation-based retry, and cost estimation.
 */

import type {
  VariationStrategy,
  PreservationSettings,
  PreservationStrength,
  VariationSource,
} from "./variation-taxonomy";
import {
  INTENSITY_LEVELS,
  DISTANCE_LEVELS,
  MOOD_LEVELS,
  UI_ACTIONS,
} from "./variation-taxonomy";
import { aggregateGuidance, type EvaluationTag } from "./evaluations";

// ── Strategy Templates ────────────────────────────────────────

const STRATEGY_TEMPLATES: Record<VariationStrategy, string> = {
  micro_variation:
    "Create a close variation of the following sound while preserving its core identity: {SOURCE}. Preserve: {LOCKED}. Vary only: {AXES}. Avoid: {EXCLUSIONS}.",
  material_family:
    "Create a version of this sound using {MATERIAL_VARIANT} instead of the original material: {SOURCE}. Preserve the action, perspective and realism. Avoid: {EXCLUSIONS}.",
  intensity_ladder:
    "Create a {INTENSITY_LEVEL} version of this sound: {SOURCE}. Preserve the source, action, material and space. Adjust force, transient, body and decay to match the intensity level. Avoid: {EXCLUSIONS}.",
  distance_ladder:
    "Create a {DISTANCE_LEVEL} perspective version of this sound: {SOURCE}. Preserve the same event and environment but change the perceived microphone distance and spatial presence. Avoid: {EXCLUSIONS}.",
  mood_palette:
    "Create a {MOOD_LEVEL} emotional version of this sound: {SOURCE}. Preserve: {LOCKED}. Shift the emotional character while keeping the core action. Avoid: {EXCLUSIONS}.",
  functional_ui_set:
    "Create a {UI_ACTION} sound for the same interface identity as this source: {SOURCE}. Preserve the brand character. The sound should be short, low-fatigue and functional. Avoid: {EXCLUSIONS}.",
  scene_coverage:
    "Generate a related sound element for the scene described by: {SOURCE}. This variation focuses on {SCENE_ELEMENT}. Keep it naturalistic and cohesive with the original scene. Avoid: {EXCLUSIONS}.",
  mutation_matrix:
    "Create a version of this sound with the following specific attributes: {MATRIX_VALUES}. Source: {SOURCE}. Preserve: {LOCKED}. Avoid: {EXCLUSIONS}.",
  round_robin:
    "Create a subtle round-robin variation of {SOURCE}. It should sound like the same object/action family but with small natural differences in {AXES}. Preserve {LOCKED}. Do not change the source, material, perspective or realism level. Avoid: {EXCLUSIONS}.",
};

// ── Variation Fragment Generators ──────────────────────────────

function strengthToMutationLevel(strength: PreservationStrength): string {
  switch (strength) {
    case "strict": return "very subtle, micro-level";
    case "medium": return "moderate, controlled";
    case "loose": return "wide, exploratory";
  }
}

function axesToMutationPhrase(axes: string[]): string {
  if (axes.length === 0) return "timing, intensity, and texture";
  return axes
    .map((a) => a.replace(/_/g, " "))
    .join(", ");
}

function lockedToPhrase(locked: string[]): string {
  if (locked.length === 0) return "core identity";
  return locked
    .map((a) => a.replace(/([A-Z])/g, " $1").toLowerCase().trim())
    .join(", ");
}

// ── Build Variation Prompt ────────────────────────────────────

export interface BuildVariationInput {
  source: VariationSource;
  preservation: PreservationSettings;
  selectedAxes: string[];
  strategy: VariationStrategy;
  variationIndex?: number;
  /** Strategy-specific overrides */
  materialVariant?: string;
  intensityLevel?: string;
  distanceLevel?: string;
  moodLevel?: string;
  uiAction?: string;
  sceneElement?: string;
  matrixValues?: Record<string, string>;
  /** Additional exclusions from evaluation feedback */
  extraExclusions?: string[];
}

export function buildVariationPrompt(input: BuildVariationInput): string {
  const {
    source, preservation, selectedAxes, strategy,
    variationIndex = 0,
    materialVariant, intensityLevel, distanceLevel,
    moodLevel, uiAction, sceneElement, matrixValues,
    extraExclusions = [],
  } = input;

  const template = STRATEGY_TEMPLATES[strategy];
  const locked = lockedToPhrase(preservation.locked);
  const axes = axesToMutationPhrase(selectedAxes);
  const mutationLevel = strengthToMutationLevel(preservation.strength);

  // Gather exclusions from source + extra
  const exclusions = [
    ...(source.attributes?.exclusions?.split(",").map((s) => s.trim()) ?? []),
    "no music", "no dialogue",
    ...extraExclusions,
  ].filter(Boolean);
  const exclusionStr = [...new Set(exclusions)].join(", ");

  let prompt = template
    .replace("{SOURCE}", source.promptText)
    .replace("{LOCKED}", locked)
    .replace("{AXES}", axes)
    .replace("{EXCLUSIONS}", exclusionStr)
    .replace("{MATERIAL_VARIANT}", materialVariant ?? "a different material")
    .replace("{INTENSITY_LEVEL}", intensityLevel ?? "medium")
    .replace("{DISTANCE_LEVEL}", distanceLevel ?? "medium")
    .replace("{MOOD_LEVEL}", moodLevel ?? "neutral")
    .replace("{UI_ACTION}", uiAction ?? "primary click")
    .replace("{SCENE_ELEMENT}", sceneElement ?? "an environmental detail");

  // Matrix values
  if (matrixValues) {
    const matrixStr = Object.entries(matrixValues)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(", ");
    prompt = prompt.replace("{MATRIX_VALUES}", matrixStr);
  }

  // Add variation index hint for diversity
  if (variationIndex > 0) {
    prompt += ` Variation ${variationIndex + 1}, ${mutationLevel} difference.`;
  }

  return prompt.replace(/\s+/g, " ").trim();
}

// ── Mutation Matrix ───────────────────────────────────────────

export interface MatrixAxis {
  axisId: string;
  values: string[];
}

export interface MatrixCombination {
  values: Record<string, string>;
  prompt: string;
}

export function buildMutationMatrix(
  source: VariationSource,
  axes: MatrixAxis[],
  preservation: PreservationSettings,
  exclusions: string[] = []
): MatrixCombination[] {
  if (axes.length === 0) return [];

  // Generate cartesian product
  const combinations: Record<string, string>[] = [{}];

  for (const axis of axes) {
    const newCombos: Record<string, string>[] = [];
    for (const combo of combinations) {
      for (const val of axis.values) {
        newCombos.push({ ...combo, [axis.axisId]: val });
      }
    }
    combinations.length = 0;
    combinations.push(...newCombos);
  }

  return combinations.map((values, i) => ({
    values,
    prompt: buildVariationPrompt({
      source,
      preservation,
      selectedAxes: Object.keys(values),
      strategy: "mutation_matrix",
      variationIndex: i,
      matrixValues: values,
      extraExclusions: exclusions,
    }),
  }));
}

// ── Evaluation Feedback ───────────────────────────────────────

export function applyEvaluationFeedback(
  sourcePrompt: string,
  evaluationTags: string[]
): { prompt: string; addedExclusions: string[] } {
  const addedExclusions = aggregateGuidance(evaluationTags as EvaluationTag[]);

  // Append constraints to prompt
  let prompt = sourcePrompt.trim();
  if (addedExclusions.length > 0) {
    if (!prompt.endsWith(".")) prompt += ".";
    prompt += " " + addedExclusions.join(", ") + ".";
  }

  return { prompt, addedExclusions };
}

// ── Batch Job Generation ──────────────────────────────────────

export interface BatchJobPlan {
  jobs: Array<{
    index: number;
    prompt: string;
    strategy: VariationStrategy;
    overrides?: Record<string, string>;
  }>;
  totalCost: number;
}

export function planBatchJobs(
  source: VariationSource,
  strategy: VariationStrategy,
  preservation: PreservationSettings,
  selectedAxes: string[],
  count: number,
  extraExclusions: string[] = []
): BatchJobPlan {
  const jobs: BatchJobPlan["jobs"] = [];

  switch (strategy) {
    case "intensity_ladder": {
      const levels = INTENSITY_LEVELS.slice(0, Math.min(count, INTENSITY_LEVELS.length));
      for (let i = 0; i < levels.length; i++) {
        jobs.push({
          index: i,
          prompt: buildVariationPrompt({
            source, preservation, selectedAxes, strategy,
            variationIndex: i, intensityLevel: levels[i], extraExclusions,
          }),
          strategy,
          overrides: { intensityLevel: levels[i] },
        });
      }
      break;
    }

    case "distance_ladder": {
      const levels = DISTANCE_LEVELS.slice(0, Math.min(count, DISTANCE_LEVELS.length));
      for (let i = 0; i < levels.length; i++) {
        jobs.push({
          index: i,
          prompt: buildVariationPrompt({
            source, preservation, selectedAxes, strategy,
            variationIndex: i, distanceLevel: levels[i], extraExclusions,
          }),
          strategy,
          overrides: { distanceLevel: levels[i] },
        });
      }
      break;
    }

    case "mood_palette": {
      const levels = MOOD_LEVELS.slice(0, Math.min(count, MOOD_LEVELS.length));
      for (let i = 0; i < levels.length; i++) {
        jobs.push({
          index: i,
          prompt: buildVariationPrompt({
            source, preservation, selectedAxes, strategy,
            variationIndex: i, moodLevel: levels[i], extraExclusions,
          }),
          strategy,
          overrides: { moodLevel: levels[i] },
        });
      }
      break;
    }

    case "functional_ui_set": {
      const actions = UI_ACTIONS.slice(0, Math.min(count, UI_ACTIONS.length));
      for (let i = 0; i < actions.length; i++) {
        jobs.push({
          index: i,
          prompt: buildVariationPrompt({
            source, preservation, selectedAxes, strategy,
            variationIndex: i, uiAction: actions[i], extraExclusions,
          }),
          strategy,
          overrides: { uiAction: actions[i] },
        });
      }
      break;
    }

    default: {
      // micro_variation, round_robin, material_family, scene_coverage
      for (let i = 0; i < count; i++) {
        jobs.push({
          index: i,
          prompt: buildVariationPrompt({
            source, preservation, selectedAxes, strategy,
            variationIndex: i, extraExclusions,
          }),
          strategy,
        });
      }
    }
  }

  return { jobs, totalCost: jobs.length };
}

// ── Cost Estimation ───────────────────────────────────────────

export function estimateVariationCost(
  batchSize: number,
  generationsPerSource: number,
  isCardsOnly: boolean
): { totalGenerations: number; totalCredits: number } {
  if (isCardsOnly) return { totalGenerations: 0, totalCredits: 0 };
  const total = batchSize * generationsPerSource;
  return { totalGenerations: total, totalCredits: total };
}
