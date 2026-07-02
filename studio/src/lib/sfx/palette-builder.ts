/**
 * Algophony Studio — Reference Palette Builder
 *
 * Builds a "Sonic DNA" palette from reference descriptions.
 * Extracts style vocabulary, do/don't constraints, categories,
 * prompt templates, and variation strategies.
 *
 * Placement: Project-level configuration
 */

// ── Palette Schema ───────────────────────────────────────────

export interface SonicPalette {
  id: string;
  name: string;
  description: string;
  references: PaletteReference[];
  vocabulary: PaletteVocabulary;
  doList: string[];
  dontList: string[];
  suggestedCategories: string[];
  promptTemplates: string[];
  exclusionConstraints: string[];
  variationStrategies: string[];
  sonicDna: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaletteReference {
  id: string;
  type: PaletteRefType;
  label: string;
  description: string;
  keywords: string[];
}

export type PaletteRefType =
  | "ui_sounds"
  | "creature_references"
  | "temp_track"
  | "foley_folder"
  | "field_recording"
  | "director_notes"
  | "brand_reference"
  | "game_audio"
  | "film_reference"
  | "music_reference"
  | "custom";

export const PALETTE_REF_TYPES: Array<{ id: PaletteRefType; label: string; icon: string }> = [
  { id: "ui_sounds", label: "UI Sounds", icon: "🖥️" },
  { id: "creature_references", label: "Creature References", icon: "🦎" },
  { id: "temp_track", label: "Temp Track", icon: "🎬" },
  { id: "foley_folder", label: "Foley Folder", icon: "👣" },
  { id: "field_recording", label: "Field Recording", icon: "🎙️" },
  { id: "director_notes", label: "Director Notes", icon: "🎬" },
  { id: "brand_reference", label: "Brand Reference", icon: "✨" },
  { id: "game_audio", label: "Game Audio", icon: "🎮" },
  { id: "film_reference", label: "Film Reference", icon: "🎞️" },
  { id: "music_reference", label: "Music Reference", icon: "🎵" },
  { id: "custom", label: "Custom", icon: "📎" },
];

export interface PaletteVocabulary {
  texture: string[];
  weight: string[];
  space: string[];
  energy: string[];
  material: string[];
  mood: string[];
  technical: string[];
}

// ── Keyword Extraction ───────────────────────────────────────

const TEXTURE_WORDS = ["glassy", "metallic", "wooden", "organic", "synthetic", "crystalline", "gritty", "smooth", "rough", "soft", "sharp", "warm", "cold", "brittle", "elastic", "airy", "dense", "hollow", "solid", "granular", "liquid", "silky", "matte", "glossy", "translucent"];
const WEIGHT_WORDS = ["light", "heavy", "delicate", "massive", "subtle", "punchy", "powerful", "gentle", "feathery", "weighty", "minimal", "robust", "paper-thin", "thick", "lean"];
const SPACE_WORDS = ["close", "distant", "intimate", "vast", "tight", "open", "enclosed", "underwater", "indoor", "outdoor", "dry", "reverberant", "room", "hall", "booth"];
const ENERGY_WORDS = ["calm", "urgent", "explosive", "restrained", "dynamic", "static", "building", "decaying", "sustained", "transient", "impulsive", "flowing", "staccato", "legato"];
const MATERIAL_WORDS = ["metal", "glass", "wood", "stone", "plastic", "ceramic", "leather", "fabric", "rubber", "ice", "water", "fire", "air", "earth", "bone", "flesh"];
const MOOD_WORDS = ["premium", "playful", "ominous", "serene", "tense", "joyful", "dark", "bright", "eerie", "heroic", "melancholic", "aggressive", "mysterious", "warm", "clinical", "nostalgic", "futuristic", "vintage"];
const TECHNICAL_WORDS = ["loopable", "non-musical", "low-fatigue", "speech-friendly", "layer-friendly", "variation-friendly", "mono", "stereo", "short-tail", "long-tail", "broadband", "narrowband"];

function extractKeywords(text: string, wordList: string[]): string[] {
  const lower = text.toLowerCase();
  return wordList.filter((w) => lower.includes(w.toLowerCase()));
}

// ── Palette Builder ──────────────────────────────────────────

/**
 * Build a sonic palette from reference descriptions.
 */
export function buildSonicPalette(
  name: string,
  references: PaletteReference[],
  additionalNotes: string = ""
): SonicPalette {
  const allText = [
    ...references.map((r) => `${r.description} ${r.keywords.join(" ")}`),
    additionalNotes,
  ].join(" ");

  // Extract vocabulary
  const vocabulary: PaletteVocabulary = {
    texture: extractKeywords(allText, TEXTURE_WORDS),
    weight: extractKeywords(allText, WEIGHT_WORDS),
    space: extractKeywords(allText, SPACE_WORDS),
    energy: extractKeywords(allText, ENERGY_WORDS),
    material: extractKeywords(allText, MATERIAL_WORDS),
    mood: extractKeywords(allText, MOOD_WORDS),
    technical: extractKeywords(allText, TECHNICAL_WORDS),
  };

  // Build do/don't lists from vocabulary
  const doList = buildDoList(vocabulary, references);
  const dontList = buildDontList(vocabulary, references);

  // Suggest categories
  const suggestedCategories = inferCategories(references);

  // Generate prompt templates
  const promptTemplates = generatePromptTemplates(vocabulary, references);

  // Exclusion constraints
  const exclusionConstraints = buildExclusions(vocabulary, dontList);

  // Variation strategies
  const variationStrategies = buildVariationStrategies(references, vocabulary);

  // Sonic DNA summary
  const sonicDna = buildSonicDna(vocabulary);

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    description: additionalNotes || `Sonic palette from ${references.length} reference(s)`,
    references,
    vocabulary,
    doList,
    dontList,
    suggestedCategories,
    promptTemplates,
    exclusionConstraints,
    variationStrategies,
    sonicDna,
    createdAt: now,
    updatedAt: now,
  };
}

function buildDoList(vocab: PaletteVocabulary, refs: PaletteReference[]): string[] {
  const dos: string[] = [];
  if (vocab.texture.length > 0) dos.push(`Use ${vocab.texture.slice(0, 3).join(", ")} textures`);
  if (vocab.weight.length > 0) dos.push(`Aim for ${vocab.weight.slice(0, 2).join(", ")} weight`);
  if (vocab.mood.length > 0) dos.push(`Maintain ${vocab.mood.slice(0, 2).join(", ")} mood`);
  if (vocab.space.length > 0) dos.push(`Record/generate from ${vocab.space[0]} perspective`);
  if (vocab.material.length > 0) dos.push(`Prioritize ${vocab.material.slice(0, 3).join(", ")} materials`);
  if (vocab.technical.length > 0) dos.push(`Ensure sounds are ${vocab.technical.join(", ")}`);

  // Ref-type-specific
  if (refs.some((r) => r.type === "ui_sounds")) dos.push("Keep UI sounds under 1 second with clean transients");
  if (refs.some((r) => r.type === "creature_references")) dos.push("Build creature sounds from organic source layers");
  if (refs.some((r) => r.type === "brand_reference")) dos.push("Maintain brand consistency across all assets");

  return dos;
}

function buildDontList(vocab: PaletteVocabulary, refs: PaletteReference[]): string[] {
  const donts: string[] = [];

  // Infer anti-patterns from positive vocabulary
  if (vocab.mood.includes("premium")) donts.push("No cheap or generic sounds");
  if (vocab.mood.includes("calm") || vocab.mood.includes("serene")) donts.push("No harsh or aggressive sounds");
  if (vocab.texture.includes("organic")) donts.push("No obviously synthetic artifacts");
  if (vocab.texture.includes("synthetic")) donts.push("No purely organic textures");
  if (vocab.technical.includes("non-musical")) donts.push("No melody, no tonal phrases, no music");
  if (vocab.technical.includes("low-fatigue")) donts.push("No piercing frequencies, no ear fatigue");
  if (vocab.technical.includes("speech-friendly")) donts.push("No sounds that mask speech frequencies");
  if (vocab.weight.includes("minimal")) donts.push("No dense or busy sounds");
  if (vocab.weight.includes("delicate")) donts.push("No heavy or aggressive impacts");

  if (refs.some((r) => r.type === "ui_sounds")) {
    donts.push("No musical notifications");
    donts.push("No cartoon UI sounds");
  }

  return donts;
}

function inferCategories(refs: PaletteReference[]): string[] {
  const cats = new Set<string>();
  for (const ref of refs) {
    switch (ref.type) {
      case "ui_sounds": cats.add("UI"); cats.add("Notification"); cats.add("Interaction"); break;
      case "creature_references": cats.add("Creature"); cats.add("Vocal"); cats.add("Organic"); break;
      case "foley_folder": cats.add("Foley"); cats.add("Contact"); cats.add("Movement"); break;
      case "field_recording": cats.add("Ambience"); cats.add("Environment"); cats.add("Room Tone"); break;
      case "game_audio": cats.add("Game SFX"); cats.add("UI"); cats.add("Feedback"); break;
      case "brand_reference": cats.add("Brand"); cats.add("Sonic Logo"); cats.add("UI"); break;
      default: break;
    }
    // Keyword-based category inference
    for (const kw of ref.keywords) {
      const lower = kw.toLowerCase();
      if (lower.includes("impact")) cats.add("Impact");
      if (lower.includes("whoosh")) cats.add("Whoosh");
      if (lower.includes("ambient")) cats.add("Ambience");
      if (lower.includes("footstep")) cats.add("Foley");
      if (lower.includes("door")) cats.add("Door");
      if (lower.includes("weapon")) cats.add("Weapon");
      if (lower.includes("vehicle")) cats.add("Vehicle");
    }
  }
  return [...cats];
}

function generatePromptTemplates(vocab: PaletteVocabulary, refs: PaletteReference[]): string[] {
  const templates: string[] = [];
  const style = [...vocab.texture.slice(0, 2), ...vocab.mood.slice(0, 1)].join(", ");
  const perspective = vocab.space[0] ?? "close-mic";
  const weight = vocab.weight[0] ?? "";

  templates.push(`{action} {material}, ${style}, ${perspective} perspective`);
  if (weight) templates.push(`${weight} {action}, ${style}, clean recording`);
  templates.push(`{category} sound, ${style}, professional quality`);

  if (refs.some((r) => r.type === "ui_sounds")) {
    templates.push(`UI {action}, ${style}, under 0.5 seconds, clean transient`);
  }
  if (refs.some((r) => r.type === "creature_references")) {
    templates.push(`Creature {action}, organic ${style}, layered texture`);
  }
  if (vocab.technical.includes("loopable")) {
    templates.push(`{category} loop, ${style}, seamless, ${perspective}`);
  }

  return templates;
}

function buildExclusions(vocab: PaletteVocabulary, dontList: string[]): string[] {
  const exclusions: string[] = [];
  for (const dont of dontList) {
    if (dont.includes("no music") || dont.includes("No melody")) exclusions.push("no music", "no melody", "no tonal progression");
    if (dont.includes("cartoon")) exclusions.push("no cartoon sounds");
    if (dont.includes("cheap") || dont.includes("generic")) exclusions.push("no stock sounds");
    if (dont.includes("harsh") || dont.includes("aggressive")) exclusions.push("no harsh frequencies");
    if (dont.includes("speech")) exclusions.push("no speech masking frequencies");
    if (dont.includes("fatigue")) exclusions.push("no piercing tones", "no ear fatigue");
    if (dont.includes("synthetic")) exclusions.push("no synthetic artifacts");
    if (dont.includes("dense") || dont.includes("busy")) exclusions.push("no complex layering");
  }
  return [...new Set(exclusions)];
}

function buildVariationStrategies(refs: PaletteReference[], vocab: PaletteVocabulary): string[] {
  const strategies: string[] = [];
  strategies.push("Generate 3–5 variations per prompt at different prompt_influence values (0.3, 0.5, 0.7)");

  if (refs.some((r) => r.type === "ui_sounds")) {
    strategies.push("Create state variants: default, hover, active, disabled, success, error");
  }
  if (refs.some((r) => r.type === "creature_references")) {
    strategies.push("Vary intensity: idle → alert → attack → pain → death");
  }
  if (vocab.material.length > 1) {
    strategies.push(`Surface matrix: ${vocab.material.slice(0, 4).join(" × ")}`);
  }
  if (refs.some((r) => r.type === "foley_folder")) {
    strategies.push("Round-robin: generate 6+ variations per action for no-repeat playback");
  }

  strategies.push("A/B test at low (0.2) vs high (0.8) prompt influence for creative drift");
  return strategies;
}

function buildSonicDna(vocab: PaletteVocabulary): string {
  const parts: string[] = [];
  if (vocab.texture.length > 0) parts.push(vocab.texture.slice(0, 3).join(", "));
  if (vocab.mood.length > 0) parts.push(vocab.mood.slice(0, 2).join(", "));
  if (vocab.weight.length > 0) parts.push(vocab.weight[0]);
  if (vocab.technical.length > 0) parts.push(vocab.technical.join(", "));
  if (vocab.energy.length > 0) parts.push(vocab.energy[0]);
  return parts.join(", ") || "neutral, professional";
}

// ── Persistence ──────────────────────────────────────────────

const PALETTE_STORAGE_KEY = "algophony-studio-palettes";

export function loadPalettes(): SonicPalette[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePalette(palette: SonicPalette): void {
  const existing = loadPalettes();
  const idx = existing.findIndex((p) => p.id === palette.id);
  if (idx >= 0) existing[idx] = palette; else existing.push(palette);
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(existing));
}

export function deletePalette(id: string): void {
  const existing = loadPalettes().filter((p) => p.id !== id);
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(existing));
}
