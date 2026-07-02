/**
 * Algophony Studio — Timeline Cue → Prompt Converter
 *
 * Converts timeline cue descriptions into Algophony Studio prompts
 * using the existing scene-breakdown engine. Adds timecode context
 * awareness and detects implicit sounds (room tones, footsteps).
 */

import type { TimelineCue, TimelineScene } from "./types";
import { breakdownScene, type SceneEvent } from "@/lib/sfx/scene-breakdown";
import { composePrompt } from "@/lib/sfx/compose-prompt";
import type { SfxPromptAttributes } from "@/lib/sfx/prompt-schema";

export interface CuePromptResult {
  cueId: string;
  prompt: string;
  category: string;
  attributes: Partial<SfxPromptAttributes>;
  /** Extra implicit cues detected (e.g. room tone) */
  implicitCues: ImplicitCue[];
}

export interface ImplicitCue {
  description: string;
  category: string;
  prompt: string;
  reason: string;
}

/**
 * Convert a single timeline cue description into an SFX prompt.
 */
export function convertCueToPrompt(
  cue: TimelineCue,
  scene?: TimelineScene
): CuePromptResult {
  // If the cue already has a category and looks like a sound description,
  // compose directly without scene breakdown
  if (cue.category && isSoundDescription(cue.description)) {
    const attrs: SfxPromptAttributes = {
      category: cue.category,
      loop: cue.category === "Ambience",
      promptInfluence: 0.3,
      modelId: "eleven_text_to_sound_v2",
      exclusions: ["no music", "no dialogue"],
      sourceObject: cue.description,
    };

    return {
      cueId: cue.id,
      prompt: composePrompt(attrs),
      category: cue.category,
      attributes: attrs,
      implicitCues: [],
    };
  }

  // Use scene-breakdown engine for richer descriptions
  const events = breakdownScene(cue.description);

  if (events.length === 0) {
    // Fallback: use the description directly as prompt
    const attrs: SfxPromptAttributes = {
      category: cue.category ?? "Foley",
      loop: false,
      promptInfluence: 0.3,
      modelId: "eleven_text_to_sound_v2",
      exclusions: ["no music", "no dialogue"],
      sourceObject: cue.description,
    };

    return {
      cueId: cue.id,
      prompt: composePrompt(attrs),
      category: attrs.category,
      attributes: attrs,
      implicitCues: [],
    };
  }

  // Take the primary event
  const primary = events[0];
  const implicitCues = detectImplicitCues(cue, scene, events);

  return {
    cueId: cue.id,
    prompt: primary.generatedPrompt,
    category: primary.category,
    attributes: primary.attributes,
    implicitCues,
  };
}

/**
 * Convert all cues in a timeline to prompts.
 */
export function convertAllCuesToPrompts(
  cues: TimelineCue[],
  scenes: TimelineScene[] = []
): Map<string, CuePromptResult> {
  const results = new Map<string, CuePromptResult>();

  for (const cue of cues) {
    const scene = scenes.find((s) => s.cueIds.includes(cue.id));
    const result = convertCueToPrompt(cue, scene);
    results.set(cue.id, result);
  }

  return results;
}

/**
 * Apply generated prompts back to the cue array.
 */
export function applyCuePrompts(
  cues: TimelineCue[],
  prompts: Map<string, CuePromptResult>
): TimelineCue[] {
  return cues.map((cue) => {
    const result = prompts.get(cue.id);
    if (!result) return cue;
    return {
      ...cue,
      generatedPrompt: result.prompt,
      category: result.category,
      status: "reviewed" as const,
    };
  });
}

// ── Implicit Cue Detection ───────────────────────────────────

function detectImplicitCues(
  cue: TimelineCue,
  scene: TimelineScene | undefined,
  events: SceneEvent[]
): ImplicitCue[] {
  const implicit: ImplicitCue[] = [];
  const desc = cue.description.toLowerCase();

  // Character movement → footsteps
  if (/\b(walk|step|enter|leave|approach|cross|stride|pace)\b/.test(desc)) {
    const surface = extractSurface(desc);
    const footstepPrompt = surface
      ? `Footsteps on ${surface}, close perspective, realistic`
      : "Footsteps, close perspective, realistic";

    // Only add if not already in the events
    if (!events.some((e) => e.category === "Footsteps")) {
      implicit.push({
        description: `Footsteps (from: "${cue.description}")`,
        category: "Footsteps",
        prompt: footstepPrompt,
        reason: "Character movement detected",
      });
    }
  }

  // Doors mentioned → door sound
  if (/\b(door|gate|hatch|lid)\b/.test(desc) && !/\b(open|close|slam|creak)\b/.test(desc)) {
    implicit.push({
      description: `Door movement (from: "${cue.description}")`,
      category: "Door",
      prompt: "Door opening and closing, metal, interior perspective",
      reason: "Door mentioned without specific action",
    });
  }

  // Scene ambience if scene has inferred ambience and no ambience cue exists
  if (scene?.inferredAmbience && !events.some((e) => e.category === "Ambience")) {
    // Only add for the first cue in the scene
    if (scene.cueIds[0] === cue.id) {
      implicit.push({
        description: `Scene ambience for ${scene.name}`,
        category: "Ambience",
        prompt: scene.inferredAmbience,
        reason: `Room tone for ${scene.name}`,
      });
    }
  }

  return implicit;
}

function extractSurface(text: string): string | null {
  const surfacePatterns: Array<{ pattern: RegExp; surface: string }> = [
    { pattern: /\b(concrete|cement|pavement)\b/i, surface: "concrete" },
    { pattern: /\b(wood|wooden|floorboard)\b/i, surface: "wood" },
    { pattern: /\b(metal|steel|iron|grate)\b/i, surface: "metal" },
    { pattern: /\b(gravel|dirt|earth|mud)\b/i, surface: "gravel" },
    { pattern: /\b(water|puddle|flood|wet)\b/i, surface: "shallow water" },
    { pattern: /\b(grass|lawn|field)\b/i, surface: "grass" },
    { pattern: /\b(tile|marble|stone)\b/i, surface: "tile" },
    { pattern: /\b(carpet|rug)\b/i, surface: "carpet" },
    { pattern: /\b(sand|desert)\b/i, surface: "sand" },
    { pattern: /\b(snow|ice)\b/i, surface: "snow" },
  ];

  for (const { pattern, surface } of surfacePatterns) {
    if (pattern.test(text)) return surface;
  }
  return null;
}

function isSoundDescription(text: string): boolean {
  // Sound descriptions tend to be short, specific, and action-oriented
  return text.length < 100 && /\b(sound|tone|noise|hum|buzz|creak|click|beep|whoosh)\b/i.test(text);
}

// ── Export Helpers ────────────────────────────────────────────

/**
 * Generate a CSV cue sheet from completed cues.
 */
export function exportCueSheetCsv(cues: TimelineCue[]): string {
  const header = "Cue,Timecode In,Timecode Out,Duration,Description,Prompt,Category,Status,Audio URL";
  const rows = cues.map((cue, i) => {
    const duration = cue.durationMs ? `${(cue.durationMs / 1000).toFixed(2)}s` : "";
    return [
      `Cue ${String(i + 1).padStart(3, "0")}`,
      cue.timecodeIn,
      cue.timecodeOut ?? "",
      duration,
      `"${cue.description.replace(/"/g, '""')}"`,
      `"${(cue.generatedPrompt ?? "").replace(/"/g, '""')}"`,
      cue.category ?? "",
      cue.status,
      cue.audioUrl ?? "",
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * Generate a game engine manifest (JSON) from completed cues.
 */
export function exportGameManifest(cues: TimelineCue[]): string {
  const manifest = {
    version: "1.0",
    generator: "Algophony Studio",
    generatedAt: new Date().toISOString(),
    events: cues
      .filter((c) => c.status === "generated" && c.audioUrl)
      .map((cue) => ({
        id: cue.id,
        event: cue.sourceMetadata?.eventName ?? cue.description.replace(/\s+/g, "_").toLowerCase().slice(0, 40),
        timecode: cue.timecodeIn,
        description: cue.description,
        category: cue.category ?? "sfx",
        audioUrl: cue.audioUrl,
        generationId: cue.generationId,
      })),
  };

  return JSON.stringify(manifest, null, 2);
}
