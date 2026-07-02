/**
 * Algophony Studio — Misc (Ear Candy) Taxonomy
 *
 * "Misc" is the lab for high-impact, attention-grabbing transitional, decorative,
 * and percussive effects. Four families:
 *   - push       — whooshes, swishes, risers, dopplers, ramps (motion/transition)
 *   - artifacts  — grains, glitches, clicks, cuts, repetitions, micro events
 *   - noise      — distortion, bad-comms, extreme/raw noise
 *   - impact     — hits, slams, explosions, multi-layer 3-band design
 */

// ── Tabs ──────────────────────────────────────────────────────

export const MISC_TABS = ["push", "artifacts", "noise", "impact", "pulse", "timbre", "texture"] as const;
export type MiscTab = (typeof MISC_TABS)[number];

export interface MiscTabDef {
  id: MiscTab;
  label: string;
  description: string;
  icon: string;
  hue: number;
}

export const MISC_TAB_DEFS: MiscTabDef[] = [
  {
    id: "push",
    label: "Whoosh",
    icon: "Wind",
    hue: 200,
    description: "Whooshes, swishes, risers, dopplers, ramps — sounds that move air and attention.",
  },
  {
    id: "artifacts",
    label: "Artifacts",
    icon: "Scissors",
    hue: 290,
    description: "Grains, glitches, clicks, cuts, repetitions and micro-textural surprises.",
  },
  {
    id: "noise",
    label: "Noise",
    icon: "Radio",
    hue: 350,
    description: "Distortion, bad comms, extreme and broken noise textures.",
  },
  {
    id: "impact",
    label: "Impact",
    icon: "Hammer",
    hue: 30,
    description: "Hits, slams, explosions and three-band layered impact design.",
  },
  {
    id: "pulse",
    label: "Pulse",
    icon: "Activity",
    hue: 160,
    description: "Generate rhythmic motion layers: pulse, stutter, tremor, propulsion, machine rhythm, glitch motion and tension patterns.",
  },
  {
    id: "timbre",
    label: "Timbre",
    icon: "Palette",
    hue: 270,
    description: "Generate musical sound matter: texture, resonance, material color, gesture, density, movement and harmonic atmosphere.",
  },
  {
    id: "texture",
    label: "Texture",
    icon: "Waves",
    hue: 200,
    description: "Drones, pads, sweeps, tonal layers, granular textures and sound design elements.",
  },
];

export function getMiscTabDef(id: MiscTab): MiscTabDef {
  return MISC_TAB_DEFS.find((t) => t.id === id) ?? MISC_TAB_DEFS[0];
}

// ── Common ────────────────────────────────────────────────────

export const REALISMS = ["realistic", "hyperreal", "cinematic", "stylized", "abstract"] as const;
export type Realism = (typeof REALISMS)[number];

export const MISC_DISTANCES = ["intimate", "close", "near", "medium", "far", "distant"] as const;
export type MiscDistance = (typeof MISC_DISTANCES)[number];

// ── Push (whooshes / risers / dopplers) ───────────────────────

export const PUSH_TYPES = [
  "whoosh", "swish", "riser", "downer", "ramp_up", "ramp_down",
  "doppler_pass", "fly_by", "transition", "reveal",
] as const;
export type PushType = (typeof PUSH_TYPES)[number];

export const PUSH_TYPE_LABELS: Record<PushType, string> = {
  whoosh: "Whoosh", swish: "Swish", riser: "Riser", downer: "Downer",
  ramp_up: "Ramp Up", ramp_down: "Ramp Down",
  doppler_pass: "Doppler Pass", fly_by: "Fly-by",
  transition: "Transition", reveal: "Reveal",
};

export const PUSH_MEDIUMS = [
  "air", "wind", "fabric", "metal", "water", "energy", "magic", "digital",
] as const;
export type PushMedium = (typeof PUSH_MEDIUMS)[number];

export const PUSH_DIRECTIONS = ["L→R", "R→L", "front→back", "back→front", "up", "down", "around"] as const;
export type PushDirection = (typeof PUSH_DIRECTIONS)[number];

export const PUSH_SPEEDS = ["slow", "medium", "fast", "instant"] as const;
export type PushSpeed = (typeof PUSH_SPEEDS)[number];

export const PUSH_TAILS = ["none", "short_tail", "long_tail", "infinite_decay"] as const;
export type PushTail = (typeof PUSH_TAILS)[number];

export interface PushSettings {
  pushType: PushType;
  medium: PushMedium;
  direction: PushDirection;
  speed: PushSpeed;
  tail: PushTail;
  pitchSweep: number;   // -1 (down) … 1 (up)
  intensity: number;    // 0…1
  doppler: boolean;     // explicit doppler bend
  realism: Realism;
}

export function defaultPushSettings(): PushSettings {
  return {
    pushType: "whoosh",
    medium: "air",
    direction: "L→R",
    speed: "fast",
    tail: "short_tail",
    pitchSweep: 0.5,
    intensity: 0.7,
    doppler: false,
    realism: "cinematic",
  };
}

// ── Artifacts (grains / glitches / micro) ─────────────────────

export const ARTIFACT_TYPES = [
  "grain", "glitch", "click", "cut", "stutter", "repetition",
  "tape_dropout", "bit_crush", "buffer_skip", "zipper",
  "spectral_freeze", "micro_pop",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  grain: "Grain", glitch: "Glitch", click: "Click", cut: "Cut",
  stutter: "Stutter", repetition: "Repetition", tape_dropout: "Tape Dropout",
  bit_crush: "Bit Crush", buffer_skip: "Buffer Skip", zipper: "Zipper",
  spectral_freeze: "Spectral Freeze", micro_pop: "Micro-pop",
};

export const ARTIFACT_DENSITIES = ["sparse", "scattered", "rhythmic", "dense", "swarm"] as const;
export type ArtifactDensity = (typeof ARTIFACT_DENSITIES)[number];

export const ARTIFACT_PITCHES = ["sub", "low", "mid", "high", "ultra", "broadband"] as const;
export type ArtifactPitch = (typeof ARTIFACT_PITCHES)[number];

export interface ArtifactSettings {
  artifactType: ArtifactType;
  density: ArtifactDensity;
  pitch: ArtifactPitch;
  speed: number;        // events per second (1…20)
  jitter: number;       // 0…1 timing randomness
  bitCrush: number;     // 0…1
  dryWet: number;       // 0…1
  source: string;       // free-text source material (e.g. "vinyl crackle", "modem")
  realism: Realism;
}

export function defaultArtifactSettings(): ArtifactSettings {
  return {
    artifactType: "glitch",
    density: "scattered",
    pitch: "broadband",
    speed: 6,
    jitter: 0.5,
    bitCrush: 0.3,
    dryWet: 0.8,
    source: "digital edit",
    realism: "stylized",
  };
}

// ── Noise (distortion / bad comms / extreme) ──────────────────

export const NOISE_FLAVORS = [
  "white", "pink", "brown", "static", "radio_static",
  "tape_hiss", "vinyl_crackle", "interference", "data_burst",
  "saturated_room", "modem", "geiger", "feedback",
] as const;
export type NoiseFlavor = (typeof NOISE_FLAVORS)[number];

export const NOISE_FLAVOR_LABELS: Record<NoiseFlavor, string> = {
  white: "White Noise", pink: "Pink Noise", brown: "Brown Noise",
  static: "Static", radio_static: "Radio Static", tape_hiss: "Tape Hiss",
  vinyl_crackle: "Vinyl Crackle", interference: "Interference",
  data_burst: "Data Burst", saturated_room: "Saturated Room",
  modem: "Modem / Dial-up", geiger: "Geiger / Clicks", feedback: "Feedback",
};

export const NOISE_USAGES = [
  "transition", "texture_bed", "alarm", "communication", "corruption",
  "horror_layer", "sci_fi_layer", "broken_machine", "explosion_tail",
] as const;
export type NoiseUsage = (typeof NOISE_USAGES)[number];

export const NOISE_DISTORTIONS = ["clean", "soft_saturation", "warm_overdrive", "fuzz", "destroyed", "extreme"] as const;
export type NoiseDistortion = (typeof NOISE_DISTORTIONS)[number];

export const NOISE_BANDWIDTHS = ["sub_only", "lo_fi_narrow", "telephone", "broadband", "full_range", "ultrasonic"] as const;
export type NoiseBandwidth = (typeof NOISE_BANDWIDTHS)[number];

export const NOISE_ENGINES = ["sfx", "music"] as const;
export type NoiseEngine = (typeof NOISE_ENGINES)[number];

export const NOISE_ENGINE_LABELS: Record<NoiseEngine, string> = {
  sfx: "SFX (Text-to-Sound)",
  music: "Music Compose (long textural bed)",
};

/** Recommended engine per noise flavor. UI uses this as the default selection. */
export const NOISE_ENGINE_HINTS: Record<NoiseFlavor, NoiseEngine> = {
  white: "sfx",
  pink: "sfx",
  brown: "sfx",
  static: "sfx",
  radio_static: "sfx",
  tape_hiss: "sfx",
  vinyl_crackle: "sfx",
  interference: "sfx",
  data_burst: "sfx",
  saturated_room: "music",
  modem: "sfx",
  geiger: "sfx",
  feedback: "sfx",
};

export interface NoiseSettings {
  flavor: NoiseFlavor;
  usage: NoiseUsage;
  distortion: NoiseDistortion;
  bandwidth: NoiseBandwidth;
  intensity: number;    // 0…1
  motion: "static" | "swelling" | "pulsing" | "scanning" | "erratic";
  tags: string[];       // free-form tags
  realism: Realism;
  /** Which ElevenLabs endpoint to route this to. */
  engine: NoiseEngine;
  /** Music-Compose duration ms (used when engine === "music"). */
  musicDurationMs: number;
}

export function defaultNoiseSettings(): NoiseSettings {
  return {
    flavor: "radio_static",
    usage: "communication",
    distortion: "fuzz",
    bandwidth: "telephone",
    intensity: 0.6,
    motion: "scanning",
    tags: ["broken signal"],
    realism: "stylized",
    engine: "sfx",
    musicDurationMs: 15000,
  };
}

// ── Impact (3-band layered design) ────────────────────────────

export const IMPACT_FAMILIES = [
  "vegetable", "fruit", "rock", "wood", "metal", "concrete",
  "body", "glass", "ceramic", "ice", "explosion", "magical",
  "sci_fi", "cartoon",
] as const;
export type ImpactFamily = (typeof IMPACT_FAMILIES)[number];

export const IMPACT_FAMILY_LABELS: Record<ImpactFamily, string> = {
  vegetable: "Vegetable", fruit: "Fruit", rock: "Rock", wood: "Wood",
  metal: "Metal", concrete: "Concrete", body: "Body", glass: "Glass",
  ceramic: "Ceramic", ice: "Ice", explosion: "Explosion", magical: "Magical",
  sci_fi: "Sci-Fi", cartoon: "Cartoon",
};

export const IMPACT_SIZES = ["tiny", "small", "medium", "large", "massive", "colossal"] as const;
export type ImpactSize = (typeof IMPACT_SIZES)[number];

export const COLLISION_TARGETS = [
  "ground", "wall", "metal_surface", "wood_surface", "glass_surface",
  "water_surface", "soft_surface", "concrete_floor", "stone_floor", "open_air",
] as const;
export type CollisionTarget = (typeof COLLISION_TARGETS)[number];

export const IMPACT_SITUATIONS = [
  "drop", "throw", "punch", "kick", "crash", "slam", "stomp", "explode",
  "shatter", "break", "stab", "smash",
] as const;
export type ImpactSituation = (typeof IMPACT_SITUATIONS)[number];

export const IMPACT_TAILS = ["dry", "short_tail", "medium_tail", "long_tail", "cinematic_sub_drop"] as const;
export type ImpactTail = (typeof IMPACT_TAILS)[number];

/** A single layer of a 3-band impact design (low / mid / high). */
export interface ImpactBandLayer {
  band: "low" | "mid" | "high";
  enabled: boolean;
  material: string;       // material descriptor for this band
  weight: number;         // 0…1 contribution
}

export interface ImpactSettings {
  family: ImpactFamily;
  size: ImpactSize;
  situation: ImpactSituation;
  target: CollisionTarget;
  material: string;       // primary material — auto-suggested per family
  tail: ImpactTail;
  realism: Realism;
  distance: MiscDistance;
  layeredDesign: boolean; // when true, generate 3 band layers
  bands: ImpactBandLayer[];
}

export function defaultImpactBands(): ImpactBandLayer[] {
  return [
    { band: "low",  enabled: true, material: "sub bass thump",          weight: 0.85 },
    { band: "mid",  enabled: true, material: "wood and concrete crack", weight: 0.70 },
    { band: "high", enabled: true, material: "shrapnel and debris",     weight: 0.55 },
  ];
}

export function defaultImpactSettings(): ImpactSettings {
  return {
    family: "rock",
    size: "large",
    situation: "drop",
    target: "concrete_floor",
    material: "granite boulder",
    tail: "medium_tail",
    realism: "cinematic",
    distance: "near",
    layeredDesign: true,
    bands: defaultImpactBands(),
  };
}

// ── Suggested material seeds per family (helps prompt builder) ─

export const IMPACT_FAMILY_MATERIALS: Record<ImpactFamily, string> = {
  vegetable: "wet cabbage and watermelon flesh",
  fruit: "watermelon and citrus pulp",
  rock: "granite boulder",
  wood: "dense oak and pine",
  metal: "steel plate and iron",
  concrete: "broken concrete slab",
  body: "muscle, bone and flesh",
  glass: "thick tempered glass",
  ceramic: "fired clay and porcelain",
  ice: "thick frozen ice block",
  explosion: "compressed air and debris",
  magical: "crystalline energy burst",
  sci_fi: "energy plasma and metal hull",
  cartoon: "exaggerated boing and pop",
};

// ── Client Entities ───────────────────────────────────────────

export type MiscStatus = "draft" | "queued" | "generating" | "generated" | "failed";

export interface MiscItem {
  id: string;
  tab: MiscTab;
  composedPrompt: string;
  /** For 3-band impacts: extra sub-items per band; otherwise empty. */
  bandLayers?: { band: "low" | "mid" | "high"; prompt: string; audioUrl?: string; status: MiscStatus; filename: string }[];
  audioUrl?: string;
  generationId?: string;
  takeNumber: number;
  status: MiscStatus;
  errorMessage?: string;
  filename: string;
}

// ── Pulse (motion layers) ─────────────────────────────────────

export const PULSE_USE_CASES = ["film", "game", "UI", "trailer", "installation", "song_layer"] as const;
export type PulseUseCase = (typeof PULSE_USE_CASES)[number];

export const PULSE_MOTION_TYPES = [
  "pulse", "stutter", "tremor", "machine_rhythm", "ritual_pattern",
  "chase_motion", "glitch_rhythm", "soft_propulsion",
] as const;
export type PulseMotionType = (typeof PULSE_MOTION_TYPES)[number];

export const PULSE_MOTION_TYPE_LABELS: Record<PulseMotionType, string> = {
  pulse: "Pulse", stutter: "Stutter", tremor: "Tremor",
  machine_rhythm: "Machine Rhythm", ritual_pattern: "Ritual Pattern",
  chase_motion: "Chase Motion", glitch_rhythm: "Glitch Rhythm",
  soft_propulsion: "Soft Propulsion",
};

export const PULSE_TEMPO_IMPRESSIONS = ["slow", "medium", "fast", "unstable", "accelerating"] as const;
export type PulseTempoImpression = (typeof PULSE_TEMPO_IMPRESSIONS)[number];

export const PULSE_DENSITIES = ["sparse", "medium", "dense"] as const;
export type PulseDensity = (typeof PULSE_DENSITIES)[number];

export const PULSE_REGULARITIES = ["steady", "irregular", "broken", "syncopated", "swarming"] as const;
export type PulseRegularity = (typeof PULSE_REGULARITIES)[number];

export const PULSE_MATERIALS = [
  "metallic", "glassy", "wooden", "rubber", "electric",
  "organic", "synthetic", "granular",
] as const;
export type PulseMaterial = (typeof PULSE_MATERIALS)[number];

export const PULSE_SPECTRAL_WEIGHTS = ["sub", "low_body", "mid_texture", "high_clicks", "full_range"] as const;
export type PulseSpectralWeight = (typeof PULSE_SPECTRAL_WEIGHTS)[number];

export const PULSE_SPECTRAL_WEIGHT_LABELS: Record<PulseSpectralWeight, string> = {
  sub: "Sub", low_body: "Low Body", mid_texture: "Mid Texture",
  high_clicks: "High Clicks", full_range: "Full Range",
};

export const PULSE_EMOTIONS = [
  "tension", "suspense", "urgency", "calm", "wonder", "dread", "playfulness",
] as const;
export type PulseEmotion = (typeof PULSE_EMOTIONS)[number];

export interface PulseSettings {
  useCase: PulseUseCase;
  motionType: PulseMotionType;
  tempoImpression: PulseTempoImpression;
  density: PulseDensity;
  regularity: PulseRegularity;
  material: PulseMaterial;
  spectralWeight: PulseSpectralWeight;
  emotion: PulseEmotion;
  durationMs: number;
  avoidText: string;
}

export function defaultPulseSettings(): PulseSettings {
  return {
    useCase: "film",
    motionType: "pulse",
    tempoImpression: "medium",
    density: "medium",
    regularity: "steady",
    material: "metallic",
    spectralWeight: "mid_texture",
    emotion: "tension",
    durationMs: 15000,
    avoidText: "",
  };
}

// ── Timbre (texture layers) ───────────────────────────────────

export const TIMBRE_MATERIALS = [
  "glass", "metal", "water", "wood", "air", "dust",
  "ceramic", "electricity", "membrane", "synthetic_matter",
] as const;
export type TimbreMaterial = (typeof TIMBRE_MATERIALS)[number];

export const TIMBRE_MATERIAL_LABELS: Record<TimbreMaterial, string> = {
  glass: "Glass", metal: "Metal", water: "Water", wood: "Wood",
  air: "Air", dust: "Dust", ceramic: "Ceramic", electricity: "Electricity",
  membrane: "Membrane", synthetic_matter: "Synthetic Matter",
};

export const TIMBRE_COLORS = [
  "bright", "dark", "warm", "cold", "hollow", "dense",
  "breathy", "noisy", "tonal", "granular", "saturated", "unstable",
] as const;
export type TimbreColor = (typeof TIMBRE_COLORS)[number];

export const TIMBRE_GESTURES = [
  "swell", "drift", "shimmer", "scrape", "flutter",
  "tremble", "surge", "collapse", "dissolve",
] as const;
export type TimbreGesture = (typeof TIMBRE_GESTURES)[number];

export const TIMBRE_TEXTURES = [
  "smooth", "rough", "grainy", "wet", "dry",
  "crystalline", "smoky", "dusty", "liquid",
] as const;
export type TimbreTexture = (typeof TIMBRE_TEXTURES)[number];

export const TIMBRE_MOVEMENTS = [
  "still", "slow_evolving", "rotating", "approaching",
  "receding", "expanding", "contracting",
] as const;
export type TimbreMovement = (typeof TIMBRE_MOVEMENTS)[number];

export const TIMBRE_MOVEMENT_LABELS: Record<TimbreMovement, string> = {
  still: "Still", slow_evolving: "Slow Evolving", rotating: "Rotating",
  approaching: "Approaching", receding: "Receding",
  expanding: "Expanding", contracting: "Contracting",
};

export const TIMBRE_DENSITIES = ["transparent", "sparse", "medium", "dense", "opaque"] as const;
export type TimbreDensity = (typeof TIMBRE_DENSITIES)[number];

export const TIMBRE_FUNCTIONS = [
  "underscore", "transition", "atmosphere_layer", "ui_identity",
  "cue_bed", "composition_layer", "installation_bed",
] as const;
export type TimbreFunction = (typeof TIMBRE_FUNCTIONS)[number];

export const TIMBRE_FUNCTION_LABELS: Record<TimbreFunction, string> = {
  underscore: "Underscore", transition: "Transition",
  atmosphere_layer: "Atmosphere Layer", ui_identity: "UI Identity",
  cue_bed: "Cue Bed", composition_layer: "Composition Layer",
  installation_bed: "Installation Bed",
};

export interface TimbreSettings {
  material: TimbreMaterial;
  timbre: TimbreColor;
  gesture: TimbreGesture;
  texture: TimbreTexture;
  movement: TimbreMovement;
  density: TimbreDensity;
  function: TimbreFunction;
  durationMs: number;
  avoidText: string;
}

export function defaultTimbreSettings(): TimbreSettings {
  return {
    material: "glass",
    timbre: "warm",
    gesture: "swell",
    texture: "smooth",
    movement: "slow_evolving",
    density: "medium",
    function: "underscore",
    durationMs: 15000,
    avoidText: "",
  };
}

// ── Texture (synth layer) ─────────────────────────────────────

export const TEXTURE_LAYER_TYPES = [
  { id: "sub", label: "Sub / Rumble", hue: 260, description: "Deep rumbles, low-end pressure" },
  { id: "drone", label: "Drone / Pad", hue: 200, description: "Atmospheric pads, tonal beds" },
  { id: "tone", label: "Tone / Signal", hue: 50, description: "Clean tones, beeps, hums" },
  { id: "texture", label: "Texture / Grain", hue: 30, description: "Granular noise, analog warmth" },
  { id: "impact", label: "Impact / Hit", hue: 0, description: "Booms, thuds, cinematic hits" },
  { id: "sweep", label: "Sweep / Rise", hue: 160, description: "Risers, whooshes, tension builds" },
  { id: "pulse", label: "Pulse / Rhythm", hue: 120, description: "Mechanical loops, engine cycles" },
  { id: "harmonic", label: "Harmonic / Tonal", hue: 300, description: "Bell tones, resonant overtones" },
  { id: "glitch", label: "Glitch / Digital", hue: 180, description: "Digital artifacts, codec errors" },
  { id: "organic", label: "Organic / Found", hue: 80, description: "Processed field recordings" },
] as const;

export const TEXTURE_PROMPT_SCAFFOLDS: Record<string, string> = {
  sub: "Deep sub-bass rumble, slowly evolving low-frequency pressure wave. Purely instrumental, no melody — only weight and vibration.",
  drone: "Dark ambient drone pad, sustained and slowly modulating. Atmospheric texture with subtle harmonic movement, no rhythm, no beat.",
  tone: "Clean electronic tone, pure sine-like quality. Steady pitch, minimal modulation. Sound design element, not musical.",
  texture: "Granular noise texture, slowly evolving analog grain. Tape-saturated warmth with gentle spectral movement. No rhythm, no melody.",
  impact: "Cinematic low-end impact hit with sub-bass tail. Single percussive event with long reverb decay. Purely sound design.",
  sweep: "Ascending frequency sweep, building tension. Filtered noise riser with increasing energy. Sound design element for transitions.",
  pulse: "Mechanical rhythmic pulse, industrial and repetitive. Engine-like cycle with metallic overtones. Purely rhythmic, no melody.",
  harmonic: "Resonant harmonic overtone stack, bell-like sustain. Slowly decaying tonal cluster with pure acoustic quality. Not musical — tonal exploration.",
  glitch: "Digital glitch texture, bit-crushed artifacts and codec errors. Stuttering electronic fragments with unpredictable modulation.",
  organic: "Processed field recording through granular synthesis. Natural source material transformed into evolving textural pad. Ambient and non-musical.",
};

export const TEXTURE_DURATION_PRESETS = [
  { ms: 3000, label: "3s" },
  { ms: 5000, label: "5s" },
  { ms: 10000, label: "10s" },
  { ms: 20000, label: "20s" },
  { ms: 30000, label: "30s" },
  { ms: 60000, label: "1m" },
] as const;

export const TEXTURE_QUICK_SCAFFOLDS = [
  "Spaceship engine idle — deep rumbling hum with mechanical vibration and metallic resonance",
  "Underwater ambience — muffled low-frequency pressure with distant whale-like tonal movement",
  "Alien environment — otherworldly atonal pad with dissonant harmonics, slowly evolving",
  "Electrical hum — 60Hz buzz with harmonic overtones, transformer room ambience",
  "Wind tunnel drone — broadband noise shaped into tonal whoosh, stereo movement",
] as const;

export interface TextureSettings {
  layerType: string;
  prompt: string;
  durationMs: number;
}

export function defaultTextureSettings(): TextureSettings {
  return { layerType: "drone", prompt: TEXTURE_PROMPT_SCAFFOLDS["drone"], durationMs: 10000 };
}
