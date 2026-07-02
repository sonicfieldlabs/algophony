import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyLocalFullAccessToEntitlements,
  applyLocalFullAccessToProfile,
  getLocalFullAccessCredits,
  isLocalFullAccessEnabled,
} from "./full-access";
import {
  getAccessState,
  requireFeature,
  requirePlanAtLeast,
} from "./access";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  ALGOPHONY_STUDIO_LOCAL_FULL_ACCESS: process.env.ALGOPHONY_STUDIO_LOCAL_FULL_ACCESS,
  ALGOPHONY_STUDIO_LOCAL_CREDITS: process.env.ALGOPHONY_STUDIO_LOCAL_CREDITS,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("local workspace access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    restoreEnv();
  });

  it("grants every local entitlement from workspace state", async () => {
    const state = await getAccessState("local-workspace");

    expect(state.plan).toBe("team");
    expect(state.entitlements).toEqual(expect.arrayContaining([
      "metadata_import",
      "batch_prompt_generation",
      "supervisor_advanced",
    ]));
    await expect(requireFeature("local-workspace", "metadata_import")).resolves.toMatchObject({
      userId: "local-workspace",
    });
    await expect(requirePlanAtLeast("local-workspace", "team")).resolves.toMatchObject({
      plan: "team",
    });
  });

  it("promotes local credit/profile shims to full local access", () => {
    process.env.ALGOPHONY_STUDIO_LOCAL_FULL_ACCESS = "true";
    process.env.ALGOPHONY_STUDIO_LOCAL_CREDITS = "12345";

    const profile = applyLocalFullAccessToProfile({
      plan: "free",
      monthly_credit_limit: 3,
      credits_remaining: 0,
    });

    expect(isLocalFullAccessEnabled()).toBe(true);
    expect(getLocalFullAccessCredits()).toBe(12345);
    expect(profile).toMatchObject({
      plan: "team",
      monthly_credit_limit: 12345,
      credits_remaining: 12345,
    });
  });

  it("can be disabled explicitly for remote runtime checks", () => {
    process.env.ALGOPHONY_STUDIO_LOCAL_FULL_ACCESS = "false";
    process.env.NEXT_PUBLIC_APP_URL = "https://algophony-studio.example";

    const profile = {
      plan: "free",
      monthly_credit_limit: 3,
      credits_remaining: 0,
    };

    expect(isLocalFullAccessEnabled()).toBe(false);
    expect(applyLocalFullAccessToProfile(profile)).toBe(profile);
    expect(applyLocalFullAccessToEntitlements(["prompt_browser"])).toEqual(["prompt_browser"]);
  });
});
