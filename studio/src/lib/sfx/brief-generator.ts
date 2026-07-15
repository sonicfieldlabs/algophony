/**
 * Algophony Studio — Sound Brief Generator
 *
 * Generates professional sound design briefs from text inputs
 * like scripts, game design docs, moodboards, director notes, etc.
 *
 * Placement: Export Center
 */

// ── Brief Schema ─────────────────────────────────────────────

export interface SoundBrief {
  id: string;
  title: string;
  inputType: BriefInputType;
  inputText: string;
  sonicStyle: string;
  avoidList: string[];
  requiredAssets: BriefAsset[];
  palette: string[];
  layerMap: BriefLayerMap[];
  exportTarget: string;
  estimatedCreditCost: number;
  createdAt: string;
}

export interface BriefAsset {
  name: string;
  category: string;
  description: string;
  priority: "critical" | "important" | "nice_to_have";
  variations: number;
  loopable: boolean;
  durationRange: string;
}

export interface BriefLayerMap {
  scene: string;
  layers: Array<{ role: string; description: string; category: string }>;
}

export type BriefInputType =
  | "script_excerpt"
  | "game_design_doc"
  | "moodboard_text"
  | "director_notes"
  | "video_description"
  | "scene_summary"
  | "brand_description"
  | "custom";

export const BRIEF_INPUT_TYPES: Array<{ id: BriefInputType; label: string; placeholder: string }> = [
  { id: "script_excerpt", label: "Script Excerpt", placeholder: "Paste a scene from a screenplay or script..." },
  { id: "game_design_doc", label: "Game Design Document", placeholder: "Paste level/mechanic descriptions from a GDD..." },
  { id: "moodboard_text", label: "Moodboard Text", placeholder: "Describe the sonic mood, references, and feeling..." },
  { id: "director_notes", label: "Director Notes", placeholder: "Paste the director's notes about sound..." },
  { id: "video_description", label: "Video Description", placeholder: "Describe the video content, scene by scene..." },
  { id: "scene_summary", label: "Scene Summary", placeholder: "Summarize the scene: setting, action, emotion..." },
  { id: "brand_description", label: "Brand Description", placeholder: "Describe the brand: personality, audience, values..." },
  { id: "custom", label: "Custom", placeholder: "Describe what you need..." },
];

// ── Keyword Libraries ────────────────────────────────────────

const ACTION_KEYWORDS: Record<string, string[]> = {
  impact: ["hit", "crash", "slam", "bang", "strike", "punch", "kick", "smash", "collide", "thud", "knock"],
  movement: ["walk", "run", "crawl", "climb", "jump", "land", "slide", "roll", "drag", "push", "pull"],
  door: ["open", "close", "creak", "slam", "knock", "lock", "unlock", "slide"],
  vehicle: ["engine", "drive", "brake", "horn", "crash", "skid", "accelerate", "idle"],
  nature: ["rain", "thunder", "wind", "wave", "bird", "insect", "river", "forest", "storm"],
  technology: ["beep", "click", "notification", "alert", "startup", "shutdown", "error", "success", "loading"],
  creature: ["growl", "roar", "hiss", "screech", "breath", "snarl", "chirp", "howl", "purr"],
  weapon: ["gunshot", "reload", "draw", "holster", "swing", "stab", "slice", "explosion"],
  voice: ["scream", "whisper", "laugh", "cry", "gasp", "sigh", "moan", "chant", "crowd"],
  ambience: ["room tone", "city", "forest", "ocean", "interior", "exterior", "underground", "space"],
};

const MOOD_INFERENCE: Record<string, { style: string[]; avoid: string[] }> = {
  luxury: { style: ["premium", "refined", "crystalline", "soft", "warm"], avoid: ["cheap", "harsh", "cartoon", "generic"] },
  horror: { style: ["dark", "eerie", "ominous", "unsettling", "low-frequency"], avoid: ["bright", "cheerful", "musical", "upbeat"] },
  action: { style: ["punchy", "dynamic", "impactful", "crisp", "powerful"], avoid: ["soft", "gentle", "ambient", "slow"] },
  calm: { style: ["gentle", "warm", "organic", "flowing", "minimal"], avoid: ["harsh", "aggressive", "loud", "jarring"] },
  scifi: { style: ["synthetic", "modulated", "digital", "futuristic", "processed"], avoid: ["acoustic", "traditional", "natural"] },
  game: { style: ["responsive", "short-tail", "variation-friendly", "non-fatiguing"], avoid: ["long reverb", "complex ambience", "slow onset"] },
  cinematic: { style: ["rich", "layered", "immersive", "detailed", "epic"], avoid: ["thin", "cheap", "flat", "mono"] },
  documentary: { style: ["natural", "authentic", "location-recorded", "ambient"], avoid: ["synthetic", "over-processed", "dramatic"] },
};

// ── Brief Generator ──────────────────────────────────────────

/**
 * Generate a sound design brief from text input.
 */
export function generateSoundBrief(
  title: string,
  inputType: BriefInputType,
  inputText: string
): SoundBrief {
  const lower = inputText.toLowerCase();

  // Detect mood
  const detectedMoods = Object.entries(MOOD_INFERENCE)
    .filter(([key]) => lower.includes(key))
    .map(([, val]) => val);

  // Merge styles and avoids
  const styleWords = [...new Set(detectedMoods.flatMap((m) => m.style))];
  const avoidWords = [...new Set(detectedMoods.flatMap((m) => m.avoid))];

  // Detect actions → required assets
  const detectedAssets: BriefAsset[] = [];
  for (const [category, keywords] of Object.entries(ACTION_KEYWORDS)) {
    const found = keywords.filter((kw) => lower.includes(kw));
    for (const action of found) {
      detectedAssets.push({
        name: `${category}_${action}`.replace(/\s+/g, "_"),
        category,
        description: `${action} sound for ${category} category`,
        priority: category === "technology" || category === "impact" ? "critical" : "important",
        variations: category === "ambience" ? 2 : 4,
        loopable: category === "ambience",
        durationRange: category === "technology" ? "0.1–0.5s" : category === "ambience" ? "15–60s" : "0.5–3s",
      });
    }
  }

  // Add input-type-specific assets
  if (inputType === "brand_description") {
    const brandAssets: BriefAsset[] = [
      { name: "sonic_logo", category: "brand", description: "Brand sonic logo / audio signature", priority: "critical", variations: 3, loopable: false, durationRange: "1–3s" },
      { name: "primary_notification", category: "technology", description: "Primary notification sound", priority: "critical", variations: 1, loopable: false, durationRange: "0.3–0.8s" },
      { name: "success_feedback", category: "technology", description: "Success/confirmation feedback", priority: "important", variations: 2, loopable: false, durationRange: "0.2–0.5s" },
      { name: "error_feedback", category: "technology", description: "Error/alert feedback", priority: "important", variations: 2, loopable: false, durationRange: "0.3–0.6s" },
      { name: "tap_primary", category: "technology", description: "Primary tap/click interaction", priority: "critical", variations: 4, loopable: false, durationRange: "0.05–0.2s" },
      { name: "tap_secondary", category: "technology", description: "Secondary/soft tap interaction", priority: "important", variations: 4, loopable: false, durationRange: "0.05–0.15s" },
    ];
    detectedAssets.push(...brandAssets);
  }

  if (inputType === "game_design_doc") {
    detectedAssets.push(
      { name: "player_hurt", category: "voice", description: "Player damage reaction", priority: "critical", variations: 6, loopable: false, durationRange: "0.3–1s" },
      { name: "level_ambience", category: "ambience", description: "Level background ambience", priority: "critical", variations: 2, loopable: true, durationRange: "30–60s" },
      { name: "pickup_item", category: "technology", description: "Item pickup feedback", priority: "important", variations: 3, loopable: false, durationRange: "0.2–0.5s" },
    );
  }

  // Deduplicate assets
  const uniqueAssets = Array.from(new Map(detectedAssets.map((a) => [a.name, a])).values());

  // Build layer map
  const layerMap = buildLayerMap(uniqueAssets);

  // Sonic style summary
  const sonicStyle = styleWords.length > 0
    ? styleWords.join(", ")
    : inferStyleFromInput(inputType);

  // Palette
  const palette = [...styleWords.slice(0, 5)];
  if (palette.length === 0) palette.push("professional", "clean", "detailed");

  // Export target
  const exportTarget = inferExportTarget(inputType);

  // Cost estimate
  const estimatedCreditCost = uniqueAssets.reduce(
    (sum, a) => sum + a.variations * (a.loopable ? 3 : 1),
    0
  );

  return {
    id: crypto.randomUUID(),
    title,
    inputType,
    inputText,
    sonicStyle,
    avoidList: avoidWords.length > 0 ? avoidWords : ["generic stock sounds", "obvious synthetic artifacts"],
    requiredAssets: uniqueAssets,
    palette,
    layerMap,
    exportTarget,
    estimatedCreditCost,
    createdAt: new Date().toISOString(),
  };
}

function inferStyleFromInput(type: BriefInputType): string {
  switch (type) {
    case "script_excerpt": return "cinematic, detailed, immersive";
    case "game_design_doc": return "responsive, variation-friendly, low-fatigue";
    case "moodboard_text": return "stylized, consistent, curated";
    case "director_notes": return "authentic, evocative, story-driven";
    case "video_description": return "editorial, paced, atmospheric";
    case "scene_summary": return "layered, contextual, scene-aware";
    case "brand_description": return "premium, distinctive, consistent";
    default: return "professional, clean, detailed";
  }
}

function inferExportTarget(type: BriefInputType): string {
  switch (type) {
    case "script_excerpt":
    case "scene_summary": return "DAW Handoff (Reaper / Pro Tools)";
    case "game_design_doc": return "Game Audio Pack (Wwise / FMOD)";
    case "brand_description": return "UI Sound Pack (organized by state)";
    case "video_description": return "NLE Handoff (Resolve / Premiere)";
    default: return "Generic Export (organized by category)";
  }
}

function buildLayerMap(assets: BriefAsset[]): BriefLayerMap[] {
  // Group assets by category for a basic layer map
  const categories = [...new Set(assets.map((a) => a.category))];
  return categories.slice(0, 5).map((cat) => ({
    scene: cat.charAt(0).toUpperCase() + cat.slice(1),
    layers: assets
      .filter((a) => a.category === cat)
      .slice(0, 4)
      .map((a) => ({
        role: a.name,
        description: a.description,
        category: a.category,
      })),
  }));
}
