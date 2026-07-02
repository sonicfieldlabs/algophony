import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchSfxWithRetry } from "./generate-with-retry";

describe("fetchSfxWithRetry", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.useRealTimers();
  });

  it("returns the response immediately on 2xx, no retry", async () => {
    const ok = new Response(JSON.stringify({ audioUrl: "/x.mp3" }), { status: 200 });
    const spy = vi.fn().mockResolvedValue(ok);
    globalThis.fetch = spy as unknown as typeof fetch;

    const res = await fetchSfxWithRetry({ text: "hi" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("retries exactly once on 429 and honors Retry-After (seconds)", async () => {
    const r429 = new Response("", { status: 429, headers: { "Retry-After": "2" } });
    const r200 = new Response("", { status: 200 });
    const spy = vi.fn().mockResolvedValueOnce(r429).mockResolvedValueOnce(r200);
    globalThis.fetch = spy as unknown as typeof fetch;

    const promise = fetchSfxWithRetry({ text: "hi" });
    // Honors the 2 second Retry-After.
    await vi.advanceTimersByTimeAsync(2000);
    const res = await promise;

    expect(spy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("clamps Retry-After to maxBackoffMs", async () => {
    const r429 = new Response("", { status: 429, headers: { "Retry-After": "9999" } });
    const r200 = new Response("", { status: 200 });
    const spy = vi.fn().mockResolvedValueOnce(r429).mockResolvedValueOnce(r200);
    globalThis.fetch = spy as unknown as typeof fetch;

    const promise = fetchSfxWithRetry({ text: "hi" }, { maxBackoffMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(spy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("falls back to fallbackDelayMs when Retry-After is missing", async () => {
    const r429 = new Response("", { status: 429 });
    const r200 = new Response("", { status: 200 });
    const spy = vi.fn().mockResolvedValueOnce(r429).mockResolvedValueOnce(r200);
    globalThis.fetch = spy as unknown as typeof fetch;

    const promise = fetchSfxWithRetry({ text: "hi" }, { fallbackDelayMs: 750 });
    await vi.advanceTimersByTimeAsync(750);
    const res = await promise;

    expect(spy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("returns the second 429 verbatim — only one retry", async () => {
    const r429a = new Response("", { status: 429, headers: { "Retry-After": "1" } });
    const r429b = new Response("", { status: 429 });
    const spy = vi.fn().mockResolvedValueOnce(r429a).mockResolvedValueOnce(r429b);
    globalThis.fetch = spy as unknown as typeof fetch;

    const promise = fetchSfxWithRetry({ text: "hi" });
    await vi.advanceTimersByTimeAsync(1000);
    const res = await promise;

    expect(spy).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(429);
  });
});
