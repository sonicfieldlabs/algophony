import {
  getPlanEntitlements,
  type EntitlementKey,
  type Plan,
} from "@/lib/sfx/entitlements";

const LOCAL_ACCESS_PLAN: Plan = "team";
const DEFAULT_LOCAL_CREDITS = Number.MAX_SAFE_INTEGER;

export type LocalAccessProfile = {
  plan: string | null;
  monthly_credit_limit: number | null;
  credits_remaining: number | null;
};

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isLocalAppUrl(appUrl: string | undefined): boolean {
  if (!appUrl) return process.env.NODE_ENV !== "production";

  try {
    const hostname = new URL(appUrl).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function isLocalFullAccessEnabled(): boolean {
  if (process.env.ALGOPHONY_STUDIO_LOCAL_FULL_ACCESS === "false") return false;
  if (process.env.ALGOPHONY_STUDIO_LOCAL_FULL_ACCESS === "true") return true;
  return isLocalAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getLocalFullAccessCredits(): number {
  return parsePositiveInteger(process.env.ALGOPHONY_STUDIO_LOCAL_CREDITS, DEFAULT_LOCAL_CREDITS);
}

export function getLocalFullAccessPlan(): Plan {
  return LOCAL_ACCESS_PLAN;
}

export function applyLocalFullAccessToProfile<T extends LocalAccessProfile>(profile: T): T {
  if (!isLocalFullAccessEnabled()) return profile;

  const credits = getLocalFullAccessCredits();
  return {
    ...profile,
    plan: LOCAL_ACCESS_PLAN,
    monthly_credit_limit: Math.max(profile.monthly_credit_limit ?? 0, credits),
    credits_remaining: Math.max(profile.credits_remaining ?? 0, credits),
  };
}

export function getLocalFullAccessProvisioningValues() {
  if (!isLocalFullAccessEnabled()) {
    return {
      plan: "free" as const,
      monthly_credit_limit: 3,
      credits_remaining: 3,
    };
  }

  const credits = getLocalFullAccessCredits();
  return {
    plan: LOCAL_ACCESS_PLAN,
    monthly_credit_limit: credits,
    credits_remaining: credits,
  };
}

export function applyLocalFullAccessToEntitlements(
  entitlements: EntitlementKey[],
): EntitlementKey[] {
  if (!isLocalFullAccessEnabled()) return entitlements;

  return Array.from(
    new Set<EntitlementKey>([
      ...entitlements,
      ...getPlanEntitlements(LOCAL_ACCESS_PLAN),
    ]),
  );
}
