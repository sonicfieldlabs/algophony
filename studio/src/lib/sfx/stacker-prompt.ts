/**
 * Algophony Studio — Stacker Prompt Engine
 *
 * Decomposes cue descriptions into layered stacks and composes
 * frequency-role-aware prompts for each layer. Integrates with
 * the existing scene-breakdown keyword system but outputs
 * spectral component layers instead of flat event cards.
 */

import type {
  StackerCue,
  StackerLayer,
  StackerLayerType,
  CueContext,
} from "./stacker-taxonomy";
import {
  createDefaultLayer,
  getLayerTypeDef,
  getFrequencyRoleDef,
  type NamingConvention,
} from "./stacker-taxonomy";

// ── Layer Exclusions ──────────────────────────────────────────

const LAYER_EXCLUSIONS: Record<StackerLayerType, string[]> = {
  transient: ["no sustained sounds", "no ambience", "no music", "no reverb tail"],
  body: ["no sharp transients", "no high-frequency detail only", "no music"],
  texture: ["no heavy body", "no dominant low frequency", "no music"],
  tail: ["no attack transient", "no music", "no dialogue"],
  space: ["no close events", "no music", "no speech", "no sharp transients"],
  movement: ["no static sounds", "no music", "no dialogue"],
  impact: ["no sustained ambience", "no music", "no dialogue"],
  sweetener: ["no dominant sound", "no music", "no heavy bass"],
  sub_layer: ["no high frequencies", "no clicks", "no music", "no dialogue"],
  vocal_layer: ["no music", "no instruments", "no synthetic tones"],
  mechanical: ["no organic sounds", "no music", "no voices"],
  organic: ["no mechanical sounds", "no music", "no synthetic"],
};

// ── Layer Templates ───────────────────────────────────────────

const LAYER_TEMPLATES: Record<StackerLayerType, string> = {
  transient:
    "Sharp {description} transient onset, very short, percussive attack. {freq_injection}. {exclusions}.",
  body:
    "{description} body layer, main weight and mass, sustained mid-low presence. {freq_injection}. {exclusions}.",
  texture:
    "Close {description} texture detail, surface material feel, fine grain. {freq_injection}. {exclusions}.",
  tail:
    "{description} decay tail, room reflection, natural release and fade. {freq_injection}. {exclusions}.",
  space:
    "{description} spatial environment layer, room character, distance and reverb. {freq_injection}. {exclusions}.",
  movement:
    "{description} movement layer, motion energy, velocity and gesture. {freq_injection}. {exclusions}.",
  impact:
    "{description} impact layer, collision force, hit moment. {freq_injection}. {exclusions}.",
  sweetener:
    "Subtle {description} sweetener accent, design detail, ear candy. {freq_injection}. {exclusions}.",
  sub_layer:
    "Deep {description} sub-bass layer, felt not heard, rumble weight. {freq_injection}. {exclusions}.",
  vocal_layer:
    "{description} vocal/creature layer, breath or vocalization. {freq_injection}. {exclusions}.",
  mechanical:
    "{description} mechanical layer, servo, gear, hydraulic detail. {freq_injection}. {exclusions}.",
  organic:
    "{description} organic layer, wet, fleshy, biological texture. {freq_injection}. {exclusions}.",
};

// ── Compose Layer Prompt ──────────────────────────────────────

export function composeLayerPrompt(layer: StackerLayer, cue: StackerCue): string {
  const template = LAYER_TEMPLATES[layer.layerType];
  const freqRole = getFrequencyRoleDef(layer.frequencyRole);
  const exclusions = LAYER_EXCLUSIONS[layer.layerType];

  // Use custom prompt text if provided, otherwise use cue description
  const description = layer.promptText.trim() || cue.description;

  let prompt = template
    .replace("{description}", description)
    .replace("{freq_injection}", freqRole.promptInjection)
    .replace("{exclusions}", exclusions.join(", "));

  // Add anti-injection for frequency role
  if (freqRole.antiInjection) {
    prompt += ` ${freqRole.antiInjection}.`;
  }

  // Add duration hint
  if (layer.durationSeconds <= 2) {
    prompt += " Very short.";
  } else if (layer.durationSeconds >= 10) {
    prompt += " Extended duration.";
  }

  if (layer.loop) {
    prompt += " Seamless loop.";
  }

  return prompt.replace(/\s+/g, " ").trim();
}

// ── Decompose Event ───────────────────────────────────────────

interface DecomposeResult {
  layers: StackerLayer[];
  cueName: string;
}

/** Keyword patterns for detecting what layer types to generate */
const DECOMPOSE_PATTERNS: Array<{
  keywords: RegExp;
  layers: StackerLayerType[];
}> = [
  // Metal/mechanical events
  { keywords: /\b(metal|steel|iron|hatch|gate|lock|chain|cage)\b/i, layers: ["transient", "body", "mechanical", "tail", "space"] },
  // Organic/creature events
  { keywords: /\b(creature|monster|beast|growl|breath|roar|hiss)\b/i, layers: ["transient", "vocal_layer", "body", "organic", "tail"] },
  // Impact events
  { keywords: /\b(hit|punch|kick|crash|smash|slam|collide|impact|explosion)\b/i, layers: ["transient", "body", "impact", "sub_layer", "tail"] },
  // Footstep events
  { keywords: /\b(footstep|step|walk|boot|shoe|stride|stomp)\b/i, layers: ["transient", "body", "texture", "tail"] },
  // Door events
  { keywords: /\b(door|hatch|gate|lid|panel|open|close|shut)\b/i, layers: ["transient", "body", "mechanical", "tail", "space"] },
  // Water events
  { keywords: /\b(water|splash|drip|pour|flood|rain|wave|submerge)\b/i, layers: ["transient", "body", "texture", "movement", "tail"] },
  // Vehicle/machine events
  { keywords: /\b(engine|motor|car|truck|vehicle|machine|gear|servo)\b/i, layers: ["mechanical", "body", "sub_layer", "movement", "texture"] },
  // UI/interface events
  { keywords: /\b(button|click|toggle|switch|interface|ui|menu|notification)\b/i, layers: ["transient", "body", "sweetener"] },
  // Magic/sci-fi events
  { keywords: /\b(magic|spell|portal|laser|energy|force|plasma|warp)\b/i, layers: ["transient", "body", "sweetener", "tail", "sub_layer"] },
  // Weapon events
  { keywords: /\b(gun|shot|bullet|sword|blade|arrow|weapon|fire)\b/i, layers: ["transient", "impact", "body", "tail", "sweetener"] },
];

/** Default stack for unrecognized events */
const DEFAULT_LAYERS: StackerLayerType[] = ["transient", "body", "texture", "tail", "space"];

export function decomposeEvent(description: string, context: CueContext): DecomposeResult {
  if (!description.trim()) {
    return { layers: [], cueName: "Untitled Cue" };
  }

  // Find best matching pattern
  let layerTypes: StackerLayerType[] = DEFAULT_LAYERS;
  for (const pattern of DECOMPOSE_PATTERNS) {
    if (pattern.keywords.test(description)) {
      layerTypes = pattern.layers;
      break;
    }
  }

  // Build cue name from first 40 chars
  const cueName = description.charAt(0).toUpperCase() + description.slice(1, 40).trim();

  // Create layers with auto-generated prompts
  const layers: StackerLayer[] = layerTypes.map((type, i) => {
    const layer = createDefaultLayer(type, i);
    // Generate contextual prompt text based on description and layer type
    layer.promptText = buildLayerDescription(description, type, context);
    return layer;
  });

  return { layers, cueName };
}

function buildLayerDescription(
  cueDescription: string,
  layerType: StackerLayerType,
  _context: CueContext
): string {
  // Build a focused description for this layer based on the cue
  switch (layerType) {
    case "transient":
      return `${cueDescription} — initial contact/onset`;
    case "body":
      return `${cueDescription} — main weight and resonance`;
    case "texture":
      return `${cueDescription} — surface material detail`;
    case "tail":
      return `${cueDescription} — decay and room reflection`;
    case "space":
      return `${cueDescription} — environmental room tone`;
    case "movement":
      return `${cueDescription} — motion and velocity`;
    case "impact":
      return `${cueDescription} — force and collision`;
    case "sweetener":
      return `${cueDescription} — subtle design accent`;
    case "sub_layer":
      return `${cueDescription} — sub-bass rumble`;
    case "vocal_layer":
      return `${cueDescription} — breath/vocalization`;
    case "mechanical":
      return `${cueDescription} — mechanical component`;
    case "organic":
      return `${cueDescription} — organic/biological element`;
    default:
      return cueDescription;
  }
}

// ── Cost Estimation ───────────────────────────────────────────

export function estimateStackCost(layers: StackerLayer[]): number {
  return layers.filter((l) => !l.muted && l.status !== "generated").length;
}

// ── Naming ────────────────────────────────────────────────────

export function generateLayerName(
  cue: StackerCue,
  layer: StackerLayer,
  index: number,
  convention: NamingConvention
): string {
  const slug = cue.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "cue";
  const layerSlug = layer.layerType.replace(/_/g, "");
  const num = String(index + 1).padStart(2, "0");

  switch (convention) {
    case "film_foley":
      return `${slug}_${layerSlug}_v${num}`;
    case "game_asset":
      return `${slug}_${layerSlug}_${num}`;
    case "library":
      return `sfx_${slug}_${layerSlug}_${num}`;
    default:
      return `${slug}_${layerSlug}_${num}`;
  }
}

// ── Export ─────────────────────────────────────────────────────

export function exportStackManifest(cue: StackerCue): object {
  return {
    cue: {
      id: cue.id,
      name: cue.name,
      description: cue.description,
      context: cue.context,
      layerCount: cue.layers.length,
    },
    layers: cue.layers.map((l, i) => ({
      index: i,
      name: generateLayerName(cue, l, i, cue.namingConvention),
      type: l.layerType,
      frequencyRole: l.frequencyRole,
      frequencyRange: getFrequencyRoleDef(l.frequencyRole).range,
      prompt: l.promptText,
      composedPrompt: composeLayerPrompt(l, cue),
      duration: l.durationSeconds,
      loop: l.loop,
      audioUrl: l.audioUrl ?? null,
      generationId: l.generationId ?? null,
      sourceKind: l.sourceKind ?? null,
      sourceAssetId: l.sourceAssetId ?? null,
      sourceFileName: l.sourceFileName ?? null,
      sourcePath: l.sourcePath ?? null,
      importedFrom: l.importedFrom ?? null,
      importedModule: l.importedModule ?? null,
      metadata: l.metadata ?? null,
      muted: l.muted,
      solo: l.solo,
    })),
    namingConvention: cue.namingConvention,
    createdAt: new Date(cue.createdAt).toISOString(),
  };
}

export function exportDAWSessionInfo(cue: StackerCue): object {
  return {
    session: {
      name: cue.name,
      sampleRate: 44100,
      bitDepth: 24,
    },
    tracks: cue.layers
      .filter((l) => !l.muted)
      .map((l, i) => ({
        index: i + 1,
        name: generateLayerName(cue, l, i, cue.namingConvention),
        layerType: l.layerType,
        frequencyRole: l.frequencyRole,
        frequencyRange: getFrequencyRoleDef(l.frequencyRole).range,
        pan: 0,
        volume: 0,
        solo: l.solo,
        muted: l.muted,
        color: `hsl(${getLayerTypeDef(l.layerType).hue}, 70%, 50%)`,
        file: l.audioUrl ? `${generateLayerName(cue, l, i, cue.namingConvention)}.mp3` : null,
        sourceKind: l.sourceKind ?? null,
        sourceFileName: l.sourceFileName ?? null,
        sourcePath: l.sourcePath ?? null,
      })),
  };
}

export function exportGameManifest(cue: StackerCue): object {
  return {
    event: {
      name: cue.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      context: cue.context,
      layerCount: cue.layers.filter((l) => !l.muted).length,
    },
    layers: cue.layers
      .filter((l) => !l.muted)
      .map((l, i) => ({
        name: generateLayerName(cue, l, i, cue.namingConvention),
        type: l.layerType,
        frequencyRole: l.frequencyRole,
        file: l.audioUrl ? `${generateLayerName(cue, l, i, cue.namingConvention)}.mp3` : null,
        sourceKind: l.sourceKind ?? null,
        sourceFileName: l.sourceFileName ?? null,
        playMode: l.loop ? "loop" : "oneshot",
        duration: l.durationSeconds,
      })),
  };
}

export function exportPromptCSV(cue: StackerCue): string {
  const header = "Index,Layer Type,Frequency Role,Duration,Loop,Source,Source File,Prompt,Composed Prompt";
  const rows = cue.layers.map((l, i) =>
    [
      i,
      l.layerType,
      l.frequencyRole,
      l.durationSeconds,
      l.loop,
      l.sourceKind ?? "",
      `"${(l.sourceFileName ?? "").replace(/"/g, '""')}"`,
      `"${l.promptText.replace(/"/g, '""')}"`,
      `"${composeLayerPrompt(l, cue).replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
