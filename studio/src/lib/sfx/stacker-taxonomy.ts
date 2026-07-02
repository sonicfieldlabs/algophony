/**
 * Algophony Studio — Stacker Taxonomy
 *
 * Canonical type definitions for the Stacker tool.
 * Covers layer types, frequency roles, cue contexts,
 * and client-side entity shapes.
 *
 * Stacker decomposes individual sound events into spectral/physical
 * component layers — unlike Atmosphere Builder which decomposes
 * environments into spatial/ecological layers.
 */

// ── Layer Types ────────────────────────────────────────────────

export const STACKER_LAYER_TYPES = [
  "transient", "body", "texture", "tail", "space",
  "movement", "impact", "sweetener", "sub_layer",
  "vocal_layer", "mechanical", "organic",
] as const;

export type StackerLayerType = (typeof STACKER_LAYER_TYPES)[number];

export interface LayerTypeDef {
  id: StackerLayerType;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  hue: number;
  defaultDuration: number;
  defaultLoop: boolean;
  defaultFrequencyRole: FrequencyRoleId;
}

export const LAYER_TYPE_DEFS: LayerTypeDef[] = [
  {
    id: "transient",
    label: "Transient",
    shortLabel: "Trans",
    description: "Attack/onset energy — sharp, percussive, fast attack.",
    icon: "Zap",
    hue: 45,
    defaultDuration: 1,
    defaultLoop: false,
    defaultFrequencyRole: "transient_click",
  },
  {
    id: "body",
    label: "Body",
    shortLabel: "Body",
    description: "Main weight and mass — heavy, sustained, low-mid frequency.",
    icon: "Circle",
    hue: 220,
    defaultDuration: 3,
    defaultLoop: false,
    defaultFrequencyRole: "low_body",
  },
  {
    id: "texture",
    label: "Texture",
    shortLabel: "Tex",
    description: "Surface detail — fine grain, friction, material feel.",
    icon: "Fingerprint",
    hue: 40,
    defaultDuration: 2,
    defaultLoop: false,
    defaultFrequencyRole: "high_texture",
  },
  {
    id: "tail",
    label: "Tail",
    shortLabel: "Tail",
    description: "Decay and release — room reflection, reverb, fade.",
    icon: "Wind",
    hue: 280,
    defaultDuration: 4,
    defaultLoop: false,
    defaultFrequencyRole: "wide",
  },
  {
    id: "space",
    label: "Space",
    shortLabel: "Space",
    description: "Room or environment — spatial character, distance, reverb.",
    icon: "Box",
    hue: 200,
    defaultDuration: 5,
    defaultLoop: true,
    defaultFrequencyRole: "wide",
  },
  {
    id: "movement",
    label: "Movement",
    shortLabel: "Move",
    description: "Motion energy — velocity, gesture, momentum.",
    icon: "MoveRight",
    hue: 160,
    defaultDuration: 2,
    defaultLoop: false,
    defaultFrequencyRole: "mid_detail",
  },
  {
    id: "impact",
    label: "Impact",
    shortLabel: "Hit",
    description: "Collision force — hit, crash, force moment.",
    icon: "Target",
    hue: 0,
    defaultDuration: 1.5,
    defaultLoop: false,
    defaultFrequencyRole: "low_mid",
  },
  {
    id: "sweetener",
    label: "Sweetener",
    shortLabel: "Sweet",
    description: "Design accent — unexpected detail, ear candy, sparkle.",
    icon: "Sparkles",
    hue: 320,
    defaultDuration: 1,
    defaultLoop: false,
    defaultFrequencyRole: "air",
  },
  {
    id: "sub_layer",
    label: "Sub Layer",
    shortLabel: "Sub",
    description: "Sub-bass weight — deep sub-frequency, felt not heard.",
    icon: "Activity",
    hue: 260,
    defaultDuration: 3,
    defaultLoop: false,
    defaultFrequencyRole: "sub",
  },
  {
    id: "vocal_layer",
    label: "Vocal Layer",
    shortLabel: "Vocal",
    description: "Voice or creature — breath, growl, vocalization.",
    icon: "Mic",
    hue: 130,
    defaultDuration: 2,
    defaultLoop: false,
    defaultFrequencyRole: "mid_detail",
  },
  {
    id: "mechanical",
    label: "Mechanical",
    shortLabel: "Mech",
    description: "Machine parts — servo, gear, hydraulic, motor.",
    icon: "Cog",
    hue: 180,
    defaultDuration: 2,
    defaultLoop: false,
    defaultFrequencyRole: "upper_mid",
  },
  {
    id: "organic",
    label: "Organic",
    shortLabel: "Org",
    description: "Living material — wet, fleshy, biological.",
    icon: "Leaf",
    hue: 90,
    defaultDuration: 2,
    defaultLoop: false,
    defaultFrequencyRole: "low_mid",
  },
];

export function getLayerTypeDef(id: StackerLayerType): LayerTypeDef {
  return LAYER_TYPE_DEFS.find((d) => d.id === id) ?? LAYER_TYPE_DEFS[0];
}

// ── Frequency Roles ───────────────────────────────────────────

export const FREQUENCY_ROLES = [
  "sub", "low_body", "low_mid", "mid_detail", "upper_mid",
  "high_texture", "air", "noise", "transient_click", "wide",
] as const;

export type FrequencyRoleId = (typeof FREQUENCY_ROLES)[number];

export interface FrequencyRoleDef {
  id: FrequencyRoleId;
  label: string;
  range: string;
  hue: number;
  promptInjection: string;
  antiInjection: string;
}

export const FREQUENCY_ROLE_DEFS: FrequencyRoleDef[] = [
  {
    id: "sub",
    label: "Sub",
    range: "20–60 Hz",
    hue: 260,
    promptInjection: "deep sub-frequency rumble, felt more than heard, no high frequencies, no sharp transients",
    antiInjection: "no bright sounds, no clicks, no high-frequency content",
  },
  {
    id: "low_body",
    label: "Low Body",
    range: "60–200 Hz",
    hue: 220,
    promptInjection: "low-frequency weight, rounded body, warm, no sharp highs",
    antiInjection: "no piercing high frequencies, no thin sounds",
  },
  {
    id: "low_mid",
    label: "Low-Mid",
    range: "200–500 Hz",
    hue: 200,
    promptInjection: "low-mid thickness, weight, warmth, fullness",
    antiInjection: "no thin or hollow sound, no excessive brightness",
  },
  {
    id: "mid_detail",
    label: "Mid Detail",
    range: "500 Hz–2 kHz",
    hue: 160,
    promptInjection: "clear midrange detail, defined, present, close perspective",
    antiInjection: "no boomy low frequencies, no harsh sibilance",
  },
  {
    id: "upper_mid",
    label: "Upper-Mid",
    range: "2–5 kHz",
    hue: 120,
    promptInjection: "upper-mid presence, articulation, bite, cutting through",
    antiInjection: "no muddy low frequencies, no excessive sub",
  },
  {
    id: "high_texture",
    label: "High Texture",
    range: "5–10 kHz",
    hue: 60,
    promptInjection: "fine high-frequency detail, delicate texture, crisp, no harsh transient",
    antiInjection: "no low-frequency rumble, no boomy weight",
  },
  {
    id: "air",
    label: "Air",
    range: "10–20 kHz",
    hue: 30,
    promptInjection: "airy high frequencies, shimmer, breath, sparkle, ethereal top end",
    antiInjection: "no low-frequency content, no heavy body",
  },
  {
    id: "noise",
    label: "Noise",
    range: "Broadband",
    hue: 0,
    promptInjection: "broadband noise texture, hiss, static, granular, diffuse",
    antiInjection: "no tonal content, no pitched sounds",
  },
  {
    id: "transient_click",
    label: "Transient",
    range: "Impulse",
    hue: 45,
    promptInjection: "sharp transient click, fast attack, percussive, very short, immediate impact",
    antiInjection: "no sustained sounds, no reverb tail, no ambience",
  },
  {
    id: "wide",
    label: "Full Range",
    range: "20 Hz–20 kHz",
    hue: 180,
    promptInjection: "full-range, wide spectrum, natural frequency balance",
    antiInjection: "",
  },
];

export function getFrequencyRoleDef(id: FrequencyRoleId): FrequencyRoleDef {
  return FREQUENCY_ROLE_DEFS.find((d) => d.id === id) ?? FREQUENCY_ROLE_DEFS[9];
}

// ── Cue Contexts ──────────────────────────────────────────────

export const CUE_CONTEXTS = [
  "film_scene", "game_event", "trailer_moment", "ui_interaction",
  "podcast_transition", "installation_trigger", "social_beat", "custom",
] as const;

export type CueContext = (typeof CUE_CONTEXTS)[number];

export const CUE_CONTEXT_LABELS: Record<CueContext, string> = {
  film_scene: "Film Scene",
  game_event: "Game Event",
  trailer_moment: "Trailer Moment",
  ui_interaction: "UI Interaction",
  podcast_transition: "Podcast Transition",
  installation_trigger: "Installation Trigger",
  social_beat: "Social Beat",
  custom: "Custom",
};

// ── Naming Conventions ────────────────────────────────────────

export const NAMING_CONVENTIONS = [
  "film_foley", "game_asset", "library", "custom",
] as const;

export type NamingConvention = (typeof NAMING_CONVENTIONS)[number];

export const NAMING_CONVENTION_DEFS: Record<NamingConvention, { label: string; pattern: string; example: string }> = {
  film_foley: { label: "Film Foley", pattern: "[scene]_[action]_[layer]_v[N]", example: "sc12_hatch_transient_v01" },
  game_asset: { label: "Game Asset", pattern: "[event]_[layer]_[variant]", example: "footstep_body_01" },
  library: { label: "Library", pattern: "[category]_[source]_[role]_[N]", example: "impact_metal_body_01" },
  custom: { label: "Custom", pattern: "user defined", example: "—" },
};

// ── Client-side Entities ──────────────────────────────────────

export const MAX_LAYERS = 10;

export interface StackerLayer {
  id: string;
  layerType: StackerLayerType;
  frequencyRole: FrequencyRoleId;
  promptText: string;
  durationSeconds: number;
  loop: boolean;
  promptInfluence: number;
  priority: number;
  muted: boolean;
  solo: boolean;
  /** Audio URL after generation */
  audioUrl?: string;
  generationId?: string;
  /** Source tracking for generated, imported, rendered, or external audio. */
  sourceKind?: "imported" | "generated" | "rendered" | "external";
  sourceAssetId?: string;
  sourceFileName?: string;
  sourcePath?: string;
  importedFrom?: string;
  importedModule?: string;
  metadata?: Record<string, unknown>;
  /** Status */
  status: "draft" | "queued" | "generating" | "generated" | "failed";
  errorMessage?: string;
}

export interface StackerCue {
  id: string;
  name: string;
  description: string;
  context: CueContext;
  layers: StackerLayer[];
  namingConvention: NamingConvention;
  status: "draft" | "generating" | "completed";
  createdAt: number;
  updatedAt: number;
}

export function createDefaultLayer(
  layerType: StackerLayerType = "body",
  priority: number = 0
): StackerLayer {
  const def = getLayerTypeDef(layerType);
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    layerType,
    frequencyRole: def.defaultFrequencyRole,
    promptText: "",
    durationSeconds: def.defaultDuration,
    loop: def.defaultLoop,
    promptInfluence: 0.3,
    priority,
    muted: false,
    solo: false,
    status: "draft",
  };
}

export function createDefaultCue(): StackerCue {
  return {
    id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "Untitled Cue",
    description: "",
    context: "film_scene",
    layers: [],
    namingConvention: "film_foley",
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Cross-Module Import Protocol ──────────────────────────────

export const STACKER_IMPORT_KEY = "algophony-studio-stacker-import";

export interface StackerImportPayload {
  module: string;
  promptText: string;
  audioUrl?: string;
  cardId?: string;
  soundId?: string;
  sourceKind?: "imported" | "generated" | "rendered" | "external";
  sourceAssetId?: string;
  sourceFileName?: string;
  sourcePath?: string;
  layerType?: StackerLayerType;
  frequencyRole?: FrequencyRoleId;
  metadata?: Record<string, unknown>;
}
