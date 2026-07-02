"use client";

import { useEffect } from "react";

/**
 * Run `fn` (which receives an AbortSignal) when `deps` change.
 * On the next change or on unmount the in-flight signal is aborted so
 * stale callbacks can't call setState on an unmounted component or commit
 * out-of-order results.
 *
 * The callback should pass the signal into its fetch(s) and bail out of
 * setState work if `signal.aborted` after each await resolves.
 *
 * @example
 * useAbortableFetch(async (signal) => {
 *   try {
 *     const r = await fetch("/api/x", { signal });
 *     const data = await r.json();
 *     if (!signal.aborted) setData(data);
 *   } catch (err) {
 *     if ((err as Error).name !== "AbortError") setError(err);
 *   }
 * }, [filter]);
 *
 * Note: `fn` is treated as paired with `deps` — only variables listed in
 * `deps` should be referenced by `fn`. Anything else may be captured stale.
 */
export function useAbortableFetch(
  fn: (signal: AbortSignal) => void | Promise<void>,
  deps: React.DependencyList
): void {
  useEffect(() => {
    const controller = new AbortController();
    void fn(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
