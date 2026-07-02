/**
 * Algophony Studio — Entitlements
 *
 * Local-first compatibility helpers. These functions keep older callers
 * working while granting full local workspace access.
 */

import { FEATURE_MATRIX, type Plan as MatrixPlan } from "@/lib/sfx/feature-matrix";

export type Plan = MatrixPlan;

export type EntitlementKey =
  | "prompt_browser"
  | "saved_prompt_cards"
  | "basic_prompt_critic"
  | "metadata_import"
  | "prompt_pack"
  | "batch_prompt_generation"
  | "sonic_dna_profiles"
  | "export_metadata"
  | "priority_generation"
  | "supervisor_chat"
  | "supervisor_tools"
  | "supervisor_advanced";

/** Compatibility entitlements included for every local workspace. */
const PLAN_ENTITLEMENTS: Record<Plan, EntitlementKey[]> = {
  free: [
    "prompt_browser",
    "saved_prompt_cards",
    "basic_prompt_critic",
    "metadata_import",
    "batch_prompt_generation",
    "sonic_dna_profiles",
    "export_metadata",
    "priority_generation",
    "supervisor_chat",
    "supervisor_tools",
    "supervisor_advanced",
  ],
  creator: [],
  studio: [],
  team: [],
};
PLAN_ENTITLEMENTS.creator = PLAN_ENTITLEMENTS.free;
PLAN_ENTITLEMENTS.studio = PLAN_ENTITLEMENTS.free;
PLAN_ENTITLEMENTS.team = PLAN_ENTITLEMENTS.free;

/** Plan credit limits — §4.4: derived from feature matrix */
const PLAN_CREDITS: Record<Plan, number> = {
  free: FEATURE_MATRIX.free.creditMax,
  creator: FEATURE_MATRIX.creator.creditMax,
  studio: FEATURE_MATRIX.studio.creditMax,
  team: FEATURE_MATRIX.team.creditMax,
};

/** Saved prompt card limits — §4.4: derived from feature matrix */
const PLAN_CARD_LIMITS: Record<Plan, number> = {
  free: FEATURE_MATRIX.free.savedCards,
  creator: FEATURE_MATRIX.creator.savedCards,
  studio: FEATURE_MATRIX.studio.savedCards,
  team: FEATURE_MATRIX.team.savedCards,
};

export interface UserEntitlementState {
  plan: Plan;
  entitlements: EntitlementKey[];
}

/** Check if a user has a specific entitlement */
export function hasEntitlement(
  state: UserEntitlementState,
  key: EntitlementKey
): boolean {
  // Check explicit local entitlements first.
  if (state.entitlements.includes(key)) return true;
  // Fall back to plan-based entitlements
  return PLAN_ENTITLEMENTS[state.plan]?.includes(key) ?? false;
}

/** Get the monthly credit limit for a plan */
export function getMonthlyCredits(plan: Plan): number {
  return PLAN_CREDITS[plan] ?? 3;
}

/** Get the saved card limit for a plan */
export function getSavedCardLimit(plan: Plan): number {
  return PLAN_CARD_LIMITS[plan] ?? 5;
}

/** Get all entitlements for a plan */
export function getPlanEntitlements(plan: Plan): EntitlementKey[] {
  return PLAN_ENTITLEMENTS[plan] ?? [];
}

/** Check if a plan is paid */
export function isPaidPlan(plan: Plan): boolean {
  void plan;
  return false;
}

/** Determine the required plan for an entitlement */
export function requiredPlanForEntitlement(key: EntitlementKey): Plan {
  if (PLAN_ENTITLEMENTS.free.includes(key)) return "free";
  if (PLAN_ENTITLEMENTS.creator.includes(key)) return "creator";
  if (PLAN_ENTITLEMENTS.studio.includes(key)) return "studio";
  return "team";
}
