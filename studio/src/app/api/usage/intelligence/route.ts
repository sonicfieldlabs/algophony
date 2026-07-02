import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import {
  getFullCreditIntelligence,
  getCreditsByProject,
  getCreditsByApiFamily,
  getCostPerVerdict,
  getFavoriteToCrediteRatio,
} from "@/lib/sfx/credit-intelligence";

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const section = request.nextUrl.searchParams.get("section");

    let data: unknown;

    switch (section) {
      case "projects":
        data = await getCreditsByProject(profile.id);
        break;
      case "routes":
        data = await getCreditsByApiFamily(profile.id);
        break;
      case "verdicts":
        data = await getCostPerVerdict(profile.id);
        break;
      case "favorites":
        data = await getFavoriteToCrediteRatio(profile.id);
        break;
      default:
        // Full report
        data = await getFullCreditIntelligence(profile.id);
        break;
    }

    const res = NextResponse.json({
      section: section ?? "full",
      data,
      userId: profile.id,
      plan: profile.plan,
      creditsRemaining: profile.credits_remaining,
      monthlyLimit: profile.monthly_credit_limit,
    });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
    logger.error({ err: error }, "Credit intelligence error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
