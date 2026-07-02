/**
 * Algophony Studio — Atmosphere Builder Taxonomy
 *
 * Canonical type definitions for the Atmosphere Builder soundscape lab.
 * Covers layer types, brief fields, world controls, dramatic axes,
 * and client-side entity shapes.
 */

// ── Layer Types ────────────────────────────────────────────────

export const ATMOSPHERE_LAYER_TYPES = [
  "base_bed",
  "ecology",
  "texture",
  "spatial",
  "dramatic",
  "synthetic",
  "micro_event",
] as const;

export type AtmosphereLayerType = (typeof ATMOSPHERE_LAYER_TYPES)[number];

export interface LayerTypeDefinition {
  id: AtmosphereLayerType;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  hue: number;
  defaultDuration: number;
  defaultLoop: boolean;
  subcategories: string[];
}

export const LAYER_TYPE_DEFS: LayerTypeDefinition[] = [
  {
    id: "base_bed",
    label: "Base Bed",
    shortLabel: "Base",
    description: "The continuous foundation — room tone, wind, ambient hum.",
    icon: "Waves",
    hue: 200,
    defaultDuration: 30,
    defaultLoop: true,
    subcategories: [
      "room tone", "forest bed", "street bed", "wind bed", "interior hum",
      "subterranean air", "distant city wash", "machine room tone",
      "ocean bed", "desert air", "rain bed",
    ],
  },
  {
    id: "ecology",
    label: "Ecological Layer",
    shortLabel: "Ecology",
    description: "Life forms and environmental behavior — insects, birds, distant activity.",
    icon: "TreePine",
    hue: 130,
    defaultDuration: 20,
    defaultLoop: true,
    subcategories: [
      "insects", "frogs", "birds", "distant dogs", "rats", "bats",
      "unseen creatures", "human activity", "distant crowds",
      "underwater life", "nocturnal animals",
    ],
  },
  {
    id: "texture",
    label: "Texture Layer",
    shortLabel: "Texture",
    description: "Material detail — wet leaves, fine rain, electric buzz, dust.",
    icon: "Fingerprint",
    hue: 40,
    defaultDuration: 20,
    defaultLoop: true,
    subcategories: [
      "wet leaves", "fine rain", "electric buzz", "dust", "sand",
      "cloth movement", "plastic roofs", "dry grass", "metal resonance",
      "water drip", "ice crackle", "moss",
    ],
  },
  {
    id: "spatial",
    label: "Spatial Layer",
    shortLabel: "Space",
    description: "Depth, distance, architecture — far valley, tunnel, concrete chamber.",
    icon: "Move3d",
    hue: 260,
    defaultDuration: 25,
    defaultLoop: true,
    subcategories: [
      "far valley", "subway tunnel", "abandoned room", "concrete chamber",
      "large hall", "dense jungle", "underwater pressure", "urban canyon",
      "open field", "cave", "cathedral",
    ],
  },
  {
    id: "dramatic",
    label: "Dramatic Layer",
    shortLabel: "Drama",
    description: "Narrative energy — tension, danger, melancholy, anticipation.",
    icon: "Drama",
    hue: 0,
    defaultDuration: 20,
    defaultLoop: true,
    subcategories: [
      "tension", "danger", "melancholy", "calm", "suspicion",
      "dream", "ritual", "anticipation", "aftermath", "haunting",
      "wonder", "dread",
    ],
  },
  {
    id: "synthetic",
    label: "Synthetic Layer",
    shortLabel: "Synth",
    description: "Non-naturalistic emotional or conceptual atmosphere — drones, pressure, shimmer.",
    icon: "Cpu",
    hue: 290,
    defaultDuration: 20,
    defaultLoop: true,
    subcategories: [
      "low pressure", "electromagnetic shimmer", "dreamlike air",
      "digital humidity", "unstable texture", "memory haze",
      "algorithmic field", "non-human presence", "tonal drift",
    ],
  },
  {
    id: "micro_event",
    label: "Micro-events",
    shortLabel: "Events",
    description: "Small punctual events — branch crack, distant call, water drop.",
    icon: "Zap",
    hue: 60,
    defaultDuration: 5,
    defaultLoop: false,
    subcategories: [
      "branch crack", "single distant call", "water drop", "cloth rustle",
      "metal creak", "animal movement", "far vehicle pass", "electric spark",
      "footstep", "door creak", "glass clink",
    ],
  },
];

export const LAYER_TYPE_LABELS: Record<AtmosphereLayerType, string> = Object.fromEntries(
  LAYER_TYPE_DEFS.map((d) => [d.id, d.label])
) as Record<AtmosphereLayerType, string>;

export function getLayerDef(type: AtmosphereLayerType): LayerTypeDefinition {
  return LAYER_TYPE_DEFS.find((d) => d.id === type)!;
}

// ── Time of Day ────────────────────────────────────────────────

export const TIMES_OF_DAY = [
  "dawn", "morning", "midday", "afternoon", "dusk",
  "evening", "night", "late night", "unspecified",
] as const;

export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

// ── Weather ────────────────────────────────────────────────────

export const WEATHER_OPTIONS = [
  "clear", "overcast", "fog", "light rain", "heavy rain",
  "storm", "snow", "humid", "dry heat", "wind",
  "after rain", "haze", "none",
] as const;

// ── Dramatic Axes ──────────────────────────────────────────────

export interface DramaticAxis {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  defaultValue: number;
}

export const DRAMATIC_AXES: DramaticAxis[] = [
  { id: "tension", label: "Tension", lowLabel: "Calm", highLabel: "Tense", defaultValue: 0.3 },
  { id: "safety", label: "Safety", lowLabel: "Safe", highLabel: "Dangerous", defaultValue: 0.2 },
  { id: "realism", label: "Realism", lowLabel: "Realistic", highLabel: "Dreamlike", defaultValue: 0.3 },
  { id: "inhabitation", label: "Inhabitation", lowLabel: "Empty", highLabel: "Inhabited", defaultValue: 0.4 },
  { id: "nature", label: "Nature", lowLabel: "Natural", highLabel: "Synthetic", defaultValue: 0.2 },
  { id: "clarity", label: "Clarity", lowLabel: "Clear", highLabel: "Obscure", defaultValue: 0.3 },
  { id: "movement", label: "Movement", lowLabel: "Still", highLabel: "Moving", defaultValue: 0.3 },
  { id: "scale", label: "Scale", lowLabel: "Intimate", highLabel: "Vast", defaultValue: 0.5 },
];

export function getDefaultDramaticValues(): Record<string, number> {
  const state: Record<string, number> = {};
  for (const axis of DRAMATIC_AXES) {
    state[axis.id] = axis.defaultValue;
  }
  return state;
}

// ── Presence Levels ────────────────────────────────────────────

export const PRESENCE_LEVELS = ["none", "subtle", "moderate", "dominant"] as const;
export type PresenceLevel = (typeof PRESENCE_LEVELS)[number];

// ── Realism Levels ─────────────────────────────────────────────

export const REALISM_LEVELS = ["hyper-real", "realistic", "stylized", "dreamlike", "abstract"] as const;
export type RealismLevel = (typeof REALISM_LEVELS)[number];

// ── Density Levels ─────────────────────────────────────────────

export const DENSITY_LEVELS = ["sparse", "light", "moderate", "dense", "saturated"] as const;
export type DensityLevel = (typeof DENSITY_LEVELS)[number];

// ── Atmosphere Brief ───────────────────────────────────────────

export interface AtmosphereBrief {
  title: string;
  scene: string;
  location: string;
  timeOfDay: TimeOfDay;
  weather: string;
  emotionalTone: string;
  narrativeFunction: string;
  realismLevel: RealismLevel;
  density: DensityLevel;
  humanPresence: PresenceLevel;
  animalPresence: PresenceLevel;
  machinePresence: PresenceLevel;
  syntheticPresence: PresenceLevel;
  avoidedSounds: string[];
  dramaticValues: Record<string, number>;
}

export function getDefaultBrief(): AtmosphereBrief {
  return {
    title: "",
    scene: "",
    location: "",
    timeOfDay: "unspecified",
    weather: "clear",
    emotionalTone: "",
    narrativeFunction: "",
    realismLevel: "realistic",
    density: "moderate",
    humanPresence: "none",
    animalPresence: "moderate",
    machinePresence: "none",
    syntheticPresence: "none",
    avoidedSounds: [],
    dramaticValues: getDefaultDramaticValues(),
  };
}

// ── Atmosphere Layer (client-side) ─────────────────────────────

export type AtmosphereEngineMode = "sound_effects" | "music_bed";

export interface AtmosphereLayer {
  id: string;
  layerType: AtmosphereLayerType;
  layerRole: string;
  promptText: string;
  intensity: number;    // 0–1
  density: number;      // 0–1
  distance: number;     // 0–1 (close → far)
  movement: number;     // 0–1 (still → moving)
  frequencyRole: "low" | "mid" | "high" | "full";
  loopable: boolean;
  durationSeconds: number;
  promptInfluence: number;
  priority: number;
  muted: boolean;
  solo: boolean;
  engineMode: AtmosphereEngineMode;
  status: "draft" | "generating" | "generated" | "favorite" | "rejected";
  audioUrl?: string;
  generationId?: string;
}

// ── Atmosphere Project (client-side) ───────────────────────────

export interface AtmosphereProject {
  id: string;
  name: string;
  brief: AtmosphereBrief;
  layers: AtmosphereLayer[];
  defaultDuration: number;
  loop: boolean;
  promptInfluence: number;
  outputFormat: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
}

export function createDefaultProject(): AtmosphereProject {
  return {
    id: `atmo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "Untitled Atmosphere",
    brief: getDefaultBrief(),
    layers: [],
    defaultDuration: 20,
    loop: true,
    promptInfluence: 0.3,
    outputFormat: "mp3_44100_128",
    modelId: "eleven_text_to_sound_v2",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Atmosphere Set (client-side) ───────────────────────────────

export interface AtmosphereSet {
  id: string;
  atmosphereProjectId: string;
  name: string;
  layerIds: string[];
  createdAt: number;
}
