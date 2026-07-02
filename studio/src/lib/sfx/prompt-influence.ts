/**
 * Algophony Studio — Prompt Influence Intelligence
 *
 * Named presets, labels, colors, and cost estimation for prompt_influence
 * comparison experiments. The ElevenLabs `prompt_influence` parameter (0–1)
 * controls how closely generation follows the prompt text:
 *   0.0 = maximum creative drift / variability
 *   1.0 = strict adherence to prompt
 */

// ── Presets ──────────────────────────────────────────────────

export type InfluencePresetId =
  | "round_robin"
  | "ui_sounds"
  | "ambiences"
  | "strict"
  | "sweep"
  | "micro"
  | "custom";

export interface InfluencePreset {
  id: InfluencePresetId;
  label: string;
  description: string;
  values: number[];
  /** Recommended use-case tags */
  useCases: string[];
}

export const INFLUENCE_PRESETS: Record<InfluencePresetId, InfluencePreset> = {
  round_robin: {
    id: "round_robin",
    label: "Round-Robin",
    description: "Balanced spread for game/film variation sets",
    values: [0.15, 0.30, 0.45, 0.60],
    useCases: ["game sfx", "film foley", "round-robin sets"],
  },
  ui_sounds: {
    id: "ui_sounds",
    label: "UI Sounds",
    description: "High adherence — precise, predictable results",
    values: [0.50, 0.65, 0.80],
    useCases: ["UI/UX sounds", "notification tones", "interface feedback"],
  },
  ambiences: {
    id: "ambiences",
    label: "Ambiences",
    description: "Creative drift — organic, evolving textures",
    values: [0.10, 0.20, 0.35],
    useCases: ["ambient beds", "atmospheres", "environmental textures"],
  },
  strict: {
    id: "strict",
    label: "Strict",
    description: "Maximum prompt adherence for precise reproduction",
    values: [0.70, 0.80, 0.90, 1.0],
    useCases: ["precise SFX", "technical sounds", "matching references"],
  },
  sweep: {
    id: "sweep",
    label: "Full Sweep",
    description: "Complete 0.1–0.8 exploration of the influence space",
    values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    useCases: ["exploration", "comparison", "research"],
  },
  micro: {
    id: "micro",
    label: "Micro Comparison",
    description: "Tight comparison at two key influence points",
    values: [0.3, 0.6],
    useCases: ["quick A/B", "fast comparison"],
  },
  custom: {
    id: "custom",
    label: "Custom",
    description: "Define your own influence values",
    values: [0.3],
    useCases: [],
  },
};

export const PRESET_LIST = Object.values(INFLUENCE_PRESETS).filter(
  (p) => p.id !== "custom"
);

// ── Labels ───────────────────────────────────────────────────

export type InfluenceZone = "creative" | "balanced" | "guided" | "strict";

export function getInfluenceZone(value: number): InfluenceZone {
  if (value <= 0.25) return "creative";
  if (value <= 0.50) return "balanced";
  if (value <= 0.75) return "guided";
  return "strict";
}

const ZONE_LABELS: Record<InfluenceZone, string> = {
  creative: "Creative Drift",
  balanced: "Balanced",
  guided: "Guided",
  strict: "Strict Adherence",
};

const ZONE_DESCRIPTIONS: Record<InfluenceZone, string> = {
  creative: "High variability, unexpected textures",
  balanced: "Even mix of prompt direction and AI creativity",
  guided: "Follows prompt closely with some variation",
  strict: "Minimal deviation from prompt text",
};

export function getInfluenceLabel(value: number): string {
  return ZONE_LABELS[getInfluenceZone(value)];
}

export function getInfluenceDescription(value: number): string {
  return ZONE_DESCRIPTIONS[getInfluenceZone(value)];
}

// ── Colors ───────────────────────────────────────────────────

/** Returns an HSL hue for visual encoding (blue→purple→orange→red) */
export function getInfluenceHue(value: number): number {
  // 0.0 → 210 (blue/creative), 1.0 → 0 (red/strict)
  return Math.round(210 - value * 210);
}

/** Returns a full HSL color string */
export function getInfluenceColor(value: number): string {
  const hue = getInfluenceHue(value);
  return `hsl(${hue}, 60%, 55%)`;
}

/** Returns a muted background color */
export function getInfluenceBg(value: number): string {
  const hue = getInfluenceHue(value);
  return `hsla(${hue}, 50%, 50%, 0.12)`;
}

// ── Cost Estimation ──────────────────────────────────────────

export interface SweepCostEstimate {
  presetId: InfluencePresetId;
  generationCount: number;
  creditsPerGeneration: number;
  totalCredits: number;
  values: number[];
}

export function estimateInfluenceSweepCost(
  presetId: InfluencePresetId,
  creditsPerGeneration = 1,
  customValues?: number[]
): SweepCostEstimate {
  const preset = INFLUENCE_PRESETS[presetId];
  const values = presetId === "custom" && customValues ? customValues : preset.values;

  return {
    presetId,
    generationCount: values.length,
    creditsPerGeneration,
    totalCredits: values.length * creditsPerGeneration,
    values,
  };
}

// ── Sweep Result Types ───────────────────────────────────────

export interface InfluenceSweepJob {
  index: number;
  influence: number;
  label: string;
  zone: InfluenceZone;
  color: string;
  status: "queued" | "running" | "completed" | "failed";
  audioUrl?: string;
  generationId?: string;
  errorMessage?: string;
}

export function planInfluenceSweep(
  values: number[]
): Omit<InfluenceSweepJob, "status">[] {
  return values.map((influence, index) => ({
    index,
    influence,
    label: getInfluenceLabel(influence),
    zone: getInfluenceZone(influence),
    color: getInfluenceColor(influence),
  }));
}
