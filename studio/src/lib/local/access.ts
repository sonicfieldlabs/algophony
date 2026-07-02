/**
 * Local workspace access layer.
 *
 * Local workspace access helpers. These expose available local capabilities to
 * callers that still ask for access state.
 */

import {
  hasEntitlement,
  type EntitlementKey,
  type Plan,
  type UserEntitlementState,
} from "@/lib/sfx/entitlements";

export type PlanId = Plan;

const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  creator: 1,
  studio: 2,
  team: 3,
};

const PLAN_NAMES: Record<PlanId, string> = {
  free: "Local workspace",
  creator: "Local workspace",
  studio: "Local workspace",
  team: "Local workspace",
};

export const LOCAL_ENTITLEMENTS: EntitlementKey[] = [
  "prompt_browser",
  "saved_prompt_cards",
  "basic_prompt_critic",
  "metadata_import",
  "prompt_pack",
  "batch_prompt_generation",
  "sonic_dna_profiles",
  "export_metadata",
  "priority_generation",
  "supervisor_chat",
  "supervisor_tools",
  "supervisor_advanced",
];

export interface AccessState extends UserEntitlementState {
  userId: string;
  creditsRemaining: number;
  monthlyLimit: number;
}

export async function getAccessState(userId: string): Promise<AccessState> {
  return {
    userId,
    plan: "team",
    entitlements: LOCAL_ENTITLEMENTS,
    creditsRemaining: Number.MAX_SAFE_INTEGER,
    monthlyLimit: Number.MAX_SAFE_INTEGER,
  };
}

export function hasFeature(state: AccessState, key: EntitlementKey): boolean {
  return hasEntitlement(state, key);
}

export function getUpgradeTargetForFeature(_key: EntitlementKey): PlanId {
  return "team";
}

export class FeatureGateError extends Error {
  status: number;
  code: string;
  requiredPlan: PlanId;

  constructor(feature: EntitlementKey, requiredPlan: PlanId = "team") {
    super(`Feature "${feature}" is unavailable in this local workspace session`);
    this.name = "FeatureGateError";
    this.status = 403;
    this.code = "FEATURE_UNAVAILABLE";
    this.requiredPlan = requiredPlan;
  }
}

export async function requireFeature(userId: string, key: EntitlementKey): Promise<AccessState> {
  const state = await getAccessState(userId);
  if (!hasFeature(state, key)) {
    throw new FeatureGateError(key);
  }
  return state;
}

export async function requirePlanAtLeast(userId: string, planId: PlanId): Promise<AccessState> {
  const state = await getAccessState(userId);
  const currentOrder = PLAN_ORDER[state.plan] ?? 0;
  const requiredOrder = PLAN_ORDER[planId] ?? 0;

  if (currentOrder < requiredOrder) {
    throw new FeatureGateError("prompt_browser", planId);
  }

  return state;
}

export function buildFeatureGateResponse(err: FeatureGateError) {
  return {
    error: err.message,
    code: err.code,
    requiredPlan: err.requiredPlan,
    requiredPlanName: PLAN_NAMES[err.requiredPlan],
    upgradeUrl: "/dashboard/settings?tab=providers",
  };
}
