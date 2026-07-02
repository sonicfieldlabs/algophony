/**
 * Algophony Studio — Image-to-Sound Taxonomy
 *
 * Static data, types, and factory functions for the Image-to-Sound feature.
 * Image-to-Sound is visual-to-prompt-to-sound: image interpretation →
 * sound cue planning → prompt cards → ElevenLabs generation.
 */

// ── Use Cases ───────────────────────────────────────────────

// Each use case carries a lucide icon name (resolved at render-time)
// instead of an emoji, so the picker stays in the site's icon style.
export const USE_CASES = [
  { id: "film", label: "Film", icon: "Film" },
  { id: "game", label: "Game", icon: "Gamepad2" },
  { id: "animation", label: "Animation", icon: "Sparkles" },
  { id: "ui", label: "UI", icon: "Smartphone" },
  { id: "trailer", label: "Trailer", icon: "Clapperboard" },
  { id: "social_video", label: "Social Video", icon: "Share2" },
  { id: "installation", label: "Installation", icon: "Landmark" },
  { id: "sound_art", label: "Sound Art", icon: "AudioWaveform" },
  { id: "research", label: "Research", icon: "FlaskConical" },
] as const;

export type UseCase = (typeof USE_CASES)[number]["id"];

// ── Interpretation Modes ────────────────────────────────────

export const INTERPRETATION_MODES = [
  { id: "literal", label: "Literal", desc: "Direct physical sounds only" },
  { id: "cinematic", label: "Cinematic", desc: "Dramatic layering, tension, hidden presence" },
  { id: "game_ready", label: "Game-Ready", desc: "Loopable, surface sets, interaction sets" },
  { id: "cartoon", label: "Cartoon", desc: "Exaggerated, playful, bouncy" },
  { id: "experimental", label: "Experimental", desc: "Abstract, spectral, dreamlike" },
  { id: "atmospheric", label: "Atmospheric", desc: "Environmental beds, immersive spaces" },
  { id: "foley_focused", label: "Foley-Focused", desc: "Physical gestures, materials, contacts" },
  { id: "creature_focused", label: "Creature-Focused", desc: "Breath, movement, vocalization" },
  { id: "ui_branding", label: "UI / Branding", desc: "Interface taps, toggles, notifications" },
] as const;

export type InterpretationMode = (typeof INTERPRETATION_MODES)[number]["id"];

// ── Sonic Strategies ────────────────────────────────────────

export const SONIC_STRATEGIES = [
  { id: "single_sound", label: "Single Sound", desc: "One focused effect" },
  { id: "layered_atmosphere", label: "Layered Atmosphere", desc: "Multi-layer environment" },
  { id: "foley_set", label: "Foley Set", desc: "Physical gesture sounds" },
  { id: "ui_sound_set", label: "UI Sound Set", desc: "Interface sound palette" },
  { id: "creature_set", label: "Creature Set", desc: "Creature sound profile" },
  { id: "game_ambience", label: "Game Ambience", desc: "Loopable game soundscape" },
  { id: "scene_coverage", label: "Scene Coverage", desc: "Full scene sound design" },
  { id: "prompt_pack", label: "Prompt Pack", desc: "Reusable prompt collection" },
  { id: "sonic_moodboard", label: "Sonic Moodboard", desc: "Mood & texture palette" },
] as const;

export type SonicStrategy = (typeof SONIC_STRATEGIES)[number]["id"];

// ── Layer Roles ─────────────────────────────────────────────

export const LAYER_ROLES = [
  { id: "foreground", label: "Foreground", color: "hsl(0, 65%, 55%)" },
  { id: "midground", label: "Midground", color: "hsl(30, 65%, 55%)" },
  { id: "background", label: "Background", color: "hsl(210, 65%, 55%)" },
  { id: "space", label: "Space", color: "hsl(180, 50%, 50%)" },
  { id: "texture", label: "Texture", color: "hsl(270, 50%, 55%)" },
  { id: "emotion", label: "Emotion", color: "hsl(330, 55%, 55%)" },
  { id: "micro_events", label: "Micro-Events", color: "hsl(50, 65%, 50%)" },
  { id: "base_bed", label: "Base Bed", color: "hsl(140, 45%, 45%)" },
] as const;

export type LayerRole = (typeof LAYER_ROLES)[number]["id"];

// ── Visual Categories ───────────────────────────────────────

export const VISUAL_OBJECTS = [
  "doors", "glass", "metal", "wood", "plastic", "cloth",
  "weapons", "vehicles", "machines", "water", "fire",
  "plants", "architecture",
] as const;

export const VISUAL_ACTIONS = [
  "falling", "breaking", "opening", "walking", "waiting",
  "breathing", "hiding", "approaching", "collapsing",
  "burning", "floating", "vibrating",
] as const;

export const VISUAL_SPACES = [
  "small room", "large hall", "forest", "street", "subway",
  "cave", "warehouse", "bathroom", "stadium", "mountain",
  "underwater", "interior", "exterior",
] as const;

export const VISUAL_TEXTURES = [
  "wet", "dry", "dusty", "rusty", "glassy", "soft", "dense",
  "foggy", "humid", "cold", "hot", "granular", "metallic",
  "organic", "synthetic",
] as const;

export const VISUAL_MOODS = [
  "calm", "tense", "melancholic", "uncanny", "playful",
  "ritual", "violent", "luxurious", "minimal", "abandoned",
  "sacred", "cartoon", "hyperreal",
] as const;

export const SONIC_FUNCTIONS = [
  "foreground cue", "background ambience", "Foley layer",
  "UI cue", "transition", "impact", "creature presence",
  "human presence", "environmental texture", "dramatic pressure",
] as const;

// ── Core Types ──────────────────────────────────────────────

export interface VisualElement {
  element: string;
  sonicPotential: string;
  category: string;
}

export interface MoodDescriptor {
  primary: string;
  secondary: string[];
}

export interface ImageAnalysis {
  imageSummary: string;
  visualElements: VisualElement[];
  impliedActions: string[];
  acousticSpace: string;
  materialTextures: string[];
  mood: MoodDescriptor;
  suggestedStrategy: SonicStrategy;
  foregroundSounds: string[];
  backgroundSounds: string[];
  ambienceLayers: string[];
  foleyLayers: string[];
  specialSounds: string[];
  exclusions: string[];
  soundCards: SoundCardDraft[];
  missingInfoQuestions: string[];
}

export interface SoundCardDraft {
  title: string;
  category: string;
  layerRole: LayerRole;
  visualSource: string;
  prompt: string;
  durationSeconds: number;
  loop: boolean;
  promptInfluence: number;
  exclusions: string[];
}

export interface SoundCard {
  id: string;
  title: string;
  category: string;
  layerRole: LayerRole;
  visualSource: string;
  prompt: string;
  durationSeconds: number;
  loop: boolean;
  promptInfluence: number;
  exclusions: string[];
  selected: boolean;
  status: "draft" | "queued" | "generating" | "generated" | "failed";
  audioUrl?: string;
  generationId?: string;
  errorMessage?: string;
  sortOrder: number;
}

export interface ImageToSoundSession {
  id: string;
  imageDataUrl: string | null;
  interpretationMode: InterpretationMode;
  useCase: UseCase;
  analysis: ImageAnalysis | null;
  soundCards: SoundCard[];
  sonicStrategy: SonicStrategy;
  status: "draft" | "analyzing" | "analyzed" | "generating" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
}

export interface LayerPlan {
  foreground: SoundCard[];
  midground: SoundCard[];
  background: SoundCard[];
  space: SoundCard[];
  texture: SoundCard[];
  emotion: SoundCard[];
  microEvents: SoundCard[];
}

// ── Factory Functions ───────────────────────────────────────

const LAYER_ROLE_IDS = new Set<string>(LAYER_ROLES.map((role) => role.id));

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function cleanTextList(value: unknown, fallback: string[], maxItems = 12): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => cleanText(item, "", 120))
    .filter(Boolean)
    .slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : fallback;
}

function cleanDuration(value: unknown): number {
  const duration = Number(value);
  if (!Number.isFinite(duration)) return 4;
  return Math.min(30, Math.max(1, Math.round(duration)));
}

function cleanPromptInfluence(value: unknown): number {
  const influence = Number(value);
  if (!Number.isFinite(influence)) return 0.35;
  return Math.min(1, Math.max(0, influence));
}

function cleanLayerRole(value: unknown): LayerRole {
  return typeof value === "string" && LAYER_ROLE_IDS.has(value) ? (value as LayerRole) : "midground";
}

export function defaultSession(): ImageToSoundSession {
  return {
    id: `i2s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    imageDataUrl: null,
    interpretationMode: "cinematic",
    useCase: "film",
    analysis: null,
    soundCards: [],
    sonicStrategy: "layered_atmosphere",
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function draftToSoundCard(draft: Partial<SoundCardDraft>, index: number): SoundCard {
  return {
    id: `card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    title: cleanText(draft.title, "Untitled sound", 120),
    category: cleanText(draft.category, "Generic", 80),
    layerRole: cleanLayerRole(draft.layerRole),
    visualSource: cleanText(draft.visualSource, "Uploaded image", 200),
    prompt: cleanText(draft.prompt, "Detailed sound effect based on the uploaded image, no music, no dialogue.", 600),
    durationSeconds: cleanDuration(draft.durationSeconds),
    loop: Boolean(draft.loop),
    promptInfluence: cleanPromptInfluence(draft.promptInfluence),
    exclusions: cleanTextList(draft.exclusions, ["no music", "no dialogue"]),
    selected: true,
    status: "draft",
    sortOrder: index,
  };
}

export function buildLayerPlan(cards: SoundCard[]): LayerPlan {
  const plan: LayerPlan = {
    foreground: [],
    midground: [],
    background: [],
    space: [],
    texture: [],
    emotion: [],
    microEvents: [],
  };

  for (const card of cards) {
    switch (card.layerRole) {
      case "foreground": plan.foreground.push(card); break;
      case "midground": plan.midground.push(card); break;
      case "background": plan.background.push(card); break;
      case "space": plan.space.push(card); break;
      case "texture": plan.texture.push(card); break;
      case "emotion": plan.emotion.push(card); break;
      case "micro_events": plan.microEvents.push(card); break;
      case "base_bed": plan.background.push(card); break;
    }
  }

  return plan;
}

/** Estimate credit cost for generating N sound cards */
export function estimateImageToSoundCost(cardCount: number): number {
  return cardCount; // 1 credit per generation
}

// ── Visual Sonic Map helpers ────────────────────────────────

export interface VisualSonicMapping {
  element: string;
  sonicPotential: string;
  category: string;
  possibleSounds: string[];
  suggestedLayerRole: LayerRole;
}

export function elementToSonicMapping(el: VisualElement): VisualSonicMapping {
  const sounds = el.sonicPotential.split(",").map((s) => s.trim()).filter(Boolean);
  const role = guessLayerRole(el.category);
  return {
    element: el.element,
    sonicPotential: el.sonicPotential,
    category: el.category,
    possibleSounds: sounds,
    suggestedLayerRole: role,
  };
}

function guessLayerRole(category: string): LayerRole {
  const lower = category.toLowerCase();
  if (lower.includes("atmosphere") || lower.includes("space")) return "background";
  if (lower.includes("foley") || lower.includes("props")) return "foreground";
  if (lower.includes("texture") || lower.includes("material")) return "texture";
  if (lower.includes("emotion") || lower.includes("dramatic")) return "emotion";
  if (lower.includes("micro") || lower.includes("event")) return "micro_events";
  if (lower.includes("creature") || lower.includes("human")) return "midground";
  if (lower.includes("ui") || lower.includes("interface")) return "foreground";
  return "midground";
}

/** Suggest which Algophony Studio tool a card should route to */
export function suggestRouteDestination(
  card: SoundCard
): "atmosphere_maker" | "foley_lab" | "creature_lab" | "ui_elements" | "variation_lab" | "generate" {
  const cat = card.category.toLowerCase();
  if (cat.includes("atmosphere") || cat.includes("ambience") || cat.includes("space")) return "atmosphere_maker";
  if (cat.includes("foley") || cat.includes("surface") || cat.includes("contact")) return "foley_lab";
  if (cat.includes("creature") || cat.includes("animal")) return "creature_lab";
  if (cat.includes("ui") || cat.includes("interface") || cat.includes("notification")) return "ui_elements";
  if (cat.includes("variation") || cat.includes("round")) return "variation_lab";
  return "generate";
}
