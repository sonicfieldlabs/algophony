/**
 * Algophony Studio — Layer Compatibility Warnings
 *
 * Analyzes prompts for potential layering, masking, and
 * implementation problems. Suggests corrections.
 *
 * Placement: Generate page (inline below prompt)
 */

// ── Warning Types ────────────────────────────────────────────

export type WarningSeverity = "info" | "warning" | "error";

export interface LayerWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  description: string;
  suggestions: WarningSuggestion[];
}

export interface WarningPatch {
  duration?: number;
  loop?: boolean;
  promptInfluence?: number;
  addExclusions?: string[];
}

export interface WarningSuggestion {
  label: string;
  action: "add_exclusion" | "reduce_duration" | "toggle_loop" | "split_layer" | "change_role";
  value: string;
  /**
   * Structured patch the consumer can apply with one click.
   * Present where the suggestion maps cleanly to a state mutation; absent for
   * explanatory suggestions like "Split into layers" where no single patch
   * fully resolves the warning.
   */
  patch?: WarningPatch;
}

// ── Detection Rules ──────────────────────────────────────────

interface DetectionRule {
  id: string;
  test: (ctx: PromptContext) => boolean;
  severity: WarningSeverity;
  title: string;
  /**
   * Description can be a static string or a function of the prompt context.
   * Use the function form when the message includes runtime values
   * (current duration, etc.) — string templates with `${0}` do NOT interpolate
   * and were a previous source of "At 0s, …" bugs.
   */
  description: string | ((ctx: PromptContext) => string);
  suggestions: WarningSuggestion[];
}

interface PromptContext {
  text: string;
  lower: string;
  words: string[];
  duration: number;
  loop: boolean;
  promptInfluence: number;
  exclusions: string[];
  category: string;
}

const RULES: DetectionRule[] = [
  // ── Density / Complexity ──
  {
    id: "too_many_events",
    test: (ctx) => {
      const eventWords = ["and", "with", "plus", "also", "followed by", "then"];
      const count = eventWords.reduce((n, w) => n + (ctx.lower.split(w).length - 1), 0);
      return count >= 3;
    },
    severity: "warning",
    title: "Too many events in one prompt",
    description: "This prompt describes multiple simultaneous or sequential events. The AI may produce a cluttered, unfocused result.",
    suggestions: [
      { label: "Split into layers", action: "split_layer", value: "Split each event into a separate generation" },
      { label: "Add 'isolated'", action: "add_exclusion", value: "isolated, single event", patch: { addExclusions: ["isolated, single event"] } },
    ],
  },
  // ── Ambience vs Speech ──
  {
    id: "ambience_speech_clash",
    test: (ctx) => {
      const isAmbience = ["ambience", "ambient", "atmosphere", "background", "room tone", "bed"].some((w) => ctx.lower.includes(w));
      const hasSpeechRange = !ctx.exclusions.some((e) => e.includes("speech"));
      const hasMidFreq = ["voice", "crowd", "chatter", "talk", "conversation"].some((w) => ctx.lower.includes(w));
      return isAmbience && hasSpeechRange && hasMidFreq;
    },
    severity: "warning",
    title: "Ambience may compete with dialogue",
    description: "This ambience contains mid-range elements (voices, crowd) that could mask dialogue in the 300–3000 Hz speech band.",
    suggestions: [
      { label: "Add speech-friendly exclusion", action: "add_exclusion", value: "no clear speech, no intelligible voices", patch: { addExclusions: ["no clear speech", "no intelligible voices"] } },
      { label: "Set as background layer", action: "change_role", value: "behind_dialogue" },
    ],
  },
  // ── UI Too Long ──
  {
    id: "ui_too_long",
    test: (ctx) => {
      const isUI = ["ui", "button", "click", "tap", "toggle", "notification", "interface"].some((w) => ctx.lower.includes(w));
      return isUI && ctx.duration > 2;
    },
    severity: "warning",
    title: "UI sound may be too long for repeated use",
    description: (ctx) =>
      `At ${ctx.duration}s, this UI sound will cause fatigue when triggered frequently. Most UI interactions need < 0.5s.`,
    suggestions: [
      { label: "Reduce to 0.5s", action: "reduce_duration", value: "0.5", patch: { duration: 0.5 } },
      { label: "Add 'short, instant onset'", action: "add_exclusion", value: "short, instant onset, clean transient", patch: { addExclusions: ["short, instant onset", "clean transient"] } },
    ],
  },
  // ── Creature Vocal Bleed ──
  {
    id: "creature_vocal_bleed",
    test: (ctx) => {
      const isCreature = ["creature", "monster", "beast", "alien"].some((w) => ctx.lower.includes(w));
      const noVocalExclusion = !ctx.exclusions.some((e) => e.includes("voice") || e.includes("vocal") || e.includes("speech"));
      return isCreature && noVocalExclusion;
    },
    severity: "info",
    title: "Creature may include unwanted vocal qualities",
    description: "Creature prompts often produce human-like vocal artifacts. Consider adding exclusions.",
    suggestions: [
      { label: "Add 'no human voice'", action: "add_exclusion", value: "no human voice, no speech", patch: { addExclusions: ["no human voice", "no speech"] } },
    ],
  },
  // ── Dense Background ──
  {
    id: "too_dense_background",
    test: (ctx) => {
      const isBackground = ["background", "bed", "layer", "texture", "pad", "drone"].some((w) => ctx.lower.includes(w));
      const denseWords = ["complex", "rich", "thick", "dense", "layered", "busy", "detailed", "intricate"];
      const isDense = denseWords.some((w) => ctx.lower.includes(w));
      return isBackground && isDense;
    },
    severity: "warning",
    title: "Sound may be too dense for a background layer",
    description: "Dense textures compete with foreground elements. Background layers work best when spectrally sparse.",
    suggestions: [
      { label: "Add 'sparse, subtle'", action: "add_exclusion", value: "sparse, subtle, low-density", patch: { addExclusions: ["sparse, subtle", "low-density"] } },
      { label: "Generate as foreground", action: "change_role", value: "cinematic_oneshot" },
    ],
  },
  // ── Mixed Category Clash ──
  {
    id: "mixed_category",
    test: (ctx) => {
      const hasFoley = ["foley", "footstep", "cloth", "prop", "contact"].some((w) => ctx.lower.includes(w));
      const hasCinematic = ["cinematic", "epic", "impact", "boom", "trailer", "dramatic"].some((w) => ctx.lower.includes(w));
      return hasFoley && hasCinematic;
    },
    severity: "error",
    title: "Conflicting categories: Foley + Cinematic",
    description: "This prompt asks for both realistic Foley and cinematic music-like impact. These are fundamentally different aesthetic domains.",
    suggestions: [
      { label: "Generate as Foley only", action: "split_layer", value: "Remove cinematic terms and generate clean Foley" },
      { label: "Generate as cinematic only", action: "split_layer", value: "Remove Foley terms and generate cinematic impact" },
    ],
  },
  // ── Loop + Long Tail ──
  {
    id: "loop_long_tail",
    test: (ctx) => {
      return ctx.loop && ["reverb", "long tail", "hall", "cathedral", "vast space"].some((w) => ctx.lower.includes(w));
    },
    severity: "warning",
    title: "Reverb tail may create loop seam artifacts",
    description: "Long reverb tails make seamless loops difficult. The crossfade point becomes audible.",
    suggestions: [
      { label: "Add 'dry, no reverb'", action: "add_exclusion", value: "dry, no reverb, no room tail", patch: { addExclusions: ["dry, no reverb", "no room tail"] } },
      { label: "Disable loop", action: "toggle_loop", value: "false", patch: { loop: false } },
    ],
  },
  // ── High PI + Vague Prompt ──
  {
    id: "vague_high_influence",
    test: (ctx) => {
      return ctx.promptInfluence >= 0.7 && ctx.words.length < 6;
    },
    severity: "info",
    title: "High influence with short prompt",
    description: "High prompt_influence with few words gives the AI little to work with. Consider adding more descriptive terms or lowering influence for creative exploration.",
    suggestions: [
      { label: "Lower influence to 0.4", action: "change_role", value: "random_container", patch: { promptInfluence: 0.4 } },
    ],
  },
  // ── Ambience Too Short ──
  {
    id: "ambience_too_short",
    test: (ctx) => {
      const isAmbience = ["ambience", "ambient", "atmosphere", "room tone", "environment"].some((w) => ctx.lower.includes(w));
      return isAmbience && ctx.duration < 10 && ctx.loop === false;
    },
    severity: "warning",
    title: "Ambience too short for practical use",
    description: "Ambiences under 10 seconds are difficult to use without obvious repetition. Enable looping or increase duration.",
    suggestions: [
      { label: "Increase to 30s", action: "reduce_duration", value: "30", patch: { duration: 30 } },
      { label: "Enable loop", action: "toggle_loop", value: "true", patch: { loop: true } },
    ],
  },
  // ── Music Request in SFX ──
  {
    id: "music_in_sfx",
    test: (ctx) => {
      const musicalTerms = ["melody", "chord", "harmony", "song", "musical", "tune", "chorus", "verse"];
      return musicalTerms.some((w) => ctx.lower.includes(w)) && !ctx.exclusions.some((e) => e.includes("music"));
    },
    severity: "error",
    title: "Musical content requested in SFX generator",
    description: "The SFX generator is optimized for sound effects, not music. Musical prompts typically produce poor results.",
    suggestions: [
      { label: "Add 'no music, no melody'", action: "add_exclusion", value: "no music, no melody, no harmonic content", patch: { addExclusions: ["no music", "no melody", "no harmonic content"] } },
    ],
  },
];

// ── Analyzer ─────────────────────────────────────────────────

/**
 * Analyze a prompt for layer compatibility warnings.
 */
export function analyzeLayerCompatibility(
  prompt: string,
  duration: number,
  loop: boolean,
  promptInfluence: number,
  exclusions: string[],
  category: string = ""
): LayerWarning[] {
  const lower = prompt.toLowerCase();
  const words = lower.split(/[\s,]+/).filter(Boolean);

  const ctx: PromptContext = {
    text: prompt,
    lower,
    words,
    duration,
    loop,
    promptInfluence,
    exclusions,
    category,
  };

  const warnings: LayerWarning[] = [];

  for (const rule of RULES) {
    if (rule.test(ctx)) {
      const desc =
        typeof rule.description === "function" ? rule.description(ctx) : rule.description;
      warnings.push({
        id: rule.id,
        severity: rule.severity,
        title: rule.title,
        description: desc,
        suggestions: rule.suggestions,
      });
    }
  }

  return warnings;
}
