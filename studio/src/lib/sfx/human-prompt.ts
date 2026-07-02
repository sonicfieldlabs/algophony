/**
 * Algophony Studio — Human Lab Prompt Engine
 *
 * Builds ElevenLabs-ready prompts for human expression sounds.
 * 8 category-specific templates + crowd plan builders + export utilities.
 */

import type {
  HumanCategory, BodyProfile, ExpressionSettings, CrowdSettings,
  EngineMode, HumanItem,
} from "./human-taxonomy";
import { CROWD_SIZE_LABELS } from "./human-taxonomy";

// ── Default Exclusions ────────────────────────────────────────
// Kept short: ElevenLabs SFX quality drops past ~6 exclusions in the prompt.
// Per-builder inline exclusions (e.g. "no speech") combine with these.

const HUMAN_SFX_EXCLUSIONS = [
  "no music",
];

const HUMAN_VOCAL_EXCLUSIONS = [
  "no music", "isolated vocal",
];

// ── Master Prompt Builder ─────────────────────────────────────

export function buildHumanPrompt(
  category: HumanCategory,
  body: BodyProfile,
  expression: ExpressionSettings,
  crowd: CrowdSettings,
  _engine: EngineMode,
): string {
  if (category === "crowds") return buildCrowdBedPrompt(crowd);

  switch (category) {
    case "breath": return buildBreathPrompt(body, expression);
    case "efforts": return buildEffortPrompt(body, expression);
    case "reactions": return buildReactionPrompt(body, expression);
    case "body_sounds": return buildBodySoundPrompt(body, expression);
    case "cartoon": return buildCartoonPrompt(expression);
    case "combat": return buildCombatPrompt(body, expression);
    case "magic": return buildMagicPrompt(body, expression);
    default: return buildGenericHumanPrompt(category, body, expression);
  }
}

// ── Category Builders ─────────────────────────────────────────

/**
 * Compact a "subject" descriptor — drops the redundant noun suffix
 * (e.g. "presence", "performer", "voice"). Each body attribute is already
 * a descriptive adjective; ElevenLabs SFX doesn't need the suffix word.
 */
function bodyDescriptor(b: BodyProfile): string {
  return `${b.ageImpression} ${b.bodySize} ${b.genderPresentation}`.trim();
}

function buildBreathPrompt(b: BodyProfile, e: ExpressionSettings): string {
  const parts = [
    "Close human breathing",
    e.action || "calm",
    `${e.intensity} ${e.emotion}`,
    bodyDescriptor(b),
    e.realism,
    e.distance,
    "no speech",
    ...HUMAN_VOCAL_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildEffortPrompt(b: BodyProfile, e: ExpressionSettings): string {
  const parts = [
    `Short human effort vocalization for ${e.action || "physical exertion"}`,
    bodyDescriptor(b),
    `${e.intensity} ${e.emotion}`,
    `${b.energyLevel} energy`,
    e.realism,
    e.distance,
    "no words",
    ...HUMAN_VOCAL_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildReactionPrompt(b: BodyProfile, e: ExpressionSettings): string {
  const parts = [
    `Human ${e.action || "reaction"}`,
    `${e.intensity} ${e.emotion}`,
    `${b.ageImpression} ${b.genderPresentation}`,
    e.painLevel !== "none" ? `${e.painLevel} pain` : undefined,
    e.realism,
    e.distance,
    "non-verbal",
    ...HUMAN_VOCAL_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildBodySoundPrompt(b: BodyProfile, e: ExpressionSettings): string {
  const parts = [
    "Close-mic human body sound",
    e.action || "body movement",
    `${b.bodySize}, ${e.intensity}`,
    e.realism,
    e.distance,
    "no voice",
    ...HUMAN_SFX_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildCartoonPrompt(e: ExpressionSettings): string {
  const parts = [
    "Exaggerated cartoon human reaction",
    e.action || "comic expression",
    `${e.emotion}, playful`,
    `${e.intensity} exaggeration`,
    "short, expressive, for character animation",
    ...HUMAN_SFX_EXCLUSIONS,
    "no full dialogue",
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildCombatPrompt(b: BodyProfile, e: ExpressionSettings): string {
  const parts = [
    "Short combat effort vocal",
    e.action || "attack grunt",
    `${e.intensity} ${e.emotion}`,
    bodyDescriptor(b),
    e.painLevel !== "none" ? `${e.painLevel} pain` : undefined,
    `${b.energyLevel} energy`,
    `${e.realism} cinematic`,
    e.distance,
    "no full words",
    ...HUMAN_VOCAL_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildMagicPrompt(b: BodyProfile, e: ExpressionSettings): string {
  const parts = [
    "Short mystical human vocal",
    e.action || "spell whisper",
    `${e.intensity} ${e.emotion}`,
    `${b.ageImpression} ${b.genderPresentation}`,
    "breathy, ritual-like",
    e.realism,
    e.distance,
    "no clear lyrics",
    ...HUMAN_VOCAL_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

function buildGenericHumanPrompt(category: HumanCategory, b: BodyProfile, e: ExpressionSettings): string {
  const catLabel = category.replace(/_/g, " ");
  const parts = [
    `Human ${catLabel}`,
    e.action || catLabel,
    `${e.intensity} ${e.emotion}`,
    bodyDescriptor(b),
    e.realism,
    e.distance,
    ...HUMAN_VOCAL_EXCLUSIONS,
  ].filter(Boolean);
  return parts.join(", ") + ".";
}

// ── Crowd Builders ────────────────────────────────────────────

export function buildCrowdBedPrompt(c: CrowdSettings): string {
  const sizeLabel = CROWD_SIZE_LABELS[c.crowdSize];
  const parts = [
    c.loopable ? "Loopable" : "Non-loopable",
    `${sizeLabel} ${c.crowdType} crowd ambience`,
    `in ${c.location}`,
    `${c.crowdEmotion} emotion`,
    `${c.movement} crowd movement`,
    `${c.density} density`,
    `medium perspective`,
    `${c.intelligibility.replace(/_/g, " ")} intelligibility`,
    c.language !== "indistinct" ? `${c.language} language` : "no clear language",
    "no music", "no announcer", "no clear individual dialogue unless requested",
    `dense human energy`,
  ];
  return parts.join(", ") + ".";
}

export interface ChantPlanItem {
  index: number;
  role: "leader" | "response" | "scattered";
  prompt: string;
  filename: string;
}

export function buildChantPlan(c: CrowdSettings): ChantPlanItem[] {
  if (!c.chantPhrase.trim()) return [];

  const items: ChantPlanItem[] = [];

  // Leader layers
  const leaderCount = Math.min(c.chantLayerCount, 4);
  for (let i = 0; i < leaderCount; i++) {
    items.push({
      index: items.length,
      role: "leader",
      prompt: `Small group of people chanting "${c.chantPhrase}" in ${c.language}, ${c.crowdEmotion}, close distance, natural crowd energy, not musical, no instruments, take ${i + 1}.`,
      filename: `chant_leaders_${String(i + 1).padStart(2, "0")}`,
    });
  }

  // Response layers
  if (c.chantLayerCount > 2) {
    items.push({
      index: items.length,
      role: "response",
      prompt: `Crowd response echo of "${c.chantPhrase}" in ${c.language}, ${c.crowdEmotion}, medium distance, larger group, slightly delayed, natural, no instruments.`,
      filename: `chant_response_01`,
    });
  }

  // Scattered shouts
  items.push({
    index: items.length,
    role: "scattered",
    prompt: `Scattered individual shouts and cheers from a ${c.crowdEmotion} crowd, ${c.location}, ${c.intelligibility.replace(/_/g, " ")} words, no music, no chant rhythm.`,
    filename: `scattered_shouts_01`,
  });

  return items;
}

export interface HybridCrowdLayer {
  index: number;
  layerName: string;
  engineMode: EngineMode;
  prompt: string;
  dawNote: string;
}

export function buildHybridCrowdPlan(c: CrowdSettings): HybridCrowdLayer[] {
  const layers: HybridCrowdLayer[] = [];

  // Layer 1: SFX crowd bed
  layers.push({
    index: 0,
    layerName: "Crowd Bed",
    engineMode: "sfx",
    prompt: buildCrowdBedPrompt({ ...c, loopable: true }),
    dawNote: "Pan center, low volume, looped, send to room reverb.",
  });

  // Layer 2: Chant/dialogue foreground (if chant phrase exists)
  if (c.chantPhrase.trim()) {
    layers.push({
      index: 1,
      layerName: "Chant Group",
      engineMode: "sfx",
      prompt: `Small group of people chanting "${c.chantPhrase}" in ${c.language}, ${c.crowdEmotion}, close distance, natural crowd energy, not musical, no instruments.`,
      dawNote: "Pan slightly left, medium volume, offset 100ms from bed start.",
    });
  }

  // Layer 3: Scattered close reactions
  layers.push({
    index: layers.length,
    layerName: "Close Reactions",
    engineMode: "sfx",
    prompt: `Close individual human reactions from a ${c.crowdEmotion} crowd, ${c.location}, short exclamations and breathing, isolated, no music.`,
    dawNote: "Random pan positions, varied timing offsets (80-240ms), foreground layer.",
  });

  // Layer 4: Distance atmosphere
  layers.push({
    index: layers.length,
    layerName: "Distance Layer",
    engineMode: "sfx",
    prompt: `Distant ${c.crowdSize} crowd murmur in ${c.location}, ${c.crowdEmotion}, far perspective, indistinct, loopable, no music.`,
    dawNote: "Pan center, low volume, heavy reverb, loop underneath all layers.",
  });

  return layers;
}

// ── Cost Estimation ───────────────────────────────────────────

export function estimateHumanCost(itemCount: number): number {
  return itemCount;
}

// ── Export ─────────────────────────────────────────────────────

export function exportHumanManifest(items: HumanItem[], setName: string): object {
  return {
    set: setName,
    category: items[0]?.category ?? "breath",
    itemCount: items.length,
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      engineMode: item.engineMode,
      prompt: item.composedPrompt,
      audioUrl: item.audioUrl ?? null,
      takeNumber: item.takeNumber,
      status: item.status,
      dawNotes: item.dawNotes ?? null,
    })),
  };
}

export function exportCrowdDAWNotes(layers: HybridCrowdLayer[]): string {
  const lines = [
    "# Crowd Layer DAW Notes",
    "",
    ...layers.map((l) => [
      `## Layer ${l.index + 1}: ${l.layerName}`,
      `Engine: ${l.engineMode}`,
      `DAW: ${l.dawNote}`,
      "",
    ].join("\n")),
  ];
  return lines.join("\n");
}

export function exportHumanCSV(items: HumanItem[]): string {
  const header = "Index,Category,Engine,Take,Prompt,Status,Audio URL,DAW Notes";
  const rows = items.map((item, i) =>
    [
      i,
      item.category,
      item.engineMode,
      item.takeNumber,
      `"${item.composedPrompt.replace(/"/g, '""')}"`,
      item.status,
      item.audioUrl ?? "",
      `"${(item.dawNotes ?? "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
