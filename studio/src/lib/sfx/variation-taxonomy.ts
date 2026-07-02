/**
 * Algophony Studio — Variation Lab Taxonomy
 *
 * Canonical type definitions for the Variation Lab tool.
 * Covers source types, strategies, batch modes, preservation,
 * variation axes, and client-side entity shapes.
 */

// ── Source Types ───────────────────────────────────────────────

export const SOURCE_TYPES = [
  "prompt_card", "generated_sound", "prompt_pack", "ui_sound_set",
  "creature_layer", "project_folder", "imported_row",
  "multi_card", "multi_sound", "manual_prompt",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  prompt_card: "Prompt Card",
  generated_sound: "Generated Sound",
  prompt_pack: "Prompt Pack",
  ui_sound_set: "UI Sound Set",
  creature_layer: "Creature Layer",
  project_folder: "Project Folder",
  imported_row: "Imported Row",
  multi_card: "Multiple Cards",
  multi_sound: "Multiple Sounds",
  manual_prompt: "Manual Prompt",
};

// ── Variation Strategies ──────────────────────────────────────

export const VARIATION_STRATEGIES = [
  "micro_variation", "material_family", "intensity_ladder",
  "distance_ladder", "mood_palette", "functional_ui_set",
  "scene_coverage", "mutation_matrix", "round_robin",
] as const;

export type VariationStrategy = (typeof VARIATION_STRATEGIES)[number];

export interface StrategyDefinition {
  id: VariationStrategy;
  label: string;
  description: string;
  bestFor: string[];
  icon: string;
  defaultPreservationStrength: PreservationStrength;
}

export const STRATEGY_DEFS: StrategyDefinition[] = [
  {
    id: "micro_variation",
    label: "Micro-Variation",
    description: "Subtle variations preserving same object, action, space and perspective.",
    bestFor: ["footsteps", "gun handling", "sword hits", "UI clicks", "creature breaths", "small impacts"],
    icon: "Fingerprint",
    defaultPreservationStrength: "strict",
  },
  {
    id: "material_family",
    label: "Material Family",
    description: "Same action, different surfaces or materials.",
    bestFor: ["button clicks", "impacts", "footsteps", "doors", "object handling"],
    icon: "Layers",
    defaultPreservationStrength: "medium",
  },
  {
    id: "intensity_ladder",
    label: "Intensity Ladder",
    description: "Same sound at soft → medium → strong → extreme levels.",
    bestFor: ["impacts", "errors", "creature calls", "UI warnings", "footsteps", "door knocks"],
    icon: "TrendingUp",
    defaultPreservationStrength: "strict",
  },
  {
    id: "distance_ladder",
    label: "Distance Ladder",
    description: "Same event from close → medium → far → offscreen perspectives.",
    bestFor: ["explosions", "vehicles", "creature calls", "alarms", "ambience layers"],
    icon: "Move3d",
    defaultPreservationStrength: "strict",
  },
  {
    id: "mood_palette",
    label: "Mood Palette",
    description: "Same action with different emotional tone and atmosphere.",
    bestFor: ["UI sounds", "transitions", "ambience", "creature behavior", "notifications"],
    icon: "Palette",
    defaultPreservationStrength: "medium",
  },
  {
    id: "functional_ui_set",
    label: "Functional UI Set",
    description: "Generate a coherent UI family from one identity sound.",
    bestFor: ["app sounds", "game menus", "OS interfaces", "branded interactions"],
    icon: "LayoutGrid",
    defaultPreservationStrength: "medium",
  },
  {
    id: "scene_coverage",
    label: "Scene Coverage",
    description: "Generate related sounds covering an entire scene or environment.",
    bestFor: ["game levels", "film scenes", "VR environments", "interactive installations"],
    icon: "Map",
    defaultPreservationStrength: "loose",
  },
  {
    id: "mutation_matrix",
    label: "Mutation Matrix",
    description: "Select multiple axes with value arrays — generates all combinations.",
    bestFor: ["comprehensive sound libraries", "systematic coverage", "asset pipelines"],
    icon: "Grid3x3",
    defaultPreservationStrength: "medium",
  },
  {
    id: "round_robin",
    label: "Game Round-Robin",
    description: "Strict preservation with subtle timing/intensity/texture variation.",
    bestFor: ["game footsteps", "weapon sounds", "UI clicks", "impacts", "pickups"],
    icon: "RefreshCw",
    defaultPreservationStrength: "strict",
  },
];

// ── Batch Modes ───────────────────────────────────────────────

export const BATCH_MODES = [
  "n_from_one", "cards_only", "one_per_card",
  "m_per_card", "expand_set", "retry_rejected",
] as const;

export type BatchMode = (typeof BATCH_MODES)[number];

export const BATCH_MODE_LABELS: Record<BatchMode, { label: string; description: string }> = {
  n_from_one: { label: "N Variations from One", description: "Generate N audio variations from a single source" },
  cards_only: { label: "Prompt Cards Only", description: "Generate N prompt cards — no audio yet" },
  one_per_card: { label: "One per Card", description: "Generate one sound per selected prompt card" },
  m_per_card: { label: "M per Card", description: "Generate M variations for each selected card" },
  expand_set: { label: "Expand Set", description: "Expand a sound set into full families" },
  retry_rejected: { label: "Retry Rejected", description: "Re-generate rejected sounds with improved constraints" },
};

// ── Preservation ──────────────────────────────────────────────

export const PRESERVATION_STRENGTHS = ["loose", "medium", "strict"] as const;
export type PreservationStrength = (typeof PRESERVATION_STRENGTHS)[number];

export const LOCKABLE_ATTRIBUTES = [
  "category", "subcategory", "action", "material", "surface",
  "sourceObject", "acousticSpace", "perspective", "distance",
  "mood", "realismLevel", "duration", "loop", "promptInfluence",
  "modelId", "outputFormat", "exclusions", "sonicDna",
] as const;

export type LockableAttribute = (typeof LOCKABLE_ATTRIBUTES)[number];

export const LOCKABLE_ATTRIBUTE_LABELS: Record<LockableAttribute, string> = {
  category: "Category",
  subcategory: "Subcategory",
  action: "Action",
  material: "Material",
  surface: "Surface",
  sourceObject: "Object / Source",
  acousticSpace: "Space / Acoustics",
  perspective: "Mic Perspective",
  distance: "Distance",
  mood: "Mood",
  realismLevel: "Realism Level",
  duration: "Duration",
  loop: "Loop Setting",
  promptInfluence: "Prompt Influence",
  modelId: "Model ID",
  outputFormat: "Output Format",
  exclusions: "Exclusion Constraints",
  sonicDna: "Sonic DNA Profile",
};

export interface PreservationSettings {
  strength: PreservationStrength;
  locked: LockableAttribute[];
}

export function getDefaultPreservation(strategy?: VariationStrategy): PreservationSettings {
  const def = strategy ? STRATEGY_DEFS.find((s) => s.id === strategy) : null;
  const strength = def?.defaultPreservationStrength ?? "medium";

  // Default locks by strength
  const base: LockableAttribute[] = ["category", "modelId", "outputFormat", "exclusions"];
  if (strength === "strict") {
    return { strength, locked: [...base, "subcategory", "action", "material", "surface", "sourceObject", "acousticSpace", "perspective", "distance", "realismLevel", "loop", "promptInfluence"] };
  }
  if (strength === "medium") {
    return { strength, locked: [...base, "action", "material", "perspective", "realismLevel"] };
  }
  return { strength, locked: base };
}

// ── Variation Axes ────────────────────────────────────────────

export interface VariationAxis {
  id: string;
  label: string;
  domain: "general" | "foley" | "ui" | "creature" | "ambience" | "game";
}

export const VARIATION_AXES: VariationAxis[] = [
  // General
  { id: "intensity", label: "Intensity", domain: "general" },
  { id: "distance", label: "Distance", domain: "general" },
  { id: "duration", label: "Duration", domain: "general" },
  { id: "texture", label: "Texture", domain: "general" },
  { id: "rhythm", label: "Rhythm", domain: "general" },
  { id: "density", label: "Density", domain: "general" },
  { id: "brightness", label: "Brightness", domain: "general" },
  { id: "weight", label: "Weight", domain: "general" },
  { id: "wetness", label: "Wetness", domain: "general" },
  { id: "dryness", label: "Dryness", domain: "general" },
  { id: "reverb_amount", label: "Reverb Amount", domain: "general" },
  { id: "room_size", label: "Room Size", domain: "general" },
  { id: "perspective", label: "Perspective", domain: "general" },
  { id: "movement_speed", label: "Movement Speed", domain: "general" },
  { id: "realism", label: "Realism / Stylization", domain: "general" },
  // Foley
  { id: "surface_variation", label: "Surface Variation", domain: "foley" },
  { id: "foot_pressure", label: "Foot Pressure", domain: "foley" },
  { id: "shoe_type", label: "Shoe Type", domain: "foley" },
  { id: "object_weight", label: "Object Weight", domain: "foley" },
  { id: "hand_movement", label: "Hand Movement", domain: "foley" },
  { id: "contact_speed", label: "Contact Speed", domain: "foley" },
  { id: "material_friction", label: "Material Friction", domain: "foley" },
  { id: "impact_force", label: "Impact Force", domain: "foley" },
  { id: "body_movement", label: "Body Movement", domain: "foley" },
  // UI
  { id: "button_size", label: "Button Size", domain: "ui" },
  { id: "button_weight", label: "Button Weight", domain: "ui" },
  { id: "tactility", label: "Tactility", domain: "ui" },
  { id: "ui_brightness", label: "Brightness", domain: "ui" },
  { id: "urgency", label: "Urgency", domain: "ui" },
  { id: "brand_presence", label: "Brand Presence", domain: "ui" },
  { id: "fatigue_risk", label: "Fatigue Risk", domain: "ui" },
  { id: "transition_speed", label: "Transition Speed", domain: "ui" },
  { id: "state_importance", label: "State Importance", domain: "ui" },
  // Creature
  { id: "body_size", label: "Body Size", domain: "creature" },
  { id: "throat_texture", label: "Throat Texture", domain: "creature" },
  { id: "breathiness", label: "Breathiness", domain: "creature" },
  { id: "aggression", label: "Aggression", domain: "creature" },
  { id: "creature_wetness", label: "Wetness", domain: "creature" },
  { id: "pitch_register", label: "Pitch Register", domain: "creature" },
  { id: "creature_distance", label: "Distance", domain: "creature" },
  { id: "animal_reference", label: "Animal Reference", domain: "creature" },
  { id: "mouth_shape", label: "Mouth Shape", domain: "creature" },
  { id: "movement_energy", label: "Movement Energy", domain: "creature" },
  // Ambience
  { id: "time_of_day", label: "Time of Day", domain: "ambience" },
  { id: "background_density", label: "Background Density", domain: "ambience" },
  { id: "weather_intensity", label: "Weather Intensity", domain: "ambience" },
  { id: "room_tone", label: "Room Tone", domain: "ambience" },
  { id: "human_presence", label: "Human Presence", domain: "ambience" },
  { id: "mechanical_presence", label: "Mechanical Presence", domain: "ambience" },
  { id: "distance_layers", label: "Distance Layers", domain: "ambience" },
  { id: "loop_smoothness", label: "Loop Smoothness", domain: "ambience" },
  { id: "spectral_brightness", label: "Spectral Brightness", domain: "ambience" },
  // Game Round-Robin
  { id: "micro_timing", label: "Micro-Timing", domain: "game" },
  { id: "micro_intensity", label: "Micro-Intensity", domain: "game" },
  { id: "hit_strength", label: "Hit Strength", domain: "game" },
  { id: "surface_difference", label: "Surface Difference", domain: "game" },
  { id: "distance_offset", label: "Distance Offset", domain: "game" },
  { id: "attack_sharpness", label: "Attack Sharpness", domain: "game" },
  { id: "decay_length", label: "Decay Length", domain: "game" },
  { id: "gesture_variation", label: "Gesture Variation", domain: "game" },
  { id: "randomness_level", label: "Randomness Level", domain: "game" },
];

export const AXIS_DOMAINS = ["general", "foley", "ui", "creature", "ambience", "game"] as const;
export type AxisDomain = (typeof AXIS_DOMAINS)[number];

export const AXIS_DOMAIN_LABELS: Record<AxisDomain, string> = {
  general: "General",
  foley: "Foley",
  ui: "UI",
  creature: "Creature",
  ambience: "Ambience",
  game: "Game RR",
};

export interface VariationAxesConfig {
  selectedAxes: string[];
  domain: AxisDomain;
}

// ── Job Status ────────────────────────────────────────────────

export const JOB_STATUSES = [
  "queued", "running", "generated", "failed",
  "cancelled", "retrying", "skipped",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

// ── Client-side Entities ──────────────────────────────────────

export interface VariationSource {
  type: SourceType;
  promptText: string;
  promptCardId?: string;
  generatedSoundId?: string;
  audioUrl?: string;
  attributes?: Record<string, string>;
}

export interface VariationJob {
  id: string;
  batchId: string;
  jobIndex: number;
  sourcePrompt: string;
  generatedPrompt: string;
  status: JobStatus;
  audioUrl?: string;
  generationId?: string;
  errorMessage?: string;
  isFavorite: boolean;
  isRejected: boolean;
  evaluationTags: string[];
}

export interface VariationBatch {
  id: string;
  name: string;
  sourceType: SourceType;
  strategy: VariationStrategy;
  batchMode: BatchMode;
  preservation: PreservationSettings;
  selectedAxes: string[];
  batchSize: number;
  generationsPerSource: number;
  estimatedCost: number;
  actualCost: number;
  status: "draft" | "running" | "paused" | "completed" | "cancelled";
  jobs: VariationJob[];
  createdAt: number;
  updatedAt: number;
}

export interface SoundFamily {
  id: string;
  name: string;
  sourcePrompt: string;
  strategy: VariationStrategy;
  preservation: PreservationSettings;
  memberIds: string[];
  favoriteIds: string[];
  rejectedIds: string[];
  createdAt: number;
}

export function createDefaultBatch(): VariationBatch {
  return {
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "Untitled Batch",
    sourceType: "manual_prompt",
    strategy: "micro_variation",
    batchMode: "n_from_one",
    preservation: getDefaultPreservation("micro_variation"),
    selectedAxes: ["intensity", "texture", "micro_timing"],
    batchSize: 4,
    generationsPerSource: 1,
    estimatedCost: 4,
    actualCost: 0,
    status: "draft",
    jobs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Intensity/Distance/Mood Labels ────────────────────────────

export const INTENSITY_LEVELS = ["very soft", "soft", "medium", "strong", "extreme"] as const;
export const DISTANCE_LEVELS = ["very close", "close", "medium", "far", "offscreen", "muffled", "behind wall"] as const;
export const MOOD_LEVELS = ["neutral", "tense", "playful", "premium", "horror", "clinical", "dreamlike", "cyberpunk"] as const;

export const UI_ACTIONS = [
  "primary click", "secondary click", "toggle on", "toggle off",
  "success", "error", "notification", "transition", "sonic logo",
] as const;
