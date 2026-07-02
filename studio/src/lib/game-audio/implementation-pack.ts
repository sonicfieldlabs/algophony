/**
 * Algophony Studio — Game Audio Implementation Pack
 *
 * Generates implementation-grade manifests for Wwise, FMOD,
 * Unity, and Unreal. Supports round-robin, intensity ladders,
 * surface variants, distance layers, loop groups, UI state sets,
 * and RTPC parameter suggestions.
 */

import type { GameEngine } from "@/lib/sfx/export-taxonomy";

// ── Extended Event Types ─────────────────────────────────────

export const IMPLEMENTATION_TYPES = [
  "single",
  "round_robin",
  "randomization",
  "intensity_ladder",
  "distance_ladder",
  "surface_variant",
  "speed_variant",
  "loop_group",
  "ui_state_set",
] as const;

export type ImplementationType = (typeof IMPLEMENTATION_TYPES)[number];

export const IMPLEMENTATION_TYPE_LABELS: Record<ImplementationType, string> = {
  single: "Single Shot",
  round_robin: "Round-Robin",
  randomization: "Randomization Group",
  intensity_ladder: "Intensity Ladder",
  distance_ladder: "Distance Layers",
  surface_variant: "Surface Variants",
  speed_variant: "Speed Variants",
  loop_group: "Loop Group (Intro/Loop/Outro)",
  ui_state_set: "UI State Set",
};

// ── Parameter Definitions ────────────────────────────────────

export interface RtpcParameter {
  name: string;
  displayName: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  mappedTo: string;
}

export const STANDARD_RTPC_PARAMS: Record<string, RtpcParameter> = {
  intensity: {
    name: "RTPC_Intensity",
    displayName: "Intensity",
    min: 0, max: 100, defaultValue: 50,
    unit: "%",
    mappedTo: "volume, pitch",
  },
  distance: {
    name: "RTPC_Distance",
    displayName: "Distance",
    min: 0, max: 100, defaultValue: 0,
    unit: "m",
    mappedTo: "volume, low-pass filter, reverb send",
  },
  speed: {
    name: "RTPC_Speed",
    displayName: "Speed",
    min: 0, max: 100, defaultValue: 50,
    unit: "%",
    mappedTo: "pitch, playback rate",
  },
  surface: {
    name: "Switch_Surface",
    displayName: "Surface Material",
    min: 0, max: 1, defaultValue: 0,
    mappedTo: "switch container",
  },
  urgency: {
    name: "RTPC_Urgency",
    displayName: "Urgency",
    min: 0, max: 100, defaultValue: 30,
    unit: "%",
    mappedTo: "volume, pitch, attack time",
  },
};

// ── Surface / State Presets ──────────────────────────────────

export const SURFACE_PRESETS = [
  "concrete", "wood", "metal", "gravel", "grass",
  "tile", "carpet", "sand", "snow", "water",
  "mud", "glass", "plastic", "stone", "rubber",
] as const;

export const UI_STATE_PRESETS = [
  "default", "hover", "active", "disabled",
  "success", "error", "warning", "notification",
  "open", "close", "toggle_on", "toggle_off",
] as const;

export const INTENSITY_PRESETS = [
  "light", "medium", "heavy",
] as const;

export const SPEED_PRESETS = [
  "walk", "run", "crouch", "sprint",
] as const;

export const DISTANCE_PRESETS = [
  "near", "mid", "far", "distant",
] as const;

// ── Implementation Event ─────────────────────────────────────

export interface ImplementationEvent {
  eventPath: string;
  displayName: string;
  category: string;
  implementationType: ImplementationType;
  randomization: boolean;
  noRepeat: boolean;
  maxInstances: number;
  cooldownMs: number;
  priority: number;

  variations: ImplementationVariation[];
  parameters: EventParameters;
  loopGroup?: LoopGroupConfig;
  uiStates?: UiStateConfig;
  rtpcSuggestions: RtpcParameter[];

  metadata: Record<string, unknown>;
}

export interface ImplementationVariation {
  file: string;
  label: string;
  intensity?: string;
  distance?: string;
  surface?: string;
  speed?: string;
  state?: string;
  weight?: number;
  gainDb?: number;
  pitchCents?: number;
}

export interface EventParameters {
  surface?: string[];
  speed?: string[];
  intensity?: string[];
  distance?: string[];
  custom?: Array<{ name: string; values: string[] }>;
}

export interface LoopGroupConfig {
  introFile?: string;
  loopFile: string;
  outroFile?: string;
  crossfadeMs: number;
  loopCount: number;
}

export interface UiStateConfig {
  states: Array<{
    state: string;
    file: string;
    gainDb?: number;
    pitchCents?: number;
  }>;
}

// ── Full Implementation Pack ─────────────────────────────────

export interface GameImplementationPack {
  project: string;
  engine: GameEngine;
  version: string;
  generatedAt: string;
  events: ImplementationEvent[];
  globalSettings: {
    defaultMaxInstances: number;
    defaultCooldownMs: number;
    defaultPriority: number;
    outputBus: string;
  };
  bankSuggestions: BankSuggestion[];
}

export interface BankSuggestion {
  bankName: string;
  categories: string[];
  estimatedSizeMb: number;
  loadStrategy: "always" | "on_demand" | "prefetch";
}

// ── Inference Engine ─────────────────────────────────────────

/**
 * Auto-detect implementation structure from card metadata.
 */
export function inferEventStructure(
  cards: Record<string, unknown>[]
): ImplementationEvent[] {
  const byCategory = new Map<string, Record<string, unknown>[]>();
  for (const card of cards) {
    const cat = String(card.category ?? "misc").toLowerCase();
    const existing = byCategory.get(cat) ?? [];
    existing.push(card);
    byCategory.set(cat, existing);
  }

  return Array.from(byCategory.entries()).map(([category, items]) => {
    const type = inferImplementationType(category, items);
    const params = inferParameters(category, items);
    const variations = items.map((item, i) => ({
      file: `${category}_${String(item.title ?? "sound").replace(/\s+/g, "_").toLowerCase()}_${String(i + 1).padStart(2, "0")}.mp3`,
      label: String(item.title ?? `Variation ${i + 1}`),
      intensity: type === "intensity_ladder" ? INTENSITY_PRESETS[Math.min(i, 2)] : undefined,
      weight: 1,
    }));

    return {
      eventPath: `${category}/${String(items[0]?.title ?? "sound").replace(/\s+/g, "_").toLowerCase()}`,
      displayName: `${capitalize(category)} — ${String(items[0]?.title ?? "Sound")}`,
      category,
      implementationType: type,
      randomization: type === "round_robin" || type === "randomization",
      noRepeat: type === "round_robin",
      maxInstances: category === "ambience" ? 1 : 4,
      cooldownMs: category === "footsteps" ? 100 : 0,
      priority: 50,
      variations,
      parameters: params,
      rtpcSuggestions: inferRtpc(category, type),
      metadata: {
        sourceCardCount: items.length,
        loop: Boolean(items[0]?.loop),
      },
    };
  });
}

function inferImplementationType(category: string, items: Record<string, unknown>[]): ImplementationType {
  if (items.length <= 1) return "single";
  if (category === "footsteps") return "surface_variant";
  if (category === "ui" || category === "interface") return "ui_state_set";
  if (category === "ambience" || category === "atmosphere") return "loop_group";
  if (items.length >= 3 && /impact|hit|crash|boom/.test(category)) return "intensity_ladder";
  if (items.length >= 2) return "round_robin";
  return "single";
}

function inferParameters(category: string, _items: Record<string, unknown>[]): EventParameters {
  const params: EventParameters = {};
  if (category === "footsteps") {
    params.surface = [...SURFACE_PRESETS.slice(0, 5)];
    params.speed = [...SPEED_PRESETS];
  }
  if (/impact|hit|crash/.test(category)) {
    params.intensity = [...INTENSITY_PRESETS];
  }
  if (category === "ambience") {
    params.distance = [...DISTANCE_PRESETS];
  }
  return params;
}

function inferRtpc(category: string, type: ImplementationType): RtpcParameter[] {
  const params: RtpcParameter[] = [];
  if (type === "intensity_ladder") params.push(STANDARD_RTPC_PARAMS.intensity);
  if (type === "distance_ladder" || category === "ambience") params.push(STANDARD_RTPC_PARAMS.distance);
  if (type === "speed_variant" || category === "footsteps") params.push(STANDARD_RTPC_PARAMS.speed);
  if (type === "surface_variant") params.push(STANDARD_RTPC_PARAMS.surface);
  if (type === "ui_state_set") params.push(STANDARD_RTPC_PARAMS.urgency);
  return params;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Pack Builder ─────────────────────────────────────────────

export function buildImplementationPack(
  project: string,
  engine: GameEngine,
  events: ImplementationEvent[]
): GameImplementationPack {
  const categories = [...new Set(events.map((e) => e.category))];

  return {
    project,
    engine,
    version: "1.0",
    generatedAt: new Date().toISOString(),
    events,
    globalSettings: {
      defaultMaxInstances: 4,
      defaultCooldownMs: 0,
      defaultPriority: 50,
      outputBus: "Master_SFX",
    },
    bankSuggestions: generateBankSuggestions(events, categories),
  };
}

function generateBankSuggestions(events: ImplementationEvent[], categories: string[]): BankSuggestion[] {
  const alwaysLoaded = ["ui", "footsteps"];
  const prefetch = ["ambience", "atmosphere"];

  return categories.map((cat) => {
    const catEvents = events.filter((e) => e.category === cat);
    const totalVariations = catEvents.reduce((sum, e) => sum + e.variations.length, 0);
    const estimatedSizeMb = totalVariations * 0.5; // rough estimate

    let loadStrategy: BankSuggestion["loadStrategy"] = "on_demand";
    if (alwaysLoaded.includes(cat)) loadStrategy = "always";
    if (prefetch.includes(cat)) loadStrategy = "prefetch";

    return {
      bankName: `Bank_${capitalize(cat)}`,
      categories: [cat],
      estimatedSizeMb: Math.round(estimatedSizeMb * 10) / 10,
      loadStrategy,
    };
  });
}

// ── Engine-Specific Exports ──────────────────────────────────

/**
 * Generate Wwise-compatible SoundBank XML structure.
 */
export function buildWwiseSoundBankXml(pack: GameImplementationPack): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="utf-8"?>`);
  lines.push(`<!-- Algophony Studio — Wwise Import Manifest -->`);
  lines.push(`<!-- Generated: ${pack.generatedAt} -->`);
  lines.push(`<WwiseDocument Type="WorkUnit" ID="{AlgophonyStudio}" SchemaVersion="110">`);
  lines.push(`  <AudioObjects>`);

  for (const event of pack.events) {
    const containerType = event.randomization ? "RandomOrSequenceContainer" : "SoundSFX";
    lines.push(`    <${containerType} Name="${escapeXml(event.displayName)}" ID="{${event.eventPath}}">`);

    if (event.rtpcSuggestions.length > 0) {
      lines.push(`      <RTPCList>`);
      for (const rtpc of event.rtpcSuggestions) {
        lines.push(`        <RTPC Name="${rtpc.name}" Min="${rtpc.min}" Max="${rtpc.max}" Default="${rtpc.defaultValue}" />`);
      }
      lines.push(`      </RTPCList>`);
    }

    if (event.randomization) {
      lines.push(`      <RandomMode>Standard</RandomMode>`);
      lines.push(`      <AvoidRepeating>${event.noRepeat ? "1" : "0"}</AvoidRepeating>`);
    }

    lines.push(`      <ChildrenList>`);
    for (const v of event.variations) {
      lines.push(`        <Sound Name="${escapeXml(v.label)}">`);
      lines.push(`          <AudioFile>${escapeXml(v.file)}</AudioFile>`);
      if (v.gainDb) lines.push(`          <Volume>${v.gainDb}</Volume>`);
      if (v.pitchCents) lines.push(`          <Pitch>${v.pitchCents}</Pitch>`);
      lines.push(`        </Sound>`);
    }
    lines.push(`      </ChildrenList>`);

    lines.push(`      <MaxInstances>${event.maxInstances}</MaxInstances>`);
    lines.push(`      <Priority>${event.priority}</Priority>`);
    lines.push(`    </${containerType}>`);
  }

  lines.push(`  </AudioObjects>`);

  // Banks
  lines.push(`  <SoundBanks>`);
  for (const bank of pack.bankSuggestions) {
    lines.push(`    <SoundBank Name="${bank.bankName}" Load="${bank.loadStrategy}" EstimatedSizeMB="${bank.estimatedSizeMb}" />`);
  }
  lines.push(`  </SoundBanks>`);

  lines.push(`</WwiseDocument>`);
  return lines.join("\n");
}

/**
 * Generate FMOD Studio bank manifest.
 */
export function buildFmodBankManifest(pack: GameImplementationPack): object {
  return {
    fmodProject: pack.project,
    generator: "Algophony Studio",
    version: pack.version,
    generatedAt: pack.generatedAt,
    banks: pack.bankSuggestions.map((b) => ({
      name: b.bankName,
      loadingMode: b.loadStrategy === "always" ? "Normal" : b.loadStrategy === "prefetch" ? "Normal" : "Nonblocking",
      events: pack.events
        .filter((e) => b.categories.includes(e.category))
        .map((e) => ({
          path: `event:/${e.eventPath}`,
          type: e.implementationType === "round_robin" ? "MultiInstrument" : e.implementationType === "loop_group" ? "EventInstrument" : "SingleInstrument",
          instruments: e.variations.map((v) => ({
            file: v.file,
            volume: v.gainDb ?? 0,
            pitch: v.pitchCents ?? 0,
            probability: v.weight ?? 1,
          })),
          parameters: e.rtpcSuggestions.map((r) => ({
            name: r.name,
            minimum: r.min,
            maximum: r.max,
            defaultValue: r.defaultValue,
          })),
          maxInstances: e.maxInstances,
          cooldown: e.cooldownMs,
          priority: e.priority,
        })),
    })),
  };
}

/**
 * Generate Unity AudioManager manifest.
 */
export function buildUnityAudioManifest(pack: GameImplementationPack): object {
  return {
    unityVersion: "2022.3+",
    generator: "Algophony Studio",
    generatedAt: pack.generatedAt,
    audioGroups: pack.events.map((e) => ({
      name: e.eventPath.replace(/\//g, "_"),
      path: `Assets/Audio/SFX/${e.category}`,
      playMode: e.randomization ? "Random" : "Sequential",
      avoidRepeat: e.noRepeat,
      maxInstances: e.maxInstances,
      clips: e.variations.map((v) => ({
        clipName: v.file.replace(/\.\w+$/, ""),
        resourcePath: `Audio/SFX/${e.category}/${v.file}`,
        volume: v.gainDb ? Math.pow(10, (v.gainDb ?? 0) / 20) : 1,
        pitch: v.pitchCents ? 1 + (v.pitchCents ?? 0) / 1200 : 1,
        weight: v.weight ?? 1,
      })),
      parameters: Object.fromEntries(
        e.rtpcSuggestions.map((r) => [r.name, { min: r.min, max: r.max, default: r.defaultValue }])
      ),
    })),
    mixerGroups: [...new Set(pack.events.map((e) => e.category))].map((cat) => ({
      name: `SFX_${capitalize(cat)}`,
      parent: "Master_SFX",
      defaultVolume: 1,
    })),
  };
}

/**
 * Generate Unreal Engine SoundCue manifest.
 */
export function buildUnrealSoundCueManifest(pack: GameImplementationPack): object {
  return {
    unrealVersion: "5.3+",
    generator: "Algophony Studio",
    generatedAt: pack.generatedAt,
    soundCues: pack.events.map((e) => ({
      cueName: `SC_${e.eventPath.replace(/\//g, "_")}`,
      packagePath: `/Game/Audio/SFX/${e.category}`,
      nodeType: e.randomization ? "SoundNodeRandom" : "SoundNodeWavePlayer",
      maxConcurrent: e.maxInstances,
      priorityDefault: e.priority / 100,
      waves: e.variations.map((v) => ({
        waveName: v.file.replace(/\.\w+$/, ""),
        assetPath: `/Game/Audio/SFX/${e.category}/${v.file.replace(/\.\w+$/, "")}`,
        volumeMultiplier: v.gainDb ? Math.pow(10, (v.gainDb ?? 0) / 20) : 1,
        pitchMultiplier: v.pitchCents ? 1 + (v.pitchCents ?? 0) / 1200 : 1,
        weight: v.weight ?? 1,
      })),
      attenuationSettings: e.rtpcSuggestions.some((r) => r.name.includes("Distance"))
        ? {
            minDistance: 100,
            maxDistance: 5000,
            falloffMode: "Linear",
            spatialize: true,
          }
        : undefined,
      soundClass: `SFX_${capitalize(e.category)}`,
    })),
    soundClasses: [...new Set(pack.events.map((e) => e.category))].map((cat) => ({
      className: `SFX_${capitalize(cat)}`,
      parentClass: "Master_SFX",
      defaultVolume: 1,
    })),
  };
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
