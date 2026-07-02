/**
 * Algophony Studio — Local Workspace Quotas
 *
 * Local-first compatibility surface for routes that still ask about daily
 * generation quotas. Provider-side quota is controlled by the user's own API key.
 */

import { getUserEntitlements } from "@/lib/auth/current-user";

export const DAILY_GENERATION_LIMITS: Record<string, number> = {
  local: Number.MAX_SAFE_INTEGER,
};

export interface QuotaResult {
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number;
  remaining: number;
  resetAtUtc: string;
}

function quotaWindow() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  return { todayStart, tomorrowStart };
}

/**
 * Check if a user is within their daily generation quota.
 */
export async function checkDailyQuota(
  _userId: string,
  _plan: string
): Promise<QuotaResult> {
  const { tomorrowStart } = quotaWindow();
  const limit = Number.MAX_SAFE_INTEGER;

  return {
    allowed: true,
    dailyUsed: 0,
    dailyLimit: limit,
    remaining: limit,
    resetAtUtc: tomorrowStart.toISOString(),
  };
}

/**
 * Get today's usage count for a user.
 */
export async function getDailyUsage(_userId: string): Promise<number> {
  return 0;
}

// ── Admin Role Detection ─────────────────────────────────────

const ADMIN_ENTITLEMENT_KEY = "atlas_admin";

/**
 * Check if a user has admin privileges.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.includes(ADMIN_ENTITLEMENT_KEY);
}

/**
 * Require admin access. Throws 403 if not authorized.
 */
export async function requireAdmin(userId: string): Promise<void> {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new AdminError("Admin access required", 403);
  }
}

export class AdminError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminError";
    this.status = status;
  }
}

// ── Usage Summary for Admin ──────────────────────────────────

export interface UserQuotaSummary {
  userId: string;
  email: string | null;
  plan: string;
  dailyUsed: number;
  dailyLimit: number;
  creditsRemaining: number;
  monthlyLimit: number;
}

/**
 * Get quota summary for all users (admin only).
 */
export async function getAllUserQuotas(): Promise<UserQuotaSummary[]> {
  return [];
}
