/**
 * Algophony Studio — Automatic sound naming
 *
 * Turns a free-form prompt into deterministic, library-friendly filenames
 * and short display labels.
 *
 *   buildAutoName({ prompt: "A creature crawls through a flooded subway tunnel" })
 *   // → {
 *   //     longName:  "sfx_creature_crawl_flooded_subway_tunnel_a1f3",
 *   //     shortName: "creature_crawl_flooded",
 *   //     displayName: "A creature crawls through a flooded subway tunnel",
 *   //     keywords:  ["creature", "crawl", "flooded", "subway", "tunnel"],
 *   //     code:      "a1f3"
 *   //   }
 *
 * Both names are snake_case, lowercase, ASCII — safe to use as a filename in
 * any OS or DAW import workflow. The long name includes a category tag and
 * a short hash code so two generations of the same scene don't collide; the
 * short name is what shows up in the library browser / player so listings
 * stay scannable.
 */

const STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "be", "but", "by", "for", "from",
  "in", "into", "is", "it", "no", "not", "of", "on", "or", "over",
  "so", "than", "that", "the", "then", "their", "there", "these",
  "they", "this", "through", "to", "under", "until", "up", "upon",
  "while", "with", "within", "without", "you", "your",
  // sound-prompt-specific filler
  "sound", "audio", "sfx", "effect", "effects", "create", "generate",
  "make", "feel", "feels", "like", "tone", "design",
]);

/** What kind of sound this is — used as a filename prefix. */
export type AutoNameCategory =
  | "sfx" | "creature" | "human" | "foley" | "atmosphere"
  | "vehicle" | "tone" | "ui" | "misc" | "imageref";

/** Convert any string to lowercase ASCII-friendly snake_case. */
export function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

/** Pull the most informative tokens from a prompt — strips stopwords,
 *  keeps order, dedupes, caps total to `max`. */
export function extractKeywords(prompt: string, max = 6): string[] {
  if (!prompt) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of prompt.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || raw.length < 3) continue;
    if (STOPWORDS.has(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= max) break;
  }
  return out;
}

/** Human-facing name from the originating prompt.
 *  Keeps the prompt wording intact, only normalizing whitespace and length. */
export function displayNameFromPrompt(prompt: string, maxChars = 56): string {
  const cleaned = prompt
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

  if (!cleaned) return "";
  if (cleaned.length <= maxChars) return cleaned;

  const clipped = cleaned.slice(0, Math.max(0, maxChars - 3)).trimEnd();
  return `${clipped}...`;
}

/** Stable 4-char hex code derived from a string — used as a take suffix so
 *  re-generating the same prompt produces a recognisably-different code
 *  whenever the input differs in any way (timestamp, take number, etc.). */
export function shortHash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 4);
}

export interface AutoNameInput {
  /** The generation prompt. */
  prompt: string;
  /** Source module — becomes the filename prefix. */
  category?: AutoNameCategory;
  /** Optional take number for variation runs (1-based). */
  takeNumber?: number;
  /** Optional explicit seed so callers can stabilize the hash. */
  seed?: string;
}

export interface AutoNameResult {
  /** Long, library-import-friendly filename without extension.
   *  Includes category prefix + keywords + optional take + hash. */
  longName: string;
  /** Short, human-scannable display label (3 keywords max). */
  shortName: string;
  /** Readable UI title derived directly from the originating prompt. */
  displayName: string;
  /** Tokens used to build the names. */
  keywords: string[];
  /** Hash code suffix (4 hex chars). */
  code: string;
}

export function buildAutoName(input: AutoNameInput): AutoNameResult {
  const category = input.category ?? "sfx";
  const keywords = extractKeywords(input.prompt, 6);
  const code = shortHash(`${input.prompt}|${input.seed ?? ""}|${input.takeNumber ?? ""}`);

  const longParts: string[] = [category];
  if (keywords.length > 0) longParts.push(keywords.join("_"));
  if (input.takeNumber != null) longParts.push(`t${String(input.takeNumber).padStart(2, "0")}`);
  longParts.push(code);
  const longName = toSlug(longParts.join("_"));

  // Short name — first 3 keywords; if we didn't get any usable words, fall
  // back to the category + code so the library still shows something.
  const shortKeywords = keywords.slice(0, 3);
  const shortName = shortKeywords.length > 0
    ? toSlug(shortKeywords.join("_"))
    : `${category}_${code}`;
  const displayName = displayNameFromPrompt(input.prompt) || shortName;

  return { longName, shortName, displayName, keywords, code };
}

/** Convenience: attach the standard .mp3 extension. */
export function autoFilename(input: AutoNameInput, ext = "mp3"): string {
  return `${buildAutoName(input).longName}.${ext}`;
}
