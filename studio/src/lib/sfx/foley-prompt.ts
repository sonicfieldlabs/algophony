/**
 * Algophony Studio — Foley Room Prompt Engine
 *
 * Builds precise, ElevenLabs-ready Foley prompts from structured controls.
 * Each category has a dedicated template that prioritizes its key attributes.
 * Includes round-robin plan builders and export utilities.
 */

import type {
  FoleyPromptConfig,
  FoleyCategory,
  PerformerSettings,
  MaterialSettings,
  RecordingSettings,
  RoundRobinConfig,
  FootstepFields,
  ClothFields,
  HandFields,
  PropFields,
  DoorFields,
  Surface,
  FoleyItem,
} from "./foley-taxonomy";
import {
  REALISM_LABELS,
  MIC_PERSPECTIVE_LABELS,
  SHOE_TYPE_LABELS,
  STEP_TYPE_LABELS,
  CLOTH_TYPE_LABELS,
  ROOM_SIZE_LABELS,
} from "./foley-taxonomy";

// ── Default Foley Exclusions ──────────────────────────────────

const FOLEY_EXCLUSIONS = [
  "no music", "no dialogue", "no ambience bed", "isolated Foley layer",
];

// ── Master Prompt Builder ─────────────────────────────────────

export function buildFoleyPrompt(config: FoleyPromptConfig): string {
  if (config.customPromptOverride?.trim()) {
    return config.customPromptOverride.trim();
  }

  const { category, performer, material, recording, categoryFields } = config;

  // Build category-specific prompt
  let prompt: string;
  switch (category) {
    case "footsteps":
      prompt = buildFootstepPrompt(performer, material, recording, categoryFields.fields as FootstepFields);
      break;
    case "cloth":
      prompt = buildClothPrompt(performer, material, recording, categoryFields.fields as ClothFields);
      break;
    case "hands":
      prompt = buildHandPrompt(performer, material, recording, categoryFields.fields as HandFields);
      break;
    case "props":
      prompt = buildPropPrompt(performer, material, recording, categoryFields.fields as PropFields);
      break;
    case "doors":
      prompt = buildDoorPrompt(performer, material, recording, categoryFields.fields as DoorFields);
      break;
    default:
      prompt = buildGenericFoleyPrompt(category, performer, material, recording);
  }

  return prompt.replace(/\s+/g, " ").trim();
}

// ── Category Builders ─────────────────────────────────────────

function buildFootstepPrompt(
  p: PerformerSettings, m: MaterialSettings, r: RecordingSettings, f: FootstepFields
): string {
  const mic = MIC_PERSPECTIVE_LABELS[r.micPerspective];
  const shoe = SHOE_TYPE_LABELS[f.shoeType];
  const step = STEP_TYPE_LABELS[f.stepType];
  const surface = `${m.surfaceCondition} ${m.surface}`;
  const realism = REALISM_LABELS[p.realism];
  const room = ROOM_SIZE_LABELS[r.roomSize];

  const parts = [
    `${mic} Foley of a ${p.weight}-weight person wearing ${shoe.toLowerCase()}`,
    `${step.toLowerCase()} on ${surface}`,
  ];

  if (m.wetness !== "dry") parts.push(`${m.wetness} water contact`);
  parts.push(`${p.gestureSpeed} ${p.movementIntention} movement`);
  parts.push(`${realism.toLowerCase()}, ${room.toLowerCase()}`);
  parts.push(FOLEY_EXCLUSIONS.join(", "));

  return parts.join(", ") + ".";
}

function buildClothPrompt(
  p: PerformerSettings, m: MaterialSettings, r: RecordingSettings, f: ClothFields
): string {
  const mic = MIC_PERSPECTIVE_LABELS[r.micPerspective];
  const cloth = CLOTH_TYPE_LABELS[f.clothType];
  const realism = REALISM_LABELS[p.realism];

  const parts = [
    `${mic} Foley of a ${f.fabricWeight} ${cloth.toLowerCase()} moving`,
    `${f.dryWet} fabric, ${f.tightLoose} fit`,
    `${p.gestureSpeed} ${p.movementIntention} body movement`,
    `friction level ${m.friction}`,
    `${realism.toLowerCase()}`,
    FOLEY_EXCLUSIONS.join(", "),
  ];

  return parts.join(", ") + ".";
}

function buildHandPrompt(
  p: PerformerSettings, m: MaterialSettings, r: RecordingSettings, f: HandFields
): string {
  const mic = MIC_PERSPECTIVE_LABELS[r.micPerspective];
  const realism = REALISM_LABELS[p.realism];

  const gloveDesc = f.gloveType === "bare" ? "bare hands" : `${f.gloveType} gloves`;
  const parts = [
    `${mic} Foley of ${gloveDesc} ${f.handAction}`,
    `on ${m.surfaceCondition} ${m.surface}`,
    `${p.contactForce} contact force, ${p.gestureSpeed} movement`,
    `${realism.toLowerCase()}`,
    FOLEY_EXCLUSIONS.join(", "),
  ];

  return parts.join(", ") + ".";
}

function buildPropPrompt(
  p: PerformerSettings, m: MaterialSettings, r: RecordingSettings, f: PropFields
): string {
  const mic = MIC_PERSPECTIVE_LABELS[r.micPerspective];
  const realism = REALISM_LABELS[p.realism];

  const parts = [
    `${mic} Foley of ${f.handlingStyle} handling of a ${f.objectSize} ${f.objectWeight} ${f.objectMaterial} ${f.objectType}`,
    m.surface !== "concrete" ? `on ${m.surfaceCondition} ${m.surface}` : undefined,
    `${p.contactForce} contact, ${p.gestureSpeed} gesture`,
    `${realism.toLowerCase()}`,
    FOLEY_EXCLUSIONS.join(", "),
  ].filter(Boolean);

  return parts.join(", ") + ".";
}

function buildDoorPrompt(
  p: PerformerSettings, m: MaterialSettings, r: RecordingSettings, f: DoorFields
): string {
  const mic = MIC_PERSPECTIVE_LABELS[r.micPerspective];
  const realism = REALISM_LABELS[p.realism];
  const component = f.component.replace(/_/g, " ");

  const parts = [
    `${mic} Foley of a ${f.doorMaterial} door ${component}`,
    `${f.openSpeed} movement, ${f.openForce} force`,
    `${p.movementIntention} intention`,
    `${realism.toLowerCase()}`,
    FOLEY_EXCLUSIONS.join(", "),
  ];

  return parts.join(", ") + ".";
}

function buildGenericFoleyPrompt(
  category: FoleyCategory, p: PerformerSettings, m: MaterialSettings, r: RecordingSettings
): string {
  const mic = MIC_PERSPECTIVE_LABELS[r.micPerspective];
  const realism = REALISM_LABELS[p.realism];
  const catLabel = category.replace(/_/g, " ");

  const parts = [
    `${mic} Foley ${catLabel}`,
    `on ${m.surfaceCondition} ${m.surface}`,
    `${p.weight} weight, ${p.gestureSpeed} speed, ${p.contactForce} contact`,
    `${p.movementIntention} movement`,
    `${realism.toLowerCase()}`,
    FOLEY_EXCLUSIONS.join(", "),
  ];

  return parts.join(", ") + ".";
}

// ── Round-Robin Plan ──────────────────────────────────────────

export interface RoundRobinItem {
  index: number;
  side: "left" | "right";
  takeNumber: number;
  prompt: string;
  filename: string;
}

export function buildRoundRobinPlan(
  config: RoundRobinConfig,
  performer: PerformerSettings,
  material: MaterialSettings,
  recording: RecordingSettings
): RoundRobinItem[] {
  const items: RoundRobinItem[] = [];
  const surfaceSlug = config.surfaces[0] ?? "concrete";
  const shoeSlug = config.shoeType.replace(/_/g, "");

  const buildSideItems = (side: "left" | "right", count: number) => {
    for (let i = 0; i < count; i++) {
      const sideLabel = side === "left" ? "L" : "R";
      const num = String(i + 1).padStart(2, "0");
      const variation = getVariationHint(config.variationStrength, i);

      const prompt = [
        `${MIC_PERSPECTIVE_LABELS[recording.micPerspective]} Foley of a ${performer.weight}-weight person wearing ${SHOE_TYPE_LABELS[config.shoeType].toLowerCase()}`,
        `${STEP_TYPE_LABELS[config.movementType].toLowerCase()} on ${material.surfaceCondition} ${surfaceSlug}`,
        `${side} foot, take ${i + 1}`,
        variation,
        `${REALISM_LABELS[performer.realism].toLowerCase()}`,
        FOLEY_EXCLUSIONS.join(", "),
      ].join(", ") + ".";

      items.push({
        index: items.length,
        side,
        takeNumber: i + 1,
        prompt,
        filename: `${surfaceSlug}_${shoeSlug}_${sideLabel}_${num}`,
      });
    }
  };

  buildSideItems("left", config.leftCount);
  buildSideItems("right", config.rightCount);

  return items;
}

function getVariationHint(strength: "subtle" | "moderate" | "strong", index: number): string {
  if (strength === "subtle") {
    const hints = ["slightly varied pressure", "micro-timing variation", "subtle weight shift", "minimal texture difference"];
    return hints[index % hints.length];
  }
  if (strength === "moderate") {
    const hints = ["varied contact pressure", "different weight transfer", "altered stride rhythm", "shifted timing"];
    return hints[index % hints.length];
  }
  const hints = ["different gesture energy", "altered approach angle", "changed body weight", "distinct surface interaction"];
  return hints[index % hints.length];
}

// ── Surface Variant Plan ──────────────────────────────────────

export interface SurfaceVariantItem {
  index: number;
  surface: Surface;
  prompt: string;
  filename: string;
}

export function buildSurfaceVariantPlan(
  surfaces: Surface[],
  config: RoundRobinConfig,
  performer: PerformerSettings,
  recording: RecordingSettings
): SurfaceVariantItem[] {
  return surfaces.map((surface, i) => {
    const shoeSlug = config.shoeType.replace(/_/g, "");
    const prompt = [
      `${MIC_PERSPECTIVE_LABELS[recording.micPerspective]} Foley of a ${performer.weight}-weight person wearing ${SHOE_TYPE_LABELS[config.shoeType].toLowerCase()}`,
      `${STEP_TYPE_LABELS[config.movementType].toLowerCase()} on ${surface}`,
      `${performer.gestureSpeed} ${performer.movementIntention} movement`,
      `${REALISM_LABELS[performer.realism].toLowerCase()}`,
      FOLEY_EXCLUSIONS.join(", "),
    ].join(", ") + ".";

    return {
      index: i,
      surface,
      prompt,
      filename: `${surface}_${shoeSlug}_01`,
    };
  });
}

// ── Cost Estimation ───────────────────────────────────────────

export function estimateFoleyCost(itemCount: number): number {
  return itemCount;
}

// ── Export ─────────────────────────────────────────────────────

export function exportFoleyManifest(items: FoleyItem[], setName: string): object {
  return {
    set: setName,
    category: items[0]?.category ?? "footsteps",
    itemCount: items.length,
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      prompt: item.composedPrompt,
      audioUrl: item.audioUrl ?? null,
      takeNumber: item.takeNumber,
      side: item.side ?? null,
      status: item.status,
    })),
  };
}

export function exportGameRoundRobinManifest(
  items: RoundRobinItem[],
  config: RoundRobinConfig
): object {
  return {
    event: `player/footstep/${config.surfaces[0]}_${config.shoeType}`,
    type: "round_robin",
    surface: config.surfaces[0],
    shoe: config.shoeType,
    movementType: config.movementType,
    variations: { left: config.leftCount, right: config.rightCount },
    files: items.map((i) => `${i.filename}.mp3`),
  };
}

export function exportFoleyCSV(items: FoleyItem[]): string {
  const header = "Index,Category,Take,Side,Prompt,Status,Audio URL";
  const rows = items.map((item, i) =>
    [
      i,
      item.category,
      item.takeNumber,
      item.side ?? "",
      `"${item.composedPrompt.replace(/"/g, '""')}"`,
      item.status,
      item.audioUrl ?? "",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
