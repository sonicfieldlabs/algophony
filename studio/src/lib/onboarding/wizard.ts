/**
 * Algophony Studio — First-Run Wizard Data
 *
 * §8.1: Onboarding wizard steps — domain selection, DAW preference,
 * first generation, and library save.
 */

export type OnboardingDomain = "film" | "game" | "podcast" | "music" | "other";
export type DawPreference = "reaper" | "protools" | "ableton" | "logic" | "wwise" | "fmod" | "none";

export interface OnboardingState {
  step: number;
  domain: OnboardingDomain | null;
  daw: DawPreference | null;
  firstPrompt: string | null;
  completed: boolean;
}

export const ONBOARDING_STEPS = [
  {
    id: "domain",
    title: "What do you work on?",
    description: "This helps Wilhelm prioritize the right sound categories for you.",
    options: [
      { value: "film", label: "Film & TV", emoji: "🎬" },
      { value: "game", label: "Game Audio", emoji: "🎮" },
      { value: "podcast", label: "Podcast & Radio", emoji: "🎙️" },
      { value: "music", label: "Music Production", emoji: "🎵" },
      { value: "other", label: "Other", emoji: "🔊" },
    ] as const,
  },
  {
    id: "daw",
    title: "Your DAW of choice?",
    description: "We'll optimize exports and keyboard shortcuts for your workflow.",
    options: [
      { value: "reaper", label: "Reaper" },
      { value: "protools", label: "Pro Tools" },
      { value: "ableton", label: "Ableton Live" },
      { value: "logic", label: "Logic Pro" },
      { value: "wwise", label: "Wwise" },
      { value: "fmod", label: "FMOD" },
      { value: "none", label: "Skip" },
    ] as const,
  },
  {
    id: "generate",
    title: "Generate your first sound",
    description: "Try one of these starter prompts or write your own.",
  },
  {
    id: "complete",
    title: "You're all set!",
    description: "Your workstation is configured. Explore the dashboard or ask Wilhelm for help.",
  },
] as const;

/** Seed prompts for the first-run experience, organized by domain */
export const SEED_PROMPTS: Record<OnboardingDomain, string[]> = {
  film: [
    "Heavy wooden door creaking open in a quiet hallway",
    "Glass breaking followed by distant car alarm",
    "Rain hitting a tin roof with distant thunder",
  ],
  game: [
    "Magical spell cast with crystalline shimmer effect",
    "Heavy mech footstep on metal grating",
    "Health potion bubbling and glowing pickup",
  ],
  podcast: [
    "Warm studio ambience with subtle room tone",
    "Notification chime, gentle and professional",
    "Page turn with soft paper texture",
  ],
  music: [
    "Vinyl crackle texture loop, warm and dusty",
    "Reversed cymbal swell, 3 seconds",
    "Lo-fi tape hiss with subtle warble",
  ],
  other: [
    "Forest ambience with birdsong at dawn",
    "Typing on a mechanical keyboard, rapid",
    "Crowd murmur in a busy café",
  ],
};

const ONBOARDING_KEY = "algophony-studio-onboarding";

/** Load onboarding state from localStorage */
export function loadOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch { /* ignore */ }
  return { step: 0, domain: null, daw: null, firstPrompt: null, completed: false };
}

/** Save onboarding state to localStorage */
export function saveOnboarding(state: OnboardingState): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Check if user needs onboarding */
export function needsOnboarding(): boolean {
  return !loadOnboarding().completed;
}
