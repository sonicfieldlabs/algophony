/**
 * Algophony Studio — Production Vocabulary Trainer
 *
 * Suggests professional sound design terms to replace
 * vague or amateur descriptions. Teaches better prompt language.
 *
 * Modes: Beginner, Professional, Game Audio, Film Post, UI/Branding, Experimental
 * Placement: Generate page (inline suggestions below prompt)
 */

export type VocabMode =
  | "beginner"
  | "professional"
  | "game_audio"
  | "film_post"
  | "ui_branding"
  | "experimental";

export const VOCAB_MODES: Array<{ id: VocabMode; label: string; description: string }> = [
  { id: "beginner", label: "Beginner", description: "Clear, accessible descriptions" },
  { id: "professional", label: "Professional", description: "Industry-standard terminology" },
  { id: "game_audio", label: "Game Audio", description: "Game-specific vocabulary" },
  { id: "film_post", label: "Film Post", description: "Post-production terminology" },
  { id: "ui_branding", label: "UI / Branding", description: "Product & brand sound language" },
  { id: "experimental", label: "Experimental", description: "Sonic art & abstract descriptions" },
];

// ── Replacement Database ─────────────────────────────────────

interface VocabRule {
  trigger: string;        // vague phrase to detect
  triggerRegex?: RegExp;   // optional regex
  replacements: Record<VocabMode, string[]>;
  category: string;
}

const VOCAB_RULES: VocabRule[] = [
  {
    trigger: "scary",
    category: "mood",
    replacements: {
      beginner: ["dark, unsettling", "creepy, eerie"],
      professional: ["ominous, low-register, dark harmonic", "foreboding, sub-bass rumble, distant threat"],
      game_audio: ["threat-level ambient, low-intensity warning, subtle danger cue"],
      film_post: ["dread-inducing, subsonic presence, offscreen menace"],
      ui_branding: ["cautionary, tense, urgent but controlled"],
      experimental: ["spectral unease, liminal frequency, psychoacoustic discomfort"],
    },
  },
  {
    trigger: "scary forest",
    category: "ambience",
    replacements: {
      beginner: ["dark forest, distant animal sounds, wind through trees"],
      professional: ["humid, sparse, nocturnal, distant, low-density, offscreen animal movement, hidden presence, no music, no loud insects"],
      game_audio: ["nocturnal forest bed, sparse wildlife events, low-density ambient layer, player-threat proximity cues"],
      film_post: ["M&E forest night, sparse foliage movement, distant fauna, no tonal content, production-clean ambience"],
      ui_branding: ["organic dark texture, nature-inspired tension, ambient unease"],
      experimental: ["xenomorphic biome, spectral canopy, acoustic shadows, non-human presence field"],
    },
  },
  {
    trigger: "big explosion",
    category: "impact",
    replacements: {
      beginner: ["large detonation, debris, rumble aftermath"],
      professional: ["massive low-frequency detonation, layered debris scatter, subsonic pressure wave, extended tail"],
      game_audio: ["multi-layer explosion: initial transient + debris + tail, variation-friendly, 3-second tail max"],
      film_post: ["LFE-heavy detonation, M&E split: blast core + sweetener + debris, Atmos-ready spatial spread"],
      ui_branding: ["impactful burst, controlled energy, professional power"],
      experimental: ["pressure morphology, thermodynamic rupture, particle scatter field, granular disintegration"],
    },
  },
  {
    trigger: "footstep",
    triggerRegex: /footstep|walking|step/i,
    category: "foley",
    replacements: {
      beginner: ["single footstep, clear recording, specific surface"],
      professional: ["isolated contact, specified surface material, close-mic perspective, no room ambience, single impact"],
      game_audio: ["round-robin footstep, surface-specific, consistent level, no ambience bleed, game-ready transient"],
      film_post: ["Foley footstep, isolated from room, surface specified, dry recording, sync-ready"],
      ui_branding: ["light tactile step, minimal, clean contact"],
      experimental: ["surface percussion, material resonance, contact harmonic, micro-kinetic event"],
    },
  },
  {
    trigger: "whoosh",
    triggerRegex: /whoosh|swoosh|swipe|pass.?by/i,
    category: "transition",
    replacements: {
      beginner: ["air movement, fast pass-by, directional sweep"],
      professional: ["broadband spectral sweep, directional air movement, clean onset to tail"],
      game_audio: ["UI transition whoosh, 0.3s–0.8s, non-tonal, variation-set ready"],
      film_post: ["Foley-grade air sweep, no tonal content, panning-ready, clean attack"],
      ui_branding: ["micro-transition, subtle air movement, premium gesture feedback"],
      experimental: ["spectral migration, phase-shifted displacement, aerodynamic artifact"],
    },
  },
  {
    trigger: "click",
    triggerRegex: /\bclick\b|button|tap/i,
    category: "ui",
    replacements: {
      beginner: ["soft tap, clean sound, short"],
      professional: ["mechanical detent, clean transient, sub-100ms, no tail, isolated contact"],
      game_audio: ["UI confirm, instant response, <50ms, non-fatiguing, round-robin safe"],
      film_post: ["Foley click, mechanical contact, isolated, dry, frame-accurate"],
      ui_branding: ["premium tactile click, warm onset, crystalline release, brand-consistent"],
      experimental: ["micro-contact, granular snap, quantum detent, material phase-shift"],
    },
  },
  {
    trigger: "rain",
    triggerRegex: /\brain\b|raining|rainfall/i,
    category: "ambience",
    replacements: {
      beginner: ["steady rainfall, outdoor, natural recording feel"],
      professional: ["consistent rainfall, specified intensity (light/moderate/heavy), surface impacts, no thunder, seamless loop"],
      game_audio: ["rain ambient bed, loop-ready, layer-friendly, no transient events, steady-state"],
      film_post: ["M&E rain bed, consistent level, no music, no dialogue, production-clean loop"],
      ui_branding: ["calm water texture, organic white noise, sleep/meditation quality"],
      experimental: ["stochastic droplet field, surface percussion matrix, granular precipitation"],
    },
  },
  {
    trigger: "door",
    triggerRegex: /\bdoor\b|gate|entrance/i,
    category: "foley",
    replacements: {
      beginner: ["door opening or closing, specific material (wood, metal)"],
      professional: ["door mechanism: handle + hinge + frame contact, material specified, perspective specified, isolated"],
      game_audio: ["door open/close pair, material-tagged, 3-4 variations, game-ready, no ambience"],
      film_post: ["Foley door, split: mechanism + body + latch, dry recording, sync-ready"],
      ui_branding: ["soft door gesture, minimal mechanical, warm and premium"],
      experimental: ["portal threshold, hinge resonance, spatial boundary event, liminal aperture"],
    },
  },
  {
    trigger: "loud",
    category: "dynamics",
    replacements: {
      beginner: ["high-energy, powerful, strong"],
      professional: ["high dynamic range, full-spectrum energy, powerful transient, unrestricted peak"],
      game_audio: ["max-intensity variant, headroom-aware, peak-normalized"],
      film_post: ["full dynamic range, reference-level, theatrical intensity"],
      ui_branding: ["assertive, commanding, attention-grabbing but controlled"],
      experimental: ["saturated amplitude, peak-pressure event, dynamic ceiling"],
    },
  },
  {
    trigger: "quiet",
    triggerRegex: /\bquiet\b|soft|gentle|subtle/i,
    category: "dynamics",
    replacements: {
      beginner: ["very soft, delicate, almost silent"],
      professional: ["low-level, intimate perspective, close-mic, minimal dynamic range, restrained energy"],
      game_audio: ["low-intensity variant, background-level, mixdown-friendly"],
      film_post: ["near-field, whisper-level, intimate mic placement, noise-floor aware"],
      ui_branding: ["understated, refined, low-fatigue, premium subtlety"],
      experimental: ["threshold perception, near-silence event, micro-dynamic, subliminal presence"],
    },
  },
  {
    trigger: "creepy",
    triggerRegex: /\bcreep\b|creepy|spooky|haunted/i,
    category: "mood",
    replacements: {
      beginner: ["eerie, uncomfortable, dark and unsettling"],
      professional: ["unnatural presence, dissonant undertones, uncanny, psychoacoustic tension"],
      game_audio: ["threat-ambient, low-frequency unease, player-warning texture, anxiety-inducing bed"],
      film_post: ["psychological tension, infrasonic presence, off-axis source, unresolving dissonance"],
      ui_branding: ["cautious tension, controlled unease, dark premium"],
      experimental: ["hauntological frequency, spectral displacement, ontological sonic anxiety"],
    },
  },
  {
    trigger: "robot",
    triggerRegex: /\brobot\b|mechanical|machine|mech/i,
    category: "technology",
    replacements: {
      beginner: ["mechanical movement, servo motors, digital processing"],
      professional: ["servo actuator, pneumatic mechanism, electromagnetic relay, precision mechanical movement"],
      game_audio: ["mech system: servo + hydraulic + impact layer, variation-set, intensity-scalable"],
      film_post: ["practical mechanical source, servo sweetener, layered mechanism, production-dry"],
      ui_branding: ["precision mechanical, clean technology, engineered movement"],
      experimental: ["xenomechanical, post-organic kinetics, silicon sentience, machinic affect"],
    },
  },
];

// ── Suggestion Engine ────────────────────────────────────────

export interface VocabSuggestion {
  originalPhrase: string;
  category: string;
  alternatives: string[];
  mode: VocabMode;
}

/**
 * Analyze prompt text and suggest professional vocabulary.
 */
export function suggestVocabulary(
  prompt: string,
  mode: VocabMode
): VocabSuggestion[] {
  const lower = prompt.toLowerCase();
  const suggestions: VocabSuggestion[] = [];

  // Sort rules: longer triggers first (more specific matches first)
  const sorted = [...VOCAB_RULES].sort((a, b) => b.trigger.length - a.trigger.length);

  const used = new Set<string>();

  for (const rule of sorted) {
    const matches = rule.triggerRegex
      ? rule.triggerRegex.test(lower)
      : lower.includes(rule.trigger);

    if (matches && !used.has(rule.category + rule.trigger.slice(0, 4))) {
      const alts = rule.replacements[mode] ?? rule.replacements.professional;
      if (alts.length > 0) {
        suggestions.push({
          originalPhrase: rule.trigger,
          category: rule.category,
          alternatives: alts,
          mode,
        });
        used.add(rule.category + rule.trigger.slice(0, 4));
      }
    }
  }

  return suggestions;
}

// ── Persistence ──────────────────────────────────────────────

const MODE_KEY = "algophony-studio-vocab-mode";

export function loadVocabMode(): VocabMode {
  if (typeof window === "undefined") return "professional";
  return (localStorage.getItem(MODE_KEY) as VocabMode) ?? "professional";
}

export function saveVocabMode(mode: VocabMode): void {
  localStorage.setItem(MODE_KEY, mode);
}
