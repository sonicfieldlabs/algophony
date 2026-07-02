/**
 * Algophony Studio — UI Elements Prompt Composer
 *
 * Converts fader positions, element properties, and engine mode
 * into ElevenLabs-ready prompt text. Faders map to prompt language
 * fragments — they do NOT map to native API parameters.
 *
 * Composition order:
 * [action context] [element descriptor] [sonic qualities from faders]
 * [duration/use case]. [exclusion constraints].
 */

import type {
  UIElementType,
  UIActionType,
  EngineMode,
  ElementSize,
  ElementShape,
  ElementWeight,
  ElementBehavior,
} from "./ui-elements-taxonomy";
import {
  ELEMENT_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  resolveSafetyConstraints,
  getDurationRange,
} from "./ui-elements-taxonomy";

// ── Fader Definitions ──────────────────────────────────────────

export interface FaderDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  lowLabel: string;
  highLabel: string;
  group: "essential" | "advanced";
}

export const FADER_DEFINITIONS: FaderDefinition[] = [
  // Essential faders
  { id: "duration", label: "Duration", min: 0.1, max: 5, step: 0.1, defaultValue: 0.5, lowLabel: "0.1s", highLabel: "5s", group: "essential" },
  { id: "prompt_influence", label: "Prompt Influence", min: 0, max: 1, step: 0.05, defaultValue: 0.3, lowLabel: "Low", highLabel: "High", group: "essential" },
  { id: "tactility", label: "Tactility", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Soft", highLabel: "Hard", group: "essential" },
  { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Dark", highLabel: "Bright", group: "essential" },
  { id: "weight", label: "Weight", min: 0, max: 1, step: 0.05, defaultValue: 0.3, lowLabel: "Light", highLabel: "Heavy", group: "essential" },
  { id: "urgency", label: "Urgency", min: 0, max: 1, step: 0.05, defaultValue: 0.3, lowLabel: "Calm", highLabel: "Urgent", group: "essential" },
  { id: "brand_presence", label: "Brand Presence", min: 0, max: 1, step: 0.05, defaultValue: 0.2, lowLabel: "Invisible", highLabel: "Iconic", group: "essential" },
  { id: "realism", label: "Realism", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Abstract", highLabel: "Physical", group: "essential" },
  { id: "digital_character", label: "Digital Character", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Organic", highLabel: "Synthetic", group: "essential" },
  { id: "fatigue_risk", label: "Fatigue Risk", min: 0, max: 1, step: 0.05, defaultValue: 0.2, lowLabel: "Subtle", highLabel: "Attention", group: "essential" },
  // Advanced faders
  { id: "transient_sharpness", label: "Transient Sharpness", min: 0, max: 1, step: 0.05, defaultValue: 0.4, lowLabel: "Rounded", highLabel: "Sharp", group: "advanced" },
  { id: "tail_length", label: "Tail Length", min: 0, max: 1, step: 0.05, defaultValue: 0.3, lowLabel: "Tight", highLabel: "Long tail", group: "advanced" },
  { id: "pitch_height", label: "Pitch Height", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Low", highLabel: "High", group: "advanced" },
  { id: "noise_amount", label: "Noise Amount", min: 0, max: 1, step: 0.05, defaultValue: 0.2, lowLabel: "Clean", highLabel: "Noisy", group: "advanced" },
  { id: "tonal_amount", label: "Tonal Amount", min: 0, max: 1, step: 0.05, defaultValue: 0.3, lowLabel: "Atonal", highLabel: "Tonal", group: "advanced" },
  { id: "click_body", label: "Click Body", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Thin", highLabel: "Full body", group: "advanced" },
  { id: "reverb_space", label: "Reverb Space", min: 0, max: 1, step: 0.05, defaultValue: 0.1, lowLabel: "Dry", highLabel: "Spacious", group: "advanced" },
  { id: "stereo_width", label: "Stereo Width", min: 0, max: 1, step: 0.05, defaultValue: 0.3, lowLabel: "Mono", highLabel: "Wide", group: "advanced" },
  { id: "glitch_amount", label: "Glitch Amount", min: 0, max: 1, step: 0.05, defaultValue: 0, lowLabel: "Clean", highLabel: "Glitchy", group: "advanced" },
  { id: "material_density", label: "Material Density", min: 0, max: 1, step: 0.05, defaultValue: 0.5, lowLabel: "Airy", highLabel: "Dense", group: "advanced" },
];

export function getDefaultFaderState(): Record<string, number> {
  const state: Record<string, number> = {};
  for (const fader of FADER_DEFINITIONS) {
    state[fader.id] = fader.defaultValue;
  }
  return state;
}

// ── Fader → Prompt Language Mapping ────────────────────────────

type FaderMapper = (value: number) => string | null;

/**
 * Each mapper returns a prompt fragment for a fader value.
 * Returns null if the value is at a neutral position (skip it).
 */
const FADER_MAPPERS: Record<string, FaderMapper> = {
  tactility: (v) => {
    if (v < 0.25) return "very soft, gentle, cushioned";
    if (v < 0.4) return "soft";
    if (v > 0.8) return "hard, sharp click, firm press, strong tactile impact";
    if (v > 0.6) return "firm, tactile";
    return null; // neutral
  },
  brightness: (v) => {
    if (v < 0.2) return "dark, muted, low-frequency";
    if (v < 0.35) return "warm, subdued";
    if (v > 0.85) return "bright, clean, airy, high-frequency but not piercing";
    if (v > 0.65) return "bright, clean";
    return null;
  },
  weight: (v) => {
    if (v < 0.2) return "light, airy, weightless";
    if (v < 0.35) return "light";
    if (v > 0.8) return "solid low-mid body, physical press, heavy tactile impact";
    if (v > 0.6) return "medium-heavy, solid feel";
    return null;
  },
  urgency: (v) => {
    if (v < 0.2) return "calm, relaxed, ambient";
    if (v > 0.8) return "urgent, attention-demanding, immediate";
    if (v > 0.6) return "noticeable, clear";
    return null;
  },
  brand_presence: (v) => {
    if (v < 0.15) return "invisible, functional, no personality";
    if (v > 0.8) return "iconic, memorable, signature identity cue";
    if (v > 0.5) return "distinctive, branded";
    return null;
  },
  realism: (v) => {
    if (v < 0.2) return "abstract, non-literal";
    if (v > 0.8) return "physical, real-world material, realistic";
    if (v > 0.6) return "natural, grounded";
    return null;
  },
  digital_character: (v) => {
    if (v < 0.2) return "organic, natural, warm";
    if (v > 0.8) return "synthetic, electronic, digital, processed";
    if (v > 0.6) return "slightly digital";
    return null;
  },
  fatigue_risk: (v) => {
    if (v < 0.3) return "subtle, low-fatigue, suitable for repeated use";
    if (v > 0.8) return "attention-grabbing, noticeable";
    return null;
  },
  transient_sharpness: (v) => {
    if (v < 0.2) return "rounded transient, soft attack";
    if (v > 0.8) return "sharp transient, crisp attack";
    return null;
  },
  tail_length: (v) => {
    if (v < 0.2) return "very tight, no tail";
    if (v > 0.7) return "gentle tail, slight decay";
    return null;
  },
  pitch_height: (v) => {
    if (v < 0.2) return "low-pitched";
    if (v > 0.8) return "high-pitched but not piercing";
    return null;
  },
  noise_amount: (v) => {
    if (v < 0.1) return "clean, no noise";
    if (v > 0.7) return "noisy texture, textured";
    return null;
  },
  tonal_amount: (v) => {
    if (v < 0.15) return "atonal, non-melodic";
    if (v > 0.7) return "slightly tonal, with pitch";
    return null;
  },
  click_body: (v) => {
    if (v < 0.2) return "thin, minimal body";
    if (v > 0.8) return "full-bodied, rich";
    return null;
  },
  reverb_space: (v) => {
    if (v < 0.15) return "dry, close, no reverb";
    if (v > 0.6) return "with room space";
    return null;
  },
  stereo_width: (v) => {
    if (v > 0.7) return "wide stereo";
    return null;
  },
  glitch_amount: (v) => {
    if (v > 0.5) return "glitchy, digital artifacts, fragmented";
    if (v > 0.25) return "slight glitch texture";
    return null;
  },
  material_density: (v) => {
    if (v < 0.2) return "airy, sparse";
    if (v > 0.8) return "dense, layered, complex";
    return null;
  },
};

/** Convert all fader values to prompt language fragments */
export function fadersToPromptFragments(
  faders: Record<string, number>
): string[] {
  const fragments: string[] = [];
  for (const [id, mapper] of Object.entries(FADER_MAPPERS)) {
    const value = faders[id];
    if (value == null) continue;
    const fragment = mapper(value);
    if (fragment) fragments.push(fragment);
  }
  return fragments;
}

// ── Element Properties → Prompt Fragments ──────────────────────

export function elementPropertiesToFragments(props: {
  size?: ElementSize;
  shape?: ElementShape;
  weight?: ElementWeight;
  behavior?: ElementBehavior;
}): string[] {
  const fragments: string[] = [];
  if (props.size) fragments.push(`${props.size}-sized`);
  if (props.shape) fragments.push(props.shape);
  if (props.weight) fragments.push(`${props.weight} weight`);
  if (props.behavior) fragments.push(`${props.behavior} behavior`);
  return fragments;
}

// ── Prompt Templates ───────────────────────────────────────────

const PROMPT_TEMPLATES: Partial<Record<UIElementType, string>> = {
  button: "A short tactile UI button {action} for a {properties} button in a {interface_type}. {sonic_qualities}. {duration_text}. {exclusions}.",
  toggle: "A short UI toggle-{action_detail} sound, subtle and satisfying, with a tiny {direction} motion and soft {feedback}. {sonic_qualities}. {duration_text}. {exclusions}.",
  slider: "A UI slider {action} sound, smooth continuous movement feel. {sonic_qualities}. {duration_text}. {exclusions}.",
  menu: "A UI menu {action} sound. {sonic_qualities}. {duration_text}. {exclusions}.",
  modal: "A UI modal {action} sound, smooth layer transition. {sonic_qualities}. {duration_text}. {exclusions}.",
  tab: "A UI tab {action} sound, quick selection. {sonic_qualities}. {duration_text}. {exclusions}.",
  card: "A UI card {action} sound. {sonic_qualities}. {duration_text}. {exclusions}.",
  notification: "A {action_detail} notification sound for a {interface_type}. {sonic_qualities}. {duration_text}. {exclusions}.",
  dialog: "A UI dialog {action} sound. {sonic_qualities}. {duration_text}. {exclusions}.",
  transition: "A quick UI transition {action_detail} for moving between screens. {sonic_qualities}. {duration_text}. {exclusions}.",
  sonic_logo: "A very short sonic logo for a {interface_type}: {brand_traits}. Memorable, minimal, {duration_text}, clean identity cue. {exclusions}.",
};

// ── Main Compose Function ──────────────────────────────────────

export interface UIPromptInput {
  elementType: UIElementType;
  actionType: UIActionType;
  engineMode: EngineMode;
  interfaceType?: string;
  brandStyle?: string;
  size?: ElementSize;
  shape?: ElementShape;
  weightProp?: ElementWeight;
  behavior?: ElementBehavior;
  faders: Record<string, number>;
  customExclusions?: string[];
  voiceText?: string;
}

export interface UIPromptOutput {
  promptText: string;
  exclusions: string[];
  durationSeconds: number;
  promptInfluence: number;
  engineMode: EngineMode;
  apiRoute: string;
  creditCost: number;
}

/**
 * Compose a complete UI Elements prompt from controls.
 */
export function composeUIPrompt(input: UIPromptInput): UIPromptOutput {
  const {
    elementType,
    actionType,
    engineMode,
    interfaceType,
    brandStyle,
    faders,
    customExclusions,
    voiceText,
  } = input;

  // For voice / dialogue modes, the prompt is just the spoken text
  if (
    (engineMode === "text_to_speech" || engineMode === "text_to_dialogue") &&
    voiceText
  ) {
    return {
      promptText: voiceText,
      exclusions: [],
      durationSeconds: faders.duration ?? 2,
      promptInfluence: faders.prompt_influence ?? 0.3,
      engineMode,
      apiRoute: engineMode === "text_to_speech"
        ? "/api/elevenlabs/text-to-speech-layer"
        : "/api/elevenlabs/text-to-dialogue-layer",
      creditCost: engineMode === "text_to_dialogue" ? 2 : 1,
    };
  }

  // Resolve duration from fader or action default
  const durationRange = getDurationRange(actionType);
  const duration = faders.duration ?? durationRange.default;
  const durationText = `${duration} seconds`;

  // Resolve sonic qualities from faders
  const sonicFragments = fadersToPromptFragments(faders);
  const sonicQualities = sonicFragments.length > 0
    ? sonicFragments.join(", ")
    : "clean, minimal";

  // Resolve element property fragments
  const propFragments = elementPropertiesToFragments({
    size: input.size,
    shape: input.shape,
    weight: input.weightProp,
    behavior: input.behavior,
  });
  const properties = propFragments.length > 0
    ? propFragments.join(" ")
    : "";

  // Resolve exclusions (auto-safety + custom)
  const safetyExclusions = resolveSafetyConstraints(actionType);
  const allExclusions = [
    ...safetyExclusions,
    ...(customExclusions ?? []),
  ];
  const uniqueExclusions = [...new Set(allExclusions.map((e) => e.toLowerCase().trim()))];
  const exclusionText = uniqueExclusions.length > 0
    ? uniqueExclusions.join(", ")
    : "";

  // Build the prompt from the template
  const template = PROMPT_TEMPLATES[elementType] ?? "A UI {action} sound. {sonic_qualities}. {duration_text}. {exclusions}.";

  // Determine action detail text
  const actionDetail = actionType === "toggle_on" ? "on"
    : actionType === "toggle_off" ? "off"
    : ACTION_TYPE_LABELS[actionType].toLowerCase();
  const direction = actionType === "toggle_on" ? "upward" : "downward";
  const feedback = actionType === "toggle_on" ? "confirmation" : "release";

  const brandTraits = [brandStyle, interfaceType].filter(Boolean).join(", ") || "modern";

  let promptText = template
    .replace("{action}", ACTION_TYPE_LABELS[actionType].toLowerCase())
    .replace("{action_detail}", actionDetail)
    .replace("{properties}", properties || ELEMENT_TYPE_LABELS[elementType].toLowerCase())
    .replace("{interface_type}", interfaceType || "modern application")
    .replace("{sonic_qualities}", sonicQualities)
    .replace("{duration_text}", durationText)
    .replace("{exclusions}", exclusionText)
    .replace("{direction}", direction)
    .replace("{feedback}", feedback)
    .replace("{brand_traits}", brandTraits)
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();

  // Ensure trailing period
  if (promptText && !promptText.endsWith(".")) {
    promptText += ".";
  }

  // Determine API route
  let apiRoute = "/api/elevenlabs/generate-sfx";
  let creditCost = 1;
  if (engineMode === "music_motif") {
    apiRoute = "/api/elevenlabs/music-compose";
    creditCost = 2;
  }

  return {
    promptText,
    exclusions: uniqueExclusions,
    durationSeconds: duration,
    promptInfluence: faders.prompt_influence ?? 0.3,
    engineMode,
    apiRoute,
    creditCost,
  };
}
