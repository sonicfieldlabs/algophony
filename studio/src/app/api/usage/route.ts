import { NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getUserUsageStats } from "@/lib/local/repositories/usage-events";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const stats = await getUserUsageStats(profile.id);

    const res = NextResponse.json({
      userId: profile.id,
      plan: profile.plan,
      creditsRemaining: profile.credits_remaining,
      monthlyLimit: profile.monthly_credit_limit,
      ...stats,
    });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return res;
  } catch (error) {
    logger.error({ err: error }, "Usage route error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
