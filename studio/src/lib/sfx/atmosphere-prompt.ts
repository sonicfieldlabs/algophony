/**
 * Algophony Studio — Atmosphere Builder Prompt Composer
 *
 * Decomposes an AtmosphereBrief into 7 layer prompts and provides
 * individual layer prompt composition. Each layer type has a template
 * with auto-injected exclusions based on layer role.
 */

import type {
  AtmosphereBrief,
  AtmosphereLayer,
  AtmosphereLayerType,
} from "./atmosphere-taxonomy";
import { LAYER_TYPE_DEFS, getLayerDef } from "./atmosphere-taxonomy";

// ── Layer Exclusions ───────────────────────────────────────────

/** Auto-applied exclusions per layer type */
const LAYER_EXCLUSIONS: Record<AtmosphereLayerType, string[]> = {
  base_bed: [
    "no music", "no speech", "no sudden foreground events",
    "no harsh transients", "no close animal calls",
  ],
  ecology: [
    "no music", "no human voices", "no sudden startling events",
  ],
  texture: [
    "non-musical", "no voices", "no dominant foreground elements",
  ],
  spatial: [
    "no close events", "no music", "no speech",
    "no sharp transients",
  ],
  dramatic: [
    "non-musical", "no melody", "no speech",
    "no cinematic sting", "no horror cliché",
  ],
  synthetic: [
    "no melody", "no beat", "no voice",
    "non-musical", "atmospheric not musical",
  ],
  micro_event: [
    "not exaggerated", "no music", "no dialogue",
    "realistic",
  ],
};

// ── Prompt Templates ───────────────────────────────────────────

const LAYER_TEMPLATES: Record<AtmosphereLayerType, string> = {
  base_bed:
    "Loopable {location} ambience bed at {time}, {weather}, {density} density, {realism}. Designed as a continuous background layer. {exclusions}.",
  ecology:
    "Loopable ecological layer for {location} at {time}: {subcategory}. Natural irregular rhythm, {distance} perspective, {density} density. {exclusions}.",
  texture:
    "Close {subcategory} in {location} at {time}, {weather}. Delicate detail, {density} density, {realism}. {exclusions}.",
  spatial:
    "Distant spatial wash of {location} at {time}. {subcategory} depth, {weather} air. {distance} perspective. {exclusions}.",
  dramatic:
    "Subtle atmospheric tension layer for {location}, expressing {emotion} and {narrative}. Textural, slow, low-fatigue. {exclusions}.",
  synthetic:
    "A synthetic atmospheric texture inspired by {emotion}, blended with the feeling of {location}. Abstract but subtle, loopable. {exclusions}.",
  micro_event:
    "A single subtle {subcategory} occurring in {location}, {distance} perspective, short. {exclusions}.",
};

// ── Dramatic Values to Fragments ───────────────────────────────

function dramaticToFragments(values: Record<string, number>): string[] {
  const fragments: string[] = [];
  const v = values;

  if (v.tension > 0.7) fragments.push("tense, uneasy");
  else if (v.tension > 0.5) fragments.push("slightly tense");
  else if (v.tension < 0.2) fragments.push("calm, peaceful");

  if (v.safety > 0.7) fragments.push("dangerous, threatening");
  else if (v.safety < 0.2) fragments.push("safe, comforting");

  if (v.realism > 0.7) fragments.push("dreamlike, surreal");
  else if (v.realism < 0.2) fragments.push("hyper-realistic");

  if (v.clarity > 0.7) fragments.push("obscure, unclear");
  else if (v.clarity < 0.2) fragments.push("clear, transparent");

  if (v.movement > 0.7) fragments.push("restless, shifting");
  else if (v.movement < 0.2) fragments.push("still, static");

  if (v.scale > 0.7) fragments.push("vast, expansive");
  else if (v.scale < 0.3) fragments.push("intimate, close");

  return fragments;
}

// ── Pick Best Subcategory for Layer ────────────────────────────

function pickSubcategory(
  layerType: AtmosphereLayerType,
  brief: AtmosphereBrief
): string {
  const def = getLayerDef(layerType);
  const scene = `${brief.location} ${brief.scene} ${brief.weather} ${brief.emotionalTone}`.toLowerCase();

  // Try to find a matching subcategory based on scene keywords
  for (const sub of def.subcategories) {
    const words = sub.split(" ");
    if (words.some((w) => scene.includes(w))) return sub;
  }

  // Fall back to first subcategory
  return def.subcategories[0];
}

// ── Compose Single Layer Prompt ────────────────────────────────

export interface LayerPromptInput {
  layerType: AtmosphereLayerType;
  brief: AtmosphereBrief;
  subcategoryOverride?: string;
  customExclusions?: string[];
}

export function composeLayerPrompt(input: LayerPromptInput): string {
  const { layerType, brief, subcategoryOverride, customExclusions } = input;
  const template = LAYER_TEMPLATES[layerType];

  const subcategory = subcategoryOverride || pickSubcategory(layerType, brief);
  const autoExclusions = LAYER_EXCLUSIONS[layerType];
  const briefExclusions = brief.avoidedSounds.map((s) => `no ${s}`);
  const allExclusions = [...new Set([...autoExclusions, ...briefExclusions, ...(customExclusions ?? [])])];

  // Dramatic fragments for emotional context
  const dramaticFrags = dramaticToFragments(brief.dramaticValues);
  const emotion = brief.emotionalTone || dramaticFrags.join(", ") || "neutral";
  const narrative = brief.narrativeFunction || "atmospheric";

  // Distance based on layer type
  const distanceMap: Partial<Record<AtmosphereLayerType, string>> = {
    base_bed: "wide ambient",
    ecology: "mid to far",
    texture: "close",
    spatial: "far",
    dramatic: "ambient",
    synthetic: "abstract",
    micro_event: "close to mid",
  };

  const prompt = template
    .replace("{location}", brief.location || brief.scene || "the environment")
    .replace("{time}", brief.timeOfDay === "unspecified" ? "" : brief.timeOfDay)
    .replace("{weather}", brief.weather || "")
    .replace("{density}", brief.density)
    .replace("{realism}", brief.realismLevel)
    .replace("{subcategory}", subcategory)
    .replace("{distance}", distanceMap[layerType] ?? "mid")
    .replace("{emotion}", emotion)
    .replace("{narrative}", narrative)
    .replace("{exclusions}", allExclusions.join(", "))
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();

  return prompt;
}

// ── Decompose Atmosphere into Layers ───────────────────────────

export function decomposeAtmosphere(brief: AtmosphereBrief): AtmosphereLayer[] {
  return LAYER_TYPE_DEFS.map((def, index) => {
    const promptText = composeLayerPrompt({
      layerType: def.id,
      brief,
    });

    // Adjust intensity/density based on brief presence levels
    let intensityBase = 0.5;
    if (def.id === "ecology") {
      intensityBase = brief.animalPresence === "dominant" ? 0.8
        : brief.animalPresence === "moderate" ? 0.5
        : brief.animalPresence === "subtle" ? 0.3 : 0.1;
    }
    if (def.id === "synthetic") {
      intensityBase = brief.syntheticPresence === "dominant" ? 0.8
        : brief.syntheticPresence === "moderate" ? 0.5
        : brief.syntheticPresence === "subtle" ? 0.3 : 0.1;
    }

    // Dramatic/synthetic layers can use music_bed engine for richer beds
    const useMusicBed = (def.id === "dramatic" || def.id === "synthetic")
      && brief.syntheticPresence !== "none";

    return {
      id: `layer-${def.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      layerType: def.id,
      layerRole: pickSubcategory(def.id, brief),
      promptText,
      intensity: intensityBase,
      density: brief.density === "sparse" ? 0.2
        : brief.density === "light" ? 0.35
        : brief.density === "moderate" ? 0.5
        : brief.density === "dense" ? 0.7 : 0.9,
      distance: def.id === "texture" ? 0.2
        : def.id === "spatial" ? 0.8
        : def.id === "micro_event" ? 0.3 : 0.5,
      movement: (brief.dramaticValues.movement ?? 0.3),
      frequencyRole: def.id === "base_bed" ? "low"
        : def.id === "texture" ? "high"
        : def.id === "spatial" ? "low"
        : def.id === "synthetic" ? "low" : "full",
      loopable: def.defaultLoop,
      durationSeconds: def.defaultDuration,
      promptInfluence: 0.3,
      priority: index,
      muted: false,
      solo: false,
      engineMode: useMusicBed ? "music_bed" as const : "sound_effects" as const,
      status: "draft",
    };
  });
}

// ── Cost Estimation ────────────────────────────────────────────

export function estimateAtmosphereCost(layers: AtmosphereLayer[]): number {
  // SFX layers = 1 credit, Music bed layers = 2 credits. Muted/rejected skipped.
  return layers
    .filter((l) => !l.muted && l.status !== "rejected")
    .reduce((sum, l) => sum + (l.engineMode === "music_bed" ? 2 : 1), 0);
}

// ── Atmosphere Plan JSON ───────────────────────────────────────

export interface AtmospherePlan {
  global_positive_traits: string[];
  global_negative_traits: string[];
  layers: Array<{
    name: string;
    duration_seconds: number;
    loop: boolean;
    role: string;
    prompt: string;
  }>;
}

export function buildAtmospherePlan(
  brief: AtmosphereBrief,
  layers: AtmosphereLayer[]
): AtmospherePlan {
  const positiveTraits = [
    brief.location,
    brief.timeOfDay !== "unspecified" ? brief.timeOfDay : "",
    brief.weather,
    brief.emotionalTone,
    brief.narrativeFunction,
    ...dramaticToFragments(brief.dramaticValues),
  ].filter(Boolean);

  const negativeTraits = [
    ...brief.avoidedSounds.map((s) => `no ${s}`),
    brief.humanPresence === "none" ? "no human presence" : "",
    brief.machinePresence === "none" ? "no machine sounds" : "",
  ].filter(Boolean);

  return {
    global_positive_traits: positiveTraits,
    global_negative_traits: negativeTraits,
    layers: layers
      .filter((l) => !l.muted)
      .map((l) => ({
        name: `${LAYER_TYPE_DEFS.find((d) => d.id === l.layerType)?.label ?? l.layerType}: ${l.layerRole}`,
        duration_seconds: l.durationSeconds,
        loop: l.loopable,
        role: l.layerType,
        prompt: l.promptText,
      })),
  };
}
