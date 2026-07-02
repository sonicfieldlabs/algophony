import { describe, expect, it } from "vitest";
import {
  getDemoGenerationLimits,
  isDemoUser,
} from "./config";

describe("local-first demo compatibility config", () => {
  it("does not classify local workspace users as demo accounts", () => {
    expect(isDemoUser({ id: "user-1", email: "new@example.com" })).toBe(false);
  });

  it("uses effectively unlimited local generation compatibility limits", () => {
    expect(getDemoGenerationLimits()).toMatchObject({
      total: Number.MAX_SAFE_INTEGER,
      sfx: Number.MAX_SAFE_INTEGER,
      music: Number.MAX_SAFE_INTEGER,
      voice: Number.MAX_SAFE_INTEGER,
      maxBatchSize: Number.MAX_SAFE_INTEGER,
    });
  });
});
