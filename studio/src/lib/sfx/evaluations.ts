/**
 * Algophony Studio — Evaluation Tags & Prompt Guidance
 *
 * Typed evaluation tags and mapping logic from evaluation outcomes
 * to future prompt constraints.
 */

/** All evaluation tags available in the UI */
export const EVALUATION_TAGS = [
  "too musical",
  "too synthetic",
  "too noisy",
  "too clean",
  "too reverberant",
  "not enough body",
  "wrong material",
  "wrong perspective",
  "wrong duration",
  "wrong action",
  // Prompt autopsy tags
  "too busy",
  "too long",
  "too short",
  "not loopable",
  "not realistic",
  "contains unwanted voice",
  "wrong emotional tone",
  "good texture",
  "good timing",
  "good realism",
  "good layer",
  "good loop",
  // Foley-specific positive
  "good sync layer",
  "good contact",
  "good material detail",
  "good weight",
  "good transient",
  "good round-robin candidate",
  "good isolated Foley",
  // Foley-specific negative
  "too ambient",
  "too wet",
  "too dry",
  "too heavy",
  "too light",
  "wrong surface",
  "too much room",
  "too exaggerated",
  "not isolated enough",
  "bad for sync",
  // Human Lab-specific positive
  "good performance",
  "good pain reaction",
  "good crowd bed",
  "good chant",
  "good breath",
  "good animation cue",
  "good combat layer",
  "good background texture",
  // Human Lab-specific negative
  "too verbal",
  "too artificial",
  "too dramatic",
  "too cartoonish",
  "too close",
  "too distant",
] as const;

export type EvaluationTag = (typeof EVALUATION_TAGS)[number];

/** Positive tags that mark a card as reusable */
export const POSITIVE_TAGS: readonly EvaluationTag[] = [
  "good texture",
  "good timing",
  "good realism",
  "good layer",
  "good loop",
  "good sync layer",
  "good contact",
  "good material detail",
  "good weight",
  "good transient",
  "good round-robin candidate",
  "good isolated Foley",
  "good performance",
  "good pain reaction",
  "good crowd bed",
  "good chant",
  "good breath",
  "good animation cue",
  "good combat layer",
  "good background texture",
];

/** Negative tags that generate future exclusion guidance */
export const NEGATIVE_TAGS: readonly EvaluationTag[] = [
  "too musical",
  "too synthetic",
  "too noisy",
  "too clean",
  "too reverberant",
  "not enough body",
  "wrong material",
  "wrong perspective",
  "wrong duration",
  "wrong action",
  "too busy",
  "too long",
  "too short",
  "not loopable",
  "not realistic",
  "contains unwanted voice",
  "wrong emotional tone",
  "too ambient",
  "too wet",
  "too dry",
  "too heavy",
  "too light",
  "wrong surface",
  "too much room",
  "too exaggerated",
  "not isolated enough",
  "bad for sync",
  "too verbal",
  "too artificial",
  "too dramatic",
  "too cartoonish",
  "too close",
  "too distant",
];

/**
 * Map a negative evaluation tag to exclusion constraints
 * that should be applied to future prompts.
 */
export function tagToExclusionGuidance(tag: EvaluationTag): string[] {
  switch (tag) {
    case "too musical":
      return ["no music", "no melody", "no tonal progression"];
    case "too synthetic":
      return ["no synthetic artifacts", "organic texture"];
    case "too noisy":
      return ["clean recording", "no excessive noise"];
    case "too clean":
      return ["natural room tone", "realistic ambient noise"];
    case "too reverberant":
      return ["no excessive reverb", "dry recording", "close microphone"];
    case "not enough body":
      return ["full-bodied sound", "rich low-mid frequencies"];
    case "wrong material":
      return []; // Requires user to specify correct material
    case "wrong perspective":
      return []; // Requires user to choose perspective
    case "wrong duration":
      return []; // Requires user to adjust duration
    case "wrong action":
      return []; // Requires user to specify correct action
    case "too busy":
      return ["simple", "minimal layers", "sparse", "no complex layering"];
    case "too long":
      return ["shorter", "concise", "tight"];
    case "too short":
      return ["longer", "extended", "sustained"];
    case "not loopable":
      return ["seamless loop", "loop-ready", "no transient at loop point"];
    case "not realistic":
      return ["realistic", "natural", "recorded quality", "no synthetic artifacts"];
    case "contains unwanted voice":
      return ["no voice", "no speech", "no human vocalization", "no dialogue"];
    case "wrong emotional tone":
      return []; // Requires user to specify desired tone
    // Foley-specific
    case "too ambient":
      return ["isolated Foley layer", "no ambience bed", "dry close mic"];
    case "too wet":
      return ["dry surface", "no water contact"];
    case "too dry":
      return ["subtle moisture", "natural surface interaction"];
    case "too heavy":
      return ["lighter contact", "reduced impact weight"];
    case "too light":
      return ["heavier contact", "more weight and body"];
    case "wrong surface":
      return []; // Requires user to specify correct surface
    case "too much room":
      return ["tight booth", "close mic", "no room reverb"];
    case "too exaggerated":
      return ["realistic production sound", "natural gesture"];
    case "not isolated enough":
      return ["isolated Foley layer", "no ambience", "no room tone"];
    case "bad for sync":
      return ["tight sync", "shorter, more punctual gesture"];
    // Human Lab-specific
    case "too verbal":
      return ["no clear words", "non-verbal vocalization"];
    case "too artificial":
      return ["more human", "less synthetic", "natural breath"];
    case "too dramatic":
      return ["subtle", "restrained", "naturalistic"];
    case "too cartoonish":
      return ["realistic", "grounded", "no exaggeration"];
    case "too close":
      return ["medium distance", "background layer"];
    case "too distant":
      return ["close mic", "foreground layer", "more presence"];
    default:
      return [];
  }
}

/**
 * Check if a tag indicates the prompt card should be marked as reusable.
 */
export function isPositiveTag(tag: string): boolean {
  return POSITIVE_TAGS.includes(tag as EvaluationTag);
}

/**
 * Tags that require user input to resolve (not auto-correctable).
 */
export function requiresUserInput(tag: EvaluationTag): boolean {
  return ["wrong material", "wrong perspective", "wrong duration", "wrong action", "wrong emotional tone"].includes(tag);
}

/** Perspective options prompted when "wrong perspective" is flagged */
export const PERSPECTIVE_OPTIONS = [
  "close-mic",
  "medium distance",
  "distant",
  "offscreen",
  "interior",
  "exterior",
] as const;

/**
 * Aggregate exclusion guidance from multiple evaluation tags.
 * Deduplicates and returns unique constraints.
 */
export function aggregateGuidance(tags: EvaluationTag[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    for (const constraint of tagToExclusionGuidance(tag)) {
      const normalized = constraint.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(constraint);
      }
    }
  }

  return result;
}
