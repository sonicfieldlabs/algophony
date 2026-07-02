/**
 * Algophony Studio — UI Elements Taxonomy
 *
 * Canonical type definitions for the UI Elements sonic UX lab.
 * Covers element types, action types, engine modes, categories,
 * duration recommendations, and UX safety constraints.
 */

// ── Element Types ──────────────────────────────────────────────

export const UI_ELEMENT_TYPES = [
  "button",
  "toggle",
  "slider",
  "menu",
  "modal",
  "tab",
  "card",
  "notification",
  "dialog",
  "transition",
  "sonic_logo",
] as const;

export type UIElementType = (typeof UI_ELEMENT_TYPES)[number];

export const ELEMENT_TYPE_LABELS: Record<UIElementType, string> = {
  button: "Button",
  toggle: "Toggle",
  slider: "Slider",
  menu: "Menu",
  modal: "Modal",
  tab: "Tab",
  card: "Card",
  notification: "Notification",
  dialog: "Dialog",
  transition: "Transition",
  sonic_logo: "Sonic Logo",
};

// ── Action Types ───────────────────────────────────────────────

export const UI_ACTION_TYPES = [
  "click",
  "tap",
  "hover",
  "press",
  "release",
  "toggle_on",
  "toggle_off",
  "open",
  "close",
  "success",
  "error",
  "warning",
  "loading",
  "achievement",
  "drag",
  "drop",
  "swipe",
  "scroll",
  "expand",
  "collapse",
  "save",
  "delete",
  "undo",
  "redo",
  "startup",
  "shutdown",
  "reveal",
] as const;

export type UIActionType = (typeof UI_ACTION_TYPES)[number];

export const ACTION_TYPE_LABELS: Record<UIActionType, string> = {
  click: "Click",
  tap: "Tap",
  hover: "Hover",
  press: "Press",
  release: "Release",
  toggle_on: "Toggle On",
  toggle_off: "Toggle Off",
  open: "Open",
  close: "Close",
  success: "Success",
  error: "Error",
  warning: "Warning",
  loading: "Loading",
  achievement: "Achievement",
  drag: "Drag",
  drop: "Drop",
  swipe: "Swipe",
  scroll: "Scroll",
  expand: "Expand",
  collapse: "Collapse",
  save: "Save",
  delete: "Delete",
  undo: "Undo",
  redo: "Redo",
  startup: "Startup",
  shutdown: "Shutdown",
  reveal: "Reveal",
};

/** Map element types to their relevant actions */
export const ELEMENT_ACTIONS: Record<UIElementType, UIActionType[]> = {
  button: ["click", "tap", "press", "release", "hover"],
  toggle: ["toggle_on", "toggle_off", "click"],
  slider: ["drag", "release", "click"],
  menu: ["open", "close", "hover", "click"],
  modal: ["open", "close", "expand", "collapse"],
  tab: ["click", "hover", "swipe"],
  card: ["click", "expand", "collapse", "hover", "swipe"],
  notification: ["success", "error", "warning", "achievement"],
  dialog: ["open", "close", "success", "error", "warning"],
  transition: ["open", "close", "expand", "collapse", "reveal", "swipe"],
  sonic_logo: ["startup", "shutdown", "reveal"],
};

// ── Engine Modes ───────────────────────────────────────────────

export const ENGINE_MODES = [
  "sound_effects",
  "text_to_speech",
  "text_to_dialogue",
  "music_motif",
  "hybrid",
] as const;

export type EngineMode = (typeof ENGINE_MODES)[number];

export interface EngineModeDefinition {
  id: EngineMode;
  label: string;
  shortLabel: string;
  description: string;
  apiRoute: string;
  creditCost: number;
  hue: number;
}

export const ENGINE_MODE_DEFS: EngineModeDefinition[] = [
  {
    id: "sound_effects",
    label: "SFX Mode",
    shortLabel: "SFX",
    description: "Clicks, toggles, transitions, notifications — the default engine.",
    apiRoute: "/api/elevenlabs/generate-sfx",
    creditCost: 1,
    hue: 240,
  },
  {
    id: "text_to_speech",
    label: "Voice Mode",
    shortLabel: "Voice",
    description: "Spoken UI feedback, assistant cues, accessibility prompts.",
    apiRoute: "/api/elevenlabs/text-to-speech-layer",
    creditCost: 1,
    hue: 160,
  },
  {
    id: "text_to_dialogue",
    label: "Dialogue Mode",
    shortLabel: "Dialog",
    description: "Character UI responses, game menus, creature feedback.",
    apiRoute: "/api/elevenlabs/text-to-dialogue-layer",
    creditCost: 2,
    hue: 30,
  },
  {
    id: "music_motif",
    label: "Motif Mode",
    shortLabel: "Motif",
    description: "Sonic logos, startup sounds, micro-stingers — 1–5 seconds max.",
    apiRoute: "/api/elevenlabs/music-compose",
    creditCost: 2,
    hue: 300,
  },
  {
    id: "hybrid",
    label: "Hybrid Mode",
    shortLabel: "Hybrid",
    description: "Multi-layer composition: click + shimmer + whoosh + optional voice.",
    apiRoute: "hybrid",
    creditCost: 3,
    hue: 200,
  },
];

// ── Element Properties ─────────────────────────────────────────

export const ELEMENT_SIZES = ["tiny", "small", "medium", "large", "hero"] as const;
export type ElementSize = (typeof ELEMENT_SIZES)[number];

export const ELEMENT_SHAPES = ["round", "sharp", "soft", "glassy", "flat", "physical", "abstract"] as const;
export type ElementShape = (typeof ELEMENT_SHAPES)[number];

export const ELEMENT_WEIGHTS = ["light", "medium", "heavy"] as const;
export type ElementWeight = (typeof ELEMENT_WEIGHTS)[number];

export const ELEMENT_BEHAVIORS = ["snap", "glide", "expand", "collapse", "confirm", "reject"] as const;
export type ElementBehavior = (typeof ELEMENT_BEHAVIORS)[number];

// ── Duration Recommendations ───────────────────────────────────

export const DURATION_RANGES: Record<string, { min: number; max: number; default: number }> = {
  click: { min: 0.05, max: 0.3, default: 0.15 },
  tap: { min: 0.05, max: 0.3, default: 0.1 },
  hover: { min: 0.1, max: 0.5, default: 0.2 },
  press: { min: 0.1, max: 0.5, default: 0.2 },
  release: { min: 0.05, max: 0.3, default: 0.1 },
  toggle_on: { min: 0.1, max: 0.5, default: 0.2 },
  toggle_off: { min: 0.1, max: 0.5, default: 0.2 },
  open: { min: 0.2, max: 0.8, default: 0.4 },
  close: { min: 0.2, max: 0.8, default: 0.3 },
  success: { min: 0.3, max: 1.5, default: 0.6 },
  error: { min: 0.3, max: 1.5, default: 0.5 },
  warning: { min: 0.3, max: 1.5, default: 0.5 },
  loading: { min: 0.5, max: 3.0, default: 1.5 },
  achievement: { min: 1.0, max: 3.0, default: 1.5 },
  drag: { min: 0.2, max: 1.0, default: 0.5 },
  drop: { min: 0.1, max: 0.5, default: 0.2 },
  swipe: { min: 0.2, max: 0.8, default: 0.3 },
  scroll: { min: 0.1, max: 0.5, default: 0.2 },
  expand: { min: 0.3, max: 1.2, default: 0.5 },
  collapse: { min: 0.2, max: 0.8, default: 0.3 },
  save: { min: 0.3, max: 1.0, default: 0.5 },
  delete: { min: 0.2, max: 0.8, default: 0.4 },
  undo: { min: 0.2, max: 0.6, default: 0.3 },
  redo: { min: 0.2, max: 0.6, default: 0.3 },
  startup: { min: 1.0, max: 5.0, default: 2.0 },
  shutdown: { min: 1.0, max: 3.0, default: 1.5 },
  reveal: { min: 0.3, max: 1.2, default: 0.5 },
};

/** Get the recommended duration range for an action type */
export function getDurationRange(action: string) {
  return DURATION_RANGES[action] ?? { min: 0.1, max: 2.0, default: 0.5 };
}

// ── UX Safety Constraints ──────────────────────────────────────

/** Safety constraints auto-injected based on flags */
export const UX_SAFETY_EXCLUSIONS: Record<string, string> = {
  low_fatigue: "low-fatigue, suitable for repeated use",
  no_harsh_transient: "no harsh transient",
  no_piercing: "no high-pitched piercing tone",
  no_speech: "no speech",
  no_music: "no music",
  no_long_tail: "no long tail",
  no_reverb: "no excessive reverb",
  no_alarm: "no alarm-like tone",
  no_notification_confusion: "no notification confusion with system sounds",
  no_startle: "no startle effect",
};

/** Auto-applied safety constraints based on action type */
export const AUTO_SAFETY_BY_ACTION: Record<string, string[]> = {
  click: ["low_fatigue", "no_harsh_transient", "no_long_tail", "no_music", "no_speech"],
  tap: ["low_fatigue", "no_harsh_transient", "no_long_tail", "no_music", "no_speech"],
  hover: ["low_fatigue", "no_harsh_transient", "no_long_tail", "no_music", "no_speech"],
  press: ["low_fatigue", "no_harsh_transient", "no_music", "no_speech"],
  release: ["low_fatigue", "no_harsh_transient", "no_long_tail", "no_music", "no_speech"],
  toggle_on: ["low_fatigue", "no_harsh_transient", "no_long_tail", "no_music", "no_speech"],
  toggle_off: ["low_fatigue", "no_harsh_transient", "no_long_tail", "no_music", "no_speech"],
  open: ["no_music", "no_speech", "no_alarm"],
  close: ["no_music", "no_speech", "no_alarm"],
  success: ["no_alarm", "no_startle", "no_speech"],
  error: ["no_alarm", "no_startle", "no_speech", "no_piercing"],
  warning: ["no_alarm", "no_startle", "no_speech"],
  loading: ["no_music", "no_speech", "no_alarm"],
  achievement: ["no_speech", "no_alarm"],
  startup: [],
  shutdown: ["no_alarm"],
  reveal: ["no_music", "no_speech"],
};

/** Resolve safety keys into human-readable exclusion text */
export function resolveSafetyConstraints(action: string): string[] {
  const keys = AUTO_SAFETY_BY_ACTION[action] ?? [];
  return keys.map((k) => UX_SAFETY_EXCLUSIONS[k]).filter(Boolean);
}

// ── Interface & Brand Styles ───────────────────────────────────

export const INTERFACE_TYPES = [
  "mobile app", "desktop app", "operating system", "video game",
  "web app", "AI assistant", "dashboard", "finance app",
  "health app", "meditation app", "creative tool", "audio software",
  "cyberpunk interface", "retro console", "sci-fi HUD", "luxury product",
  "children's app",
] as const;

export const BRAND_STYLES = [
  "minimal", "premium", "playful", "serious", "soft",
  "futuristic", "organic", "glassy", "physical", "mechanical",
  "retro", "glitchy", "warm", "cold", "dark",
  "bright", "friendly", "clinical", "mystical",
] as const;

// ── Sound Set Types ────────────────────────────────────────────

export interface UISoundSet {
  id: string;
  name: string;
  brandDescription: string;
  interfaceType: string;
  visualStyle: string;
  sonicStyle: string;
  defaultExclusions: string[];
  items: UISoundItem[];
  createdAt: number;
  updatedAt: number;
}

export interface UISoundItem {
  id: string;
  soundSetId: string;
  elementType: UIElementType;
  actionType: UIActionType;
  state?: string;
  importanceLevel?: string;
  frequencyOfUse?: string;
  engineMode: EngineMode;
  durationTarget: number;
  sonicRole?: string;
  promptText: string;
  generationId?: string;
  audioUrl?: string;
  status: "draft" | "generated" | "favorite" | "rejected";
  faderState: Record<string, number>;
  createdAt: number;
}
