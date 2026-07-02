/**
 * Algophony Studio — Implementation-Aware Prompting
 *
 * Adapts prompts based on how the sound will be used in production.
 * Adds constraints for trigger frequency, layering, masking, etc.
 *
 * Placement: Generate page / Stacker
 */

// ── Implementation Roles ─────────────────────────────────────

export type ImplementationRole =
  | "high_frequency_trigger"   // 500+ times/hour
  | "random_container"         // Round-robin playback
  | "ambient_layer"           // Layered with other ambiences
  | "speech_safe"             // Must not mask speech
  | "urgent_not_alarming"     // Warning without panic
  | "behind_dialogue"         // Background layer behind dialogue
  | "ui_feedback"             // Immediate UI response
  | "cinematic_oneshot"       // Single dramatic hit
  | "loop_bed"               // Continuous loop background
  | "transition_element"      // Between scenes/states
  | "foley_sync"             // Sync to on-screen action
  | "music_adjacent"          // Works near music without clashing
  | "custom";

export interface ImplementationRoleDef {
  id: ImplementationRole;
  label: string;
  description: string;
  constraints: PromptConstraint[];
  suggestedSettings: Partial<ImplementationSettings>;
}

export interface PromptConstraint {
  type: "modifier" | "exclusion" | "technical";
  value: string;
  reason: string;
}

export interface ImplementationSettings {
  maxDuration: number;
  minDuration: number;
  loop: boolean;
  promptInfluence: number;
  variationCount: number;
  noRepeat: boolean;
}

// ── Role Definitions ─────────────────────────────────────────

export const IMPLEMENTATION_ROLES: ImplementationRoleDef[] = [
  {
    id: "high_frequency_trigger",
    label: "High-Frequency Trigger",
    description: "Triggered 500+ times per hour (UI clicks, footsteps, weapon hits)",
    constraints: [
      { type: "modifier", value: "low-fatigue", reason: "Repeated playback must not cause ear fatigue" },
      { type: "modifier", value: "short tail", reason: "Quick decay prevents overlap buildup" },
      { type: "modifier", value: "simple", reason: "Complex sounds become annoying on repetition" },
      { type: "exclusion", value: "no piercing frequencies", reason: "High frequencies fatigue quickly" },
      { type: "exclusion", value: "no long reverb", reason: "Reverb accumulates on rapid triggers" },
      { type: "technical", value: "non-musical", reason: "Tonal content creates unwanted patterns when repeated" },
    ],
    suggestedSettings: { maxDuration: 0.5, loop: false, promptInfluence: 0.5, variationCount: 6, noRepeat: true },
  },
  {
    id: "random_container",
    label: "Random Container / Round-Robin",
    description: "Multiple variations for randomized playback with no-repeat",
    constraints: [
      { type: "modifier", value: "variation-friendly", reason: "Each variant must be distinct but family-consistent" },
      { type: "modifier", value: "consistent level", reason: "All variations need matched loudness" },
      { type: "technical", value: "same duration range", reason: "Variants should have similar timing" },
    ],
    suggestedSettings: { promptInfluence: 0.4, variationCount: 8, noRepeat: true },
  },
  {
    id: "ambient_layer",
    label: "Ambient Layer",
    description: "Must layer cleanly with rain, traffic, wind, or other ambiences",
    constraints: [
      { type: "modifier", value: "layer-friendly", reason: "Must blend without spectral clashes" },
      { type: "modifier", value: "even spectral balance", reason: "No dominant frequency bands" },
      { type: "modifier", value: "seamless loop", reason: "Must loop without audible seams" },
      { type: "exclusion", value: "no sharp transients", reason: "Transients draw attention in ambient beds" },
      { type: "exclusion", value: "no dominant frequency peaks", reason: "Peaks clash with other layers" },
    ],
    suggestedSettings: { minDuration: 15, loop: true, promptInfluence: 0.6, variationCount: 2 },
  },
  {
    id: "speech_safe",
    label: "Speech-Safe",
    description: "Must not mask dialogue or speech frequencies (300–3000 Hz)",
    constraints: [
      { type: "modifier", value: "speech-friendly", reason: "Avoids the 300–3000 Hz speech band" },
      { type: "modifier", value: "low-frequency emphasis", reason: "Keep energy below speech range" },
      { type: "modifier", value: "subtle", reason: "Must stay behind speech in mix priority" },
      { type: "exclusion", value: "no mid-range dominance", reason: "Mid-range clashes with speech" },
      { type: "exclusion", value: "no sibilance", reason: "High sibilance masks speech clarity" },
    ],
    suggestedSettings: { promptInfluence: 0.6 },
  },
  {
    id: "urgent_not_alarming",
    label: "Urgent but Not Alarming",
    description: "Warning/alert that communicates urgency without causing panic",
    constraints: [
      { type: "modifier", value: "firm but not harsh", reason: "Must command attention without startling" },
      { type: "modifier", value: "clear onset", reason: "Needs immediate recognition" },
      { type: "modifier", value: "moderate brightness", reason: "Not shrill but not dull" },
      { type: "exclusion", value: "no alarm siren", reason: "Siren triggers panic response" },
      { type: "exclusion", value: "no harsh distortion", reason: "Distortion reads as danger/error" },
      { type: "exclusion", value: "no fast repetition", reason: "Rapid pulses increase anxiety" },
    ],
    suggestedSettings: { maxDuration: 1.5, promptInfluence: 0.7, variationCount: 3 },
  },
  {
    id: "behind_dialogue",
    label: "Behind Dialogue",
    description: "Creature breath, room tone, or texture that sits behind dialogue",
    constraints: [
      { type: "modifier", value: "background layer", reason: "Must sit behind foreground dialogue" },
      { type: "modifier", value: "subtle texture", reason: "Adds atmosphere without competing" },
      { type: "modifier", value: "low dynamic range", reason: "No sudden level changes" },
      { type: "exclusion", value: "no speech-like frequencies", reason: "Would blend with dialogue" },
      { type: "exclusion", value: "no sudden transients", reason: "Transients pull attention from dialogue" },
    ],
    suggestedSettings: { promptInfluence: 0.5, loop: true },
  },
  {
    id: "ui_feedback",
    label: "UI Feedback",
    description: "Immediate, responsive interaction feedback",
    constraints: [
      { type: "modifier", value: "instant onset", reason: "Zero-latency feel for responsiveness" },
      { type: "modifier", value: "clean transient", reason: "Sharp attack for tactile feedback" },
      { type: "modifier", value: "short", reason: "UI sounds must be brief" },
      { type: "exclusion", value: "no reverb tail", reason: "Tails blur rapid interactions" },
      { type: "exclusion", value: "no music", reason: "Musical UI sounds fatigue quickly" },
    ],
    suggestedSettings: { maxDuration: 0.3, loop: false, promptInfluence: 0.6, variationCount: 4 },
  },
  {
    id: "cinematic_oneshot",
    label: "Cinematic One-Shot",
    description: "Single dramatic sound for a key moment",
    constraints: [
      { type: "modifier", value: "dramatic", reason: "Must carry emotional weight" },
      { type: "modifier", value: "rich layers", reason: "Cinematic sounds need depth" },
      { type: "modifier", value: "full frequency range", reason: "Use the whole spectrum" },
    ],
    suggestedSettings: { minDuration: 1, promptInfluence: 0.8, variationCount: 3 },
  },
  {
    id: "loop_bed",
    label: "Loop Bed",
    description: "Continuous background loop (ambience, drone, texture)",
    constraints: [
      { type: "modifier", value: "seamless loop", reason: "No audible loop point" },
      { type: "modifier", value: "slowly evolving", reason: "Static loops become boring" },
      { type: "modifier", value: "even level", reason: "No sudden level changes in a bed" },
      { type: "exclusion", value: "no identifiable events", reason: "Recognizable events reveal the loop" },
    ],
    suggestedSettings: { minDuration: 15, loop: true, promptInfluence: 0.5, variationCount: 2 },
  },
  {
    id: "transition_element",
    label: "Transition Element",
    description: "Whoosh, riser, sweep, or stinger between scenes/states",
    constraints: [
      { type: "modifier", value: "clear arc", reason: "Must have beginning, peak, and end" },
      { type: "modifier", value: "dynamic movement", reason: "Transitions need energy change" },
    ],
    suggestedSettings: { maxDuration: 3, promptInfluence: 0.6, variationCount: 4 },
  },
  {
    id: "foley_sync",
    label: "Foley Sync",
    description: "Must sync precisely to on-screen action",
    constraints: [
      { type: "modifier", value: "tight sync", reason: "Must align to visual frame-accurately" },
      { type: "modifier", value: "clean attack", reason: "Precise onset for sync accuracy" },
      { type: "modifier", value: "isolated", reason: "No room ambience bleeding into sync layer" },
      { type: "exclusion", value: "no ambience", reason: "Clean Foley for mixing flexibility" },
    ],
    suggestedSettings: { maxDuration: 2, promptInfluence: 0.7, variationCount: 6, noRepeat: true },
  },
  {
    id: "music_adjacent",
    label: "Music-Adjacent",
    description: "Must coexist with music without frequency clashing",
    constraints: [
      { type: "modifier", value: "non-tonal", reason: "Avoid pitch clashes with music" },
      { type: "modifier", value: "noise-based", reason: "Noise textures coexist better with tonal music" },
      { type: "exclusion", value: "no melody", reason: "Melody would clash with musical score" },
      { type: "exclusion", value: "no sustained tones", reason: "Sustained pitch creates dissonance" },
    ],
    suggestedSettings: { promptInfluence: 0.5 },
  },
  {
    id: "custom",
    label: "Custom Role",
    description: "Define your own implementation constraints",
    constraints: [],
    suggestedSettings: {},
  },
];

// ── Prompt Adapter ───────────────────────────────────────────

export interface AdaptedPrompt {
  originalPrompt: string;
  adaptedPrompt: string;
  addedModifiers: string[];
  addedExclusions: string[];
  suggestedSettings: Partial<ImplementationSettings>;
  roleId: ImplementationRole;
  roleLabel: string;
}

/**
 * Adapt a prompt for a specific implementation role.
 */
export function adaptPromptForRole(
  prompt: string,
  roleId: ImplementationRole,
  existingExclusions: string[] = []
): AdaptedPrompt {
  const roleDef = IMPLEMENTATION_ROLES.find((r) => r.id === roleId);
  if (!roleDef) {
    return {
      originalPrompt: prompt,
      adaptedPrompt: prompt,
      addedModifiers: [],
      addedExclusions: [],
      suggestedSettings: {},
      roleId,
      roleLabel: "Unknown",
    };
  }

  const modifiers = roleDef.constraints
    .filter((c) => c.type === "modifier")
    .map((c) => c.value);

  const exclusions = roleDef.constraints
    .filter((c) => c.type === "exclusion")
    .map((c) => c.value)
    .filter((e) => !existingExclusions.includes(e));

  const technicals = roleDef.constraints
    .filter((c) => c.type === "technical")
    .map((c) => c.value);

  // Build adapted prompt
  let adapted = prompt.replace(/[.,]?\s*$/, "");
  const allMods = [...modifiers, ...technicals];
  if (allMods.length > 0) {
    adapted += ", " + allMods.join(", ");
  }

  return {
    originalPrompt: prompt,
    adaptedPrompt: adapted,
    addedModifiers: [...modifiers, ...technicals],
    addedExclusions: exclusions,
    suggestedSettings: roleDef.suggestedSettings,
    roleId,
    roleLabel: roleDef.label,
  };
}
