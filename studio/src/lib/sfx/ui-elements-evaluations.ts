/**
 * Algophony Studio — UI Elements Evaluation Tags
 *
 * Specialized evaluation tags for UI sounds with
 * prompt-correction feedback mappings.
 */

/** All UI-specific evaluation tags */
export const UI_EVALUATION_TAGS = [
  // Negative
  "too loud",
  "too sharp",
  "too long",
  "too musical",
  "too generic",
  "too game-like",
  "too serious",
  "too playful",
  // Positive
  "good tactile feel",
  "good brand fit",
  "good repeated-use sound",
  "good transition",
  "good notification",
  "good error cue",
  "good premium feel",
] as const;

export type UIEvaluationTag = (typeof UI_EVALUATION_TAGS)[number];

export const UI_POSITIVE_TAGS: readonly UIEvaluationTag[] = [
  "good tactile feel",
  "good brand fit",
  "good repeated-use sound",
  "good transition",
  "good notification",
  "good error cue",
  "good premium feel",
];

export const UI_NEGATIVE_TAGS: readonly UIEvaluationTag[] = [
  "too loud",
  "too sharp",
  "too long",
  "too musical",
  "too generic",
  "too game-like",
  "too serious",
  "too playful",
];

/**
 * Map a negative UI evaluation tag to exclusion constraints
 * that should be auto-added to future prompts.
 */
export function uiTagToExclusionGuidance(tag: UIEvaluationTag): string[] {
  switch (tag) {
    case "too loud":
      return ["quieter, subtle, reduced volume"];
    case "too sharp":
      return ["soft transient, no piercing high frequencies, rounded attack"];
    case "too long":
      return ["shorter duration, tighter sound"];
    case "too musical":
      return ["non-melodic, no tune, no musical phrase, no tonal progression"];
    case "too generic":
      return ["more distinctive, unique character, less stock"];
    case "too game-like":
      return ["non-game, professional interface feel, no retro game cue"];
    case "too serious":
      return ["slightly warmer, friendlier, less clinical"];
    case "too playful":
      return ["more restrained, professional, less cartoon"];
    default:
      return [];
  }
}

/** Check if a tag is positive */
export function isUIPositiveTag(tag: string): boolean {
  return UI_POSITIVE_TAGS.includes(tag as UIEvaluationTag);
}

/**
 * Aggregate exclusion guidance from multiple UI evaluation tags.
 * Deduplicates and returns unique constraints.
 */
export function aggregateUIGuidance(tags: UIEvaluationTag[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    for (const constraint of uiTagToExclusionGuidance(tag)) {
      const normalized = constraint.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(constraint);
      }
    }
  }
  return result;
}
