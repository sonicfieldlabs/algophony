/**
 * Algophony Studio — Feature Matrix
 *
 * Compatibility surface for code that still asks for historical plan
 * features. Local-first Algophony Studio grants full app access; provider usage is
 * governed by the user's own API key and provider account.
 */

export type Plan = "free" | "creator" | "studio" | "team";

export interface PlanFeatures {
  /** Compatibility provider-call allowance */
  dailyGenerations: number;
  /** Max saved prompt cards */
  savedCards: number;
  /** Compatibility provider-call allowance */
  creditMax: number;
  /** Whether the AI supervisor is available */
  supervisor: boolean;
  /** Whether advanced supervisor tools are available */
  supervisorAdvanced: boolean;
  /** Whether metadata import is enabled */
  metadataImport: boolean;
  /** Whether batch generation is enabled */
  batchGeneration: boolean;
  /** Whether Sonic DNA profiles are available */
  sonicDna: boolean;
  /** Whether export is enabled */
  exportEnabled: boolean;
  /** Whether priority generation queue is available */
  priorityQueue: boolean;
}

const LOCAL_FEATURES: PlanFeatures = {
  dailyGenerations: Number.MAX_SAFE_INTEGER,
  savedCards: Number.MAX_SAFE_INTEGER,
  creditMax: Number.MAX_SAFE_INTEGER,
  supervisor: true,
  supervisorAdvanced: true,
  metadataImport: true,
  batchGeneration: true,
  sonicDna: true,
  exportEnabled: true,
  priorityQueue: true,
};

export const FEATURE_MATRIX: Record<Plan, PlanFeatures> = {
  free: LOCAL_FEATURES,
  creator: LOCAL_FEATURES,
  studio: LOCAL_FEATURES,
  team: LOCAL_FEATURES,
} as const;

/** Get features for a plan, defaulting to free for unknown plans */
export function getPlanFeatures(plan: string): PlanFeatures {
  const key = plan.toLowerCase() as Plan;
  return FEATURE_MATRIX[key] ?? FEATURE_MATRIX.free;
}

/** Get the monthly credit limit for a plan */
export function getCreditMax(plan: string): number {
  return getPlanFeatures(plan).creditMax;
}

/** Get the daily generation limit for a plan */
export function getDailyLimit(plan: string): number {
  return getPlanFeatures(plan).dailyGenerations;
}

/** Get the saved card limit for a plan */
export function getSavedCardLimit(plan: string): number {
  return getPlanFeatures(plan).savedCards;
}

/** Check if supervisor is available for a plan */
export function hasSupervisor(plan: string): boolean {
  return getPlanFeatures(plan).supervisor;
}

/** All known plan keys */
export const ALL_PLANS: Plan[] = ["free", "creator", "studio", "team"];
