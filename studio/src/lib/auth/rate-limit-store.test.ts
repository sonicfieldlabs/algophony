import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRateLimitStoreModule() {
  vi.resetModules();
  return import("./rate-limit-store");
}

describe("getRateLimitStore", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the local in-memory store in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { getRateLimitStore } = await loadRateLimitStoreModule();

    const store = getRateLimitStore();
    await expect(store.incr("user:one", 60_000)).resolves.toMatchObject({
      count: 1,
    });
  });

  it("increments counters within the same window", async () => {
    const { getRateLimitStore } = await loadRateLimitStoreModule();

    const store = getRateLimitStore();
    await expect(store.incr("user:two", 60_000)).resolves.toMatchObject({ count: 1 });
    await expect(store.incr("user:two", 60_000)).resolves.toMatchObject({ count: 2 });
  });
});
