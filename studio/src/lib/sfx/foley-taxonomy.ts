/**
 * Algophony Studio — Foley Room Taxonomy
 *
 * Canonical type definitions for the Foley Room page.
 * Covers 10 Foley categories, performer controls, contact controls,
 * recording settings, category-specific fields, and client-side entities.
 */

// ── Foley Categories ──────────────────────────────────────────

export const FOLEY_CATEGORIES = [
  "footsteps", "cloth", "hands", "props", "doors",
  "body_movement", "surface_contact", "impacts",
  "object_handling", "environmental",
] as const;

export type FoleyCategory = (typeof FOLEY_CATEGORIES)[number];

export interface FoleyCategoryDef {
  id: FoleyCategory;
  label: string;
  description: string;
  icon: string;
  hue: number;
}

export const FOLEY_CATEGORY_DEFS: FoleyCategoryDef[] = [
  { id: "footsteps", label: "Footsteps", description: "Walking, running, stopping, turning, weight shifts on any surface.", icon: "Footprints", hue: 30 },
  { id: "cloth", label: "Cloth", description: "Jackets, coats, fabric movement, sleeves, armor cloth, leather.", icon: "Shirt", hue: 270 },
  { id: "hands", label: "Hands", description: "Grabbing, touching, scratching, tapping, skin contact, gloves.", icon: "Hand", hue: 350 },
  { id: "props", label: "Props", description: "Keys, bags, phones, weapons, cups, papers, tools, chains.", icon: "Package", hue: 45 },
  { id: "doors", label: "Doors", description: "Handles, locks, latches, hinges, creaks, sliding, gates.", icon: "DoorOpen", hue: 180 },
  { id: "body_movement", label: "Body Movement", description: "Sitting, standing, turning, kneeling, falling, crawling.", icon: "PersonStanding", hue: 130 },
  { id: "surface_contact", label: "Surface Contact", description: "Material interactions: rubber on glass, metal on concrete.", icon: "Layers", hue: 200 },
  { id: "impacts", label: "Impacts", description: "Hits, drops, bumps, thuds, knocks, collisions, body falls.", icon: "Hammer", hue: 0 },
  { id: "object_handling", label: "Object Handling", description: "Manipulating objects with different sizes, weights, gestures.", icon: "GripVertical", hue: 60 },
  { id: "environmental", label: "Environmental Foley", description: "Floor creaks, furniture pressure, debris, dust, small room actions.", icon: "TreePine", hue: 150 },
];

export function getCategoryDef(id: FoleyCategory): FoleyCategoryDef {
  return FOLEY_CATEGORY_DEFS.find((d) => d.id === id) ?? FOLEY_CATEGORY_DEFS[0];
}

// ── Performer Controls ────────────────────────────────────────

export const PERFORMER_WEIGHTS = ["light", "medium", "heavy"] as const;
export type PerformerWeight = (typeof PERFORMER_WEIGHTS)[number];

export const GESTURE_SPEEDS = ["slow", "medium", "fast", "sudden"] as const;
export type GestureSpeed = (typeof GESTURE_SPEEDS)[number];

export const CONTACT_FORCES = ["feather", "light", "medium", "firm", "heavy"] as const;
export type ContactForce = (typeof CONTACT_FORCES)[number];

export const MOVEMENT_INTENTIONS = ["careful", "casual", "aggressive", "nervous", "exhausted"] as const;
export type MovementIntention = (typeof MOVEMENT_INTENTIONS)[number];

export const SYNC_LOOSENESS = ["tight", "natural", "loose"] as const;
export type SyncLooseness = (typeof SYNC_LOOSENESS)[number];

export const REALISM_LEVELS = [
  "dry_foley_stage", "realistic_production", "cinematic_hyperreal",
  "documentary_natural", "game_ready_isolated", "layer_only",
] as const;
export type RealismLevel = (typeof REALISM_LEVELS)[number];

export const REALISM_LABELS: Record<RealismLevel, string> = {
  dry_foley_stage: "Dry Foley Stage",
  realistic_production: "Realistic Production",
  cinematic_hyperreal: "Cinematic Hyperreal",
  documentary_natural: "Documentary Natural",
  game_ready_isolated: "Game-Ready Isolated",
  layer_only: "Layer Only",
};

export interface PerformerSettings {
  weight: PerformerWeight;
  gestureSpeed: GestureSpeed;
  contactForce: ContactForce;
  movementIntention: MovementIntention;
  syncLooseness: SyncLooseness;
  realism: RealismLevel;
}

export function defaultPerformerSettings(): PerformerSettings {
  return {
    weight: "medium",
    gestureSpeed: "medium",
    contactForce: "medium",
    movementIntention: "casual",
    syncLooseness: "natural",
    realism: "realistic_production",
  };
}

// ── Footstep-Specific ─────────────────────────────────────────

export const SHOE_TYPES = [
  "barefoot", "sneakers", "leather_boots", "heels", "sandals",
  "rubber_soles", "heavy_military_boots", "wet_shoes", "soft_slippers",
] as const;
export type ShoeType = (typeof SHOE_TYPES)[number];

export const SHOE_TYPE_LABELS: Record<ShoeType, string> = {
  barefoot: "Barefoot", sneakers: "Sneakers", leather_boots: "Leather Boots",
  heels: "Heels", sandals: "Sandals", rubber_soles: "Rubber Soles",
  heavy_military_boots: "Heavy Military Boots", wet_shoes: "Wet Shoes",
  soft_slippers: "Soft Slippers",
};

export const STEP_TYPES = [
  "single_step", "walk_cycle", "run", "crouch_walk", "stumble",
  "slide", "stop", "turn", "jump_landing", "weight_shift",
] as const;
export type StepType = (typeof STEP_TYPES)[number];

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  single_step: "Single Step", walk_cycle: "Walk Cycle", run: "Run",
  crouch_walk: "Crouch Walk", stumble: "Stumble", slide: "Slide",
  stop: "Stop", turn: "Turn", jump_landing: "Jump Landing",
  weight_shift: "Weight Shift",
};

export const FOOT_SIDES = ["left", "right", "alternating"] as const;
export type FootSide = (typeof FOOT_SIDES)[number];

// ── Cloth-Specific ────────────────────────────────────────────

export const CLOTH_TYPES = [
  "canvas_jacket", "leather_jacket", "denim", "silk", "synthetic", "wool",
] as const;
export type ClothType = (typeof CLOTH_TYPES)[number];

export const CLOTH_TYPE_LABELS: Record<ClothType, string> = {
  canvas_jacket: "Canvas Jacket", leather_jacket: "Leather Jacket",
  denim: "Denim", silk: "Silk", synthetic: "Synthetic", wool: "Wool",
};

export const FABRIC_WEIGHTS = ["light", "medium", "heavy"] as const;
export type FabricWeight = (typeof FABRIC_WEIGHTS)[number];

// ── Recording Controls ────────────────────────────────────────

export const MIC_PERSPECTIVES = [
  "close_mic", "medium_distance", "distant",
  "offscreen", "muffled", "interior", "exterior",
] as const;
export type MicPerspective = (typeof MIC_PERSPECTIVES)[number];

export const MIC_PERSPECTIVE_LABELS: Record<MicPerspective, string> = {
  close_mic: "Close Mic", medium_distance: "Medium Distance",
  distant: "Distant", offscreen: "Offscreen", muffled: "Muffled",
  interior: "Interior", exterior: "Exterior",
};

export const ROOM_SIZES = ["tight_booth", "small_room", "medium_room", "large_hall", "outdoor"] as const;
export type RoomSize = (typeof ROOM_SIZES)[number];

export const ROOM_SIZE_LABELS: Record<RoomSize, string> = {
  tight_booth: "Tight Booth", small_room: "Small Room",
  medium_room: "Medium Room", large_hall: "Large Hall", outdoor: "Outdoor",
};

export const FG_BG_ROLES = ["foreground_sync", "background_detail", "offscreen_presence"] as const;
export type FgBgRole = (typeof FG_BG_ROLES)[number];

export interface RecordingSettings {
  micPerspective: MicPerspective;
  roomSize: RoomSize;
  fgBgRole: FgBgRole;
}

export function defaultRecordingSettings(): RecordingSettings {
  return {
    micPerspective: "close_mic",
    roomSize: "tight_booth",
    fgBgRole: "foreground_sync",
  };
}

// ── Material / Surface ────────────────────────────────────────

export const SURFACES = [
  "concrete", "wood", "metal", "gravel", "mud", "grass",
  "tile", "carpet", "snow", "sand", "glass", "plastic",
  "water", "stone", "dirt",
] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_CONDITIONS = [
  "dry", "wet", "dusty", "icy", "oily", "muddy", "clean",
] as const;
export type SurfaceCondition = (typeof SURFACE_CONDITIONS)[number];

export const WETNESS_LEVELS = ["dry", "damp", "wet", "soaked"] as const;
export type WetnessLevel = (typeof WETNESS_LEVELS)[number];

export const FRICTION_LEVELS = ["smooth", "low", "medium", "rough", "gritty"] as const;
export type FrictionLevel = (typeof FRICTION_LEVELS)[number];

export interface MaterialSettings {
  surface: Surface;
  surfaceCondition: SurfaceCondition;
  wetness: WetnessLevel;
  friction: FrictionLevel;
  objectMaterial?: string;
  objectSize?: string;
  objectWeight?: string;
}

export function defaultMaterialSettings(): MaterialSettings {
  return {
    surface: "concrete",
    surfaceCondition: "dry",
    wetness: "dry",
    friction: "medium",
  };
}

// ── Category-Specific Fields ──────────────────────────────────

export interface FootstepFields {
  shoeType: ShoeType;
  stepType: StepType;
  footSide: FootSide;
  walkingSpeed: GestureSpeed;
  strideLength: "short" | "normal" | "long";
}

export interface ClothFields {
  clothType: ClothType;
  fabricWeight: FabricWeight;
  movementSpeed: GestureSpeed;
  dryWet: "dry" | "wet";
  tightLoose: "tight" | "normal" | "loose";
}

export interface HandFields {
  handAction: string;
  gloveType: "bare" | "leather" | "rubber" | "cloth" | "tactical";
  gripIntensity: ContactForce;
}

export interface PropFields {
  objectType: string;
  objectSize: "tiny" | "small" | "medium" | "large";
  objectWeight: "light" | "medium" | "heavy";
  objectMaterial: string;
  handlingStyle: "delicate" | "casual" | "rough" | "precise";
}

export interface DoorFields {
  doorMaterial: "wood" | "metal" | "glass" | "plastic";
  component: "handle" | "hinge" | "latch" | "lock" | "frame" | "full_door";
  openSpeed: GestureSpeed;
  openForce: ContactForce;
}

export type CategoryFields =
  | { category: "footsteps"; fields: FootstepFields }
  | { category: "cloth"; fields: ClothFields }
  | { category: "hands"; fields: HandFields }
  | { category: "props"; fields: PropFields }
  | { category: "doors"; fields: DoorFields }
  | { category: "body_movement" | "surface_contact" | "impacts" | "object_handling" | "environmental"; fields: Record<string, string> };

// ── Foley Prompt Config ───────────────────────────────────────

export interface FoleyPromptConfig {
  category: FoleyCategory;
  performer: PerformerSettings;
  material: MaterialSettings;
  recording: RecordingSettings;
  categoryFields: CategoryFields;
  customPromptOverride?: string;
}

// ── Client Entities ───────────────────────────────────────────

export interface FoleyItem {
  id: string;
  category: FoleyCategory;
  config: FoleyPromptConfig;
  composedPrompt: string;
  audioUrl?: string;
  generationId?: string;
  takeNumber: number;
  side?: FootSide;
  status: "draft" | "queued" | "generating" | "generated" | "failed";
  errorMessage?: string;
}

export interface FoleySet {
  id: string;
  name: string;
  category: FoleyCategory;
  description: string;
  items: FoleyItem[];
  createdAt: number;
  updatedAt: number;
}

// ── Round-Robin Config ────────────────────────────────────────

export interface RoundRobinConfig {
  leftCount: number;
  rightCount: number;
  surfaces: Surface[];
  shoeType: ShoeType;
  movementType: StepType;
  variationStrength: "subtle" | "moderate" | "strong";
}

export function defaultRoundRobinConfig(): RoundRobinConfig {
  return {
    leftCount: 4,
    rightCount: 4,
    surfaces: ["concrete"],
    shoeType: "leather_boots",
    movementType: "single_step",
    variationStrength: "subtle",
  };
}

// ── Default Category Fields ───────────────────────────────────

export function defaultFootstepFields(): FootstepFields {
  return { shoeType: "leather_boots", stepType: "single_step", footSide: "alternating", walkingSpeed: "medium", strideLength: "normal" };
}

export function defaultClothFields(): ClothFields {
  return { clothType: "canvas_jacket", fabricWeight: "medium", movementSpeed: "medium", dryWet: "dry", tightLoose: "normal" };
}

export function defaultHandFields(): HandFields {
  return { handAction: "grabbing", gloveType: "bare", gripIntensity: "medium" };
}

export function defaultPropFields(): PropFields {
  return { objectType: "keys", objectSize: "small", objectWeight: "light", objectMaterial: "metal", handlingStyle: "casual" };
}

export function defaultDoorFields(): DoorFields {
  return { doorMaterial: "wood", component: "full_door", openSpeed: "medium", openForce: "medium" };
}

export function defaultCategoryFields(category: FoleyCategory): CategoryFields {
  switch (category) {
    case "footsteps": return { category, fields: defaultFootstepFields() };
    case "cloth": return { category, fields: defaultClothFields() };
    case "hands": return { category, fields: defaultHandFields() };
    case "props": return { category, fields: defaultPropFields() };
    case "doors": return { category, fields: defaultDoorFields() };
    default: return { category, fields: {} } as CategoryFields;
  }
}

// ── Foley Evaluation Tags ─────────────────────────────────────

export const FOLEY_POSITIVE_TAGS = [
  "good sync layer", "good contact", "good material detail",
  "good weight", "good texture", "good transient",
  "good round-robin candidate", "good isolated Foley",
] as const;

export const FOLEY_NEGATIVE_TAGS = [
  "too ambient", "too wet", "too dry", "too heavy", "too light",
  "wrong surface", "wrong material", "wrong perspective",
  "too much room", "too clean", "too exaggerated",
  "not isolated enough", "bad for sync",
] as const;

export type FoleyEvalTag = (typeof FOLEY_POSITIVE_TAGS)[number] | (typeof FOLEY_NEGATIVE_TAGS)[number];
