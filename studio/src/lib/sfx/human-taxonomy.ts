/**
 * Algophony Studio — Human Lab Taxonomy
 *
 * Canonical type definitions for the Human Lab page.
 * 8 categories, 5 engine modes, body profile, expression controls,
 * crowd controls, and client-side entities.
 */

// ── Human Categories ──────────────────────────────────────────

export const HUMAN_CATEGORIES = [
  "breath", "efforts", "reactions", "body_sounds",
  "cartoon", "combat", "magic", "crowds",
] as const;

export type HumanCategory = (typeof HUMAN_CATEGORIES)[number];

export interface HumanCategoryDef {
  id: HumanCategory;
  label: string;
  description: string;
  icon: string;
  hue: number;
  defaultEngine: EngineMode;
  actions: string[];
}

export const HUMAN_CATEGORY_DEFS: HumanCategoryDef[] = [
  {
    id: "breath", label: "Breath", icon: "Wind", hue: 200,
    description: "Calm, tired, panic, running, cold, injured, sleeping, held breath.",
    defaultEngine: "sfx",
    actions: ["calm breathing", "tired breathing", "panic breath", "running breath", "cold breath", "injured breath", "sleeping breath", "held breath", "relief exhale", "effort exhale"],
  },
  {
    id: "efforts", label: "Efforts", icon: "Dumbbell", hue: 30,
    description: "Lifting, pushing, pulling, jumping, falling, climbing, dodging.",
    defaultEngine: "sfx",
    actions: ["lifting", "pushing", "pulling", "jumping", "falling", "climbing", "dodging", "rolling", "getting hit", "standing up", "throwing", "swinging"],
  },
  {
    id: "reactions", label: "Reactions", icon: "Smile", hue: 50,
    description: "Gasp, sigh, laugh, cry, sob, pain, surprise, fear, disgust.",
    defaultEngine: "sfx",
    actions: ["gasp", "sigh", "laugh", "cry", "sob", "chuckle", "pain reaction", "surprise", "fear", "disgust", "relief", "confusion", "anger", "celebration"],
  },
  {
    id: "body_sounds", label: "Body Sounds", icon: "HeartPulse", hue: 350,
    description: "Skin contact, mouth sounds, swallowing, teeth, joints, body fall.",
    defaultEngine: "sfx",
    actions: ["skin contact", "mouth sounds", "swallowing", "teeth chatter", "stomach sounds", "joint cracks", "body fall", "hand slap", "body movement", "breath through nose"],
  },
  {
    id: "cartoon", label: "Cartoon", icon: "Sparkles", hue: 290,
    description: "Boing, comic gasp, squeak, exaggerated blink, anime surprise.",
    defaultEngine: "sfx",
    actions: ["boing reaction", "comic gasp", "tiny squeak", "exaggerated blink", "cartoon stumble", "anime surprise breath", "funny mouth pop", "slapstick impact voice layer"],
  },
  {
    id: "combat", label: "Combat", icon: "Swords", hue: 0,
    description: "Attack grunt, pain grunt, battle cry, death gasp, martial arts.",
    defaultEngine: "sfx",
    actions: ["attack grunt", "pain grunt", "dodge breath", "effort shout", "battle cry", "death gasp", "injury breath", "martial arts strike vocal", "magic casting vocal", "superhero effort"],
  },
  {
    id: "magic", label: "Magic", icon: "Wand2", hue: 270,
    description: "Spell whisper, ritual chant, possessed breath, enchanted sigh.",
    defaultEngine: "sfx",
    actions: ["spell whisper", "ritual chant fragment", "possessed breath", "enchanted sigh", "sorcerer exertion", "fairy vocal sparkle", "demon laugh layer", "ghostly human murmur"],
  },
  {
    id: "crowds", label: "Crowds", icon: "Users", hue: 160,
    description: "Street, market, stadium, chanting, angry, celebrating, panic.",
    defaultEngine: "sfx",
    actions: ["busy street", "market", "stadium", "chanting crowd", "angry crowd", "celebrating crowd", "restaurant chatter", "office murmur", "school hallway", "panic crowd", "battlefield crowd", "ritual crowd"],
  },
];

export function getCategoryDef(id: HumanCategory): HumanCategoryDef {
  return HUMAN_CATEGORY_DEFS.find((d) => d.id === id) ?? HUMAN_CATEGORY_DEFS[0];
}

// ── Engine Modes ──────────────────────────────────────────────

export const ENGINE_MODES = ["sfx", "tts", "dialogue", "voice_design", "hybrid"] as const;
export type EngineMode = (typeof ENGINE_MODES)[number];

export interface EngineModeDef {
  id: EngineMode;
  label: string;
  description: string;
  apiRoute: string;
  icon: string;
}

export const ENGINE_MODE_DEFS: EngineModeDef[] = [
  { id: "sfx", label: "Sound Effects", description: "Non-verbal body sounds, crowd beds, breaths, human Foley.", apiRoute: "/api/elevenlabs/generate-sfx", icon: "AudioWaveform" },
  { id: "tts", label: "Text to Speech", description: "Short vocal cues: \"Ah!\", \"Help!\", whispers, exclamations.", apiRoute: "/api/elevenlabs/text-to-speech-layer", icon: "MessageSquare" },
  { id: "dialogue", label: "Text to Dialogue", description: "Small groups, call-and-response, NPC clusters (max 10 voices).", apiRoute: "/api/elevenlabs/text-to-dialogue-layer", icon: "MessagesSquare" },
  { id: "voice_design", label: "Voice Design", description: "Fictional character voice profiles from description.", apiRoute: "/api/elevenlabs/design-voice-preview", icon: "Mic2" },
  { id: "hybrid", label: "Hybrid", description: "Layered: SFX body + TTS grunt + Foley cloth. Multi-engine.", apiRoute: "hybrid", icon: "Layers" },
];

export function getEngineModeDef(id: EngineMode): EngineModeDef {
  return ENGINE_MODE_DEFS.find((d) => d.id === id) ?? ENGINE_MODE_DEFS[0];
}

// ── Body Profile ──────────────────────────────────────────────

export const AGE_IMPRESSIONS = ["child", "young", "adult", "middle_aged", "elderly"] as const;
export type AgeImpression = (typeof AGE_IMPRESSIONS)[number];

export const BODY_SIZES = ["small", "medium", "large", "massive"] as const;
export type BodySize = (typeof BODY_SIZES)[number];

export const GENDER_PRESENTATIONS = ["neutral", "masculine", "feminine"] as const;
export type GenderPresentation = (typeof GENDER_PRESENTATIONS)[number];

export const ENERGY_LEVELS = ["exhausted", "low", "medium", "high", "frantic"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export const PHYSICAL_CONDITIONS = ["healthy", "injured", "recovering", "dying"] as const;
export type PhysicalCondition = (typeof PHYSICAL_CONDITIONS)[number];

export const BREATH_STATES = ["calm", "heavy", "panting", "gasping", "holding"] as const;
export type BreathState = (typeof BREATH_STATES)[number];

export interface BodyProfile {
  ageImpression: AgeImpression;
  bodySize: BodySize;
  genderPresentation: GenderPresentation;
  energyLevel: EnergyLevel;
  physicalCondition: PhysicalCondition;
  breathState: BreathState;
}

export function defaultBodyProfile(): BodyProfile {
  return {
    ageImpression: "adult",
    bodySize: "medium",
    genderPresentation: "neutral",
    energyLevel: "medium",
    physicalCondition: "healthy",
    breathState: "calm",
  };
}

// ── Expression Controls ───────────────────────────────────────

export const EMOTIONS = [
  "calm", "tense", "fearful", "angry", "joyful", "sad", "surprised",
  "disgusted", "confused", "relieved", "exhausted", "panicked",
  "confident", "nervous", "celebratory",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const INTENSITIES = ["subtle", "low", "medium", "high", "extreme"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const REALISM_STYLES = ["realistic", "cinematic", "stylized", "cartoon", "hyperreal"] as const;
export type RealismStyle = (typeof REALISM_STYLES)[number];

export const PAIN_LEVELS = ["none", "mild", "moderate", "strong", "severe", "extreme"] as const;
export type PainLevel = (typeof PAIN_LEVELS)[number];

export const DISTANCES = ["close", "medium", "distant", "offscreen"] as const;
export type Distance = (typeof DISTANCES)[number];

export interface ExpressionSettings {
  action: string;
  emotion: Emotion;
  intensity: Intensity;
  realism: RealismStyle;
  painLevel: PainLevel;
  distance: Distance;
  durationSeconds: number;
}

export function defaultExpressionSettings(): ExpressionSettings {
  return {
    action: "",
    emotion: "calm",
    intensity: "medium",
    realism: "realistic",
    painLevel: "none",
    distance: "close",
    durationSeconds: 2,
  };
}

// ── Crowd Controls ────────────────────────────────────────────

export const CROWD_SIZES = ["small", "medium", "large", "massive"] as const;
export type CrowdSize = (typeof CROWD_SIZES)[number];

export const CROWD_SIZE_LABELS: Record<CrowdSize, string> = {
  small: "Small (3–10)", medium: "Medium (20–50)",
  large: "Large (100+)", massive: "Massive (1000+)",
};

export const CROWD_LANGUAGES = ["english", "spanish", "invented", "indistinct"] as const;
export type CrowdLanguage = (typeof CROWD_LANGUAGES)[number];

export const INTELLIGIBILITIES = ["clear", "partial", "murmur", "texture_only"] as const;
export type Intelligibility = (typeof INTELLIGIBILITIES)[number];

export const CROWD_EMOTIONS = ["calm", "excited", "angry", "panicked", "celebratory", "ritual"] as const;
export type CrowdEmotion = (typeof CROWD_EMOTIONS)[number];

export const CROWD_LOCATIONS = ["street", "stadium", "market", "hallway", "plaza", "battlefield", "restaurant", "office"] as const;
export type CrowdLocation = (typeof CROWD_LOCATIONS)[number];

export const CROWD_MOVEMENTS = ["static", "passing", "approaching", "dispersing"] as const;
export type CrowdMovement = (typeof CROWD_MOVEMENTS)[number];

export const CROWD_DENSITIES = ["sparse", "medium", "dense"] as const;
export type CrowdDensity = (typeof CROWD_DENSITIES)[number];

export const CROWD_MODES = ["bed", "chant", "hybrid"] as const;
export type CrowdMode = (typeof CROWD_MODES)[number];

export interface CrowdSettings {
  crowdType: string;
  crowdSize: CrowdSize;
  language: CrowdLanguage;
  intelligibility: Intelligibility;
  crowdEmotion: CrowdEmotion;
  location: CrowdLocation;
  movement: CrowdMovement;
  density: CrowdDensity;
  loopable: boolean;
  crowdMode: CrowdMode;
  chantPhrase: string;
  chantLayerCount: number;
}

export function defaultCrowdSettings(): CrowdSettings {
  return {
    crowdType: "busy street",
    crowdSize: "medium",
    language: "indistinct",
    intelligibility: "murmur",
    crowdEmotion: "calm",
    location: "street",
    movement: "static",
    density: "medium",
    loopable: true,
    crowdMode: "bed",
    chantPhrase: "",
    chantLayerCount: 3,
  };
}

// ── TTS Settings ──────────────────────────────────────────────

export interface TtsSettings {
  text: string;
  voiceId: string;
}

export function defaultTtsSettings(): TtsSettings {
  return { text: "", voiceId: "pNInz6obpgDQGcFmaJgB" }; // Default: "Adam" voice
}

// ── Client Entities ───────────────────────────────────────────

export interface HumanItem {
  id: string;
  category: HumanCategory;
  engineMode: EngineMode;
  composedPrompt: string;
  audioUrl?: string;
  generationId?: string;
  takeNumber: number;
  status: "draft" | "queued" | "generating" | "generated" | "failed";
  errorMessage?: string;
  dawNotes?: string;
}

export interface HumanSet {
  id: string;
  name: string;
  category: HumanCategory;
  description: string;
  engineMode: EngineMode;
  items: HumanItem[];
  createdAt: number;
  updatedAt: number;
}

// ── Evaluation Tags ───────────────────────────────────────────

export const HUMAN_POSITIVE_TAGS = [
  "good performance", "good pain reaction", "good crowd bed",
  "good chant", "good breath", "good animation cue",
  "good combat layer", "good background texture",
] as const;

export const HUMAN_NEGATIVE_TAGS = [
  "too verbal", "too artificial", "too dramatic",
  "too realistic", "too cartoonish", "too musical",
  "too long", "too close", "too distant",
] as const;

export type HumanEvalTag = (typeof HUMAN_POSITIVE_TAGS)[number] | (typeof HUMAN_NEGATIVE_TAGS)[number];
