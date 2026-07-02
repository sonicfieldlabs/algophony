/**
 * Algophony Studio — legacy filter helpers
 *
 * Centralizes string-interpolation into legacy `.or()` / `.ilike()` clauses.
 * These clauses are now consumed by the local compatibility query layer.
 */

export function assertUuid(value: string, label = "id"): string {
  if (!value || /[,()]/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

/** Escape characters that have special meaning inside a PostgREST `ilike` pattern. */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Build the `or` clause for "rows owned by this user OR seed rows". */
export function ownOrSeedOr(userId: string): string {
  return `user_id.eq.${encodeURIComponent(assertUuid(userId, "userId"))},is_seed.eq.true`;
}

/** Build a multi-column `or` clause for free-text search across the named columns. */
export function ilikeAnyOr(columns: string[], query: string): string {
  const safe = escapeLikePattern(query.trim());
  if (!safe) return "";
  return columns.map((col) => `${col}.ilike.%${safe}%`).join(",");
}
