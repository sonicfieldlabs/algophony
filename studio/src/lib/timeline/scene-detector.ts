/**
 * Algophony Studio — Timeline Scene Detector
 *
 * Groups TimelineCue[] into TimelineScene[] by analyzing:
 * - Timecode gaps (>5s gap = potential scene break)
 * - EDL reel/source changes
 * - Script scene headings
 * - Explicit scene markers in cue descriptions
 */

import type { TimelineCue, TimelineScene } from "./types";
import { timecodeToMs } from "./types";

export interface SceneDetectionOptions {
  /** Minimum gap (ms) between cues to trigger a scene break. Default: 5000 */
  gapThresholdMs?: number;
  /** Use explicit scene IDs from cue metadata. Default: true */
  useExplicitScenes?: boolean;
  /** Infer room tone for each scene. Default: true */
  inferAmbience?: boolean;
}

const DEFAULT_OPTIONS: Required<SceneDetectionOptions> = {
  gapThresholdMs: 5000,
  useExplicitScenes: true,
  inferAmbience: true,
};

/**
 * Detect scenes from a list of timeline cues.
 */
export function detectScenes(
  cues: TimelineCue[],
  opts: SceneDetectionOptions = {}
): TimelineScene[] {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  if (cues.length === 0) return [];

  // If cues have explicit scene IDs, group by those first
  if (options.useExplicitScenes) {
    const explicit = groupByExplicitScene(cues);
    if (explicit.length > 1) return finalizeScenes(explicit, options);
  }

  // Sort cues by timecode
  const sorted = [...cues].sort(
    (a, b) => timecodeToMs(a.timecodeIn) - timecodeToMs(b.timecodeIn)
  );

  // Detect scene breaks by timecode gaps
  const scenes: TimelineScene[] = [];
  let currentCueIds: string[] = [];
  let sceneStart = sorted[0].timecodeIn;
  let lastTcMs = timecodeToMs(sorted[0].timecodeIn);

  for (const cue of sorted) {
    const cueMs = timecodeToMs(cue.timecodeIn);
    const gap = cueMs - lastTcMs;

    // Check for scene break indicators
    const isSceneBreak =
      gap > options.gapThresholdMs ||
      isSceneHeading(cue.description) ||
      hasReelChange(cue, sorted[sorted.indexOf(cue) - 1]);

    if (isSceneBreak && currentCueIds.length > 0) {
      scenes.push(createScene(scenes.length, sceneStart, currentCueIds, sorted));
      currentCueIds = [];
      sceneStart = cue.timecodeIn;
    }

    currentCueIds.push(cue.id);
    lastTcMs = cueMs + (cue.durationMs ?? 0);
  }

  // Push the last scene
  if (currentCueIds.length > 0) {
    scenes.push(createScene(scenes.length, sceneStart, currentCueIds, sorted));
  }

  return finalizeScenes(scenes, options);
}

// ── Helpers ──────────────────────────────────────────────────

function groupByExplicitScene(cues: TimelineCue[]): TimelineScene[] {
  const groups = new Map<string, string[]>();

  for (const cue of cues) {
    const sceneKey = cue.sceneId ?? "__default";
    const ids = groups.get(sceneKey) ?? [];
    ids.push(cue.id);
    groups.set(sceneKey, ids);
  }

  if (groups.size <= 1 && groups.has("__default")) return [];

  return Array.from(groups.entries()).map(([key, cueIds], i) => ({
    id: `scene-${i + 1}`,
    name: key === "__default" ? `Scene ${i + 1}` : key,
    timecodeIn: cues.find((c) => cueIds.includes(c.id))?.timecodeIn ?? "00:00:00:00",
    cueIds,
  }));
}

function createScene(
  index: number,
  timecodeIn: string,
  cueIds: string[],
  allCues: TimelineCue[]
): TimelineScene {
  // Try to derive a scene name from the first cue
  const firstCue = allCues.find((c) => c.id === cueIds[0]);
  const sceneHeading = firstCue ? extractSceneHeading(firstCue.description) : null;

  return {
    id: `scene-${index + 1}`,
    name: sceneHeading ?? `Scene ${index + 1}`,
    timecodeIn,
    cueIds,
  };
}

function isSceneHeading(text: string): boolean {
  return /^(INT\.|EXT\.|INT\/EXT\.|SCENE|SC\s*\d|ACT\s)/i.test(text.trim());
}

function extractSceneHeading(text: string): string | null {
  const match = text.match(/^(?:INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-\s*|$)/i);
  return match ? match[1].trim() : null;
}

function hasReelChange(current: TimelineCue, previous?: TimelineCue): boolean {
  if (!previous) return false;
  const currentReel = current.sourceMetadata?.reel;
  const prevReel = previous.sourceMetadata?.reel;
  return !!(currentReel && prevReel && currentReel !== prevReel);
}

/** Environment keywords for ambience inference */
const ENVIRONMENT_PATTERNS: Array<{ pattern: RegExp; ambience: string }> = [
  { pattern: /\b(forest|woods|jungle)\b/i, ambience: "forest ambience with birds and rustling leaves" },
  { pattern: /\b(city|urban|street|downtown)\b/i, ambience: "city street ambience with distant traffic" },
  { pattern: /\b(ocean|beach|shore|coast)\b/i, ambience: "ocean waves and seagulls" },
  { pattern: /\b(rain|storm|thunder)\b/i, ambience: "rain falling on surfaces" },
  { pattern: /\b(office|building|indoor)\b/i, ambience: "quiet office room tone with HVAC hum" },
  { pattern: /\b(basement|cellar|underground)\b/i, ambience: "dark basement room tone with dripping water" },
  { pattern: /\b(cave|cavern|mine)\b/i, ambience: "cave ambience with dripping echoes" },
  { pattern: /\b(hospital|clinic|medical)\b/i, ambience: "hospital corridor with distant beeps" },
  { pattern: /\b(factory|warehouse|industrial)\b/i, ambience: "industrial room tone with machinery hum" },
  { pattern: /\b(space|spaceship|station)\b/i, ambience: "spaceship interior hum and air circulation" },
  { pattern: /\b(bar|restaurant|cafe|pub)\b/i, ambience: "busy restaurant walla with clinking glasses" },
  { pattern: /\b(classroom|school|library)\b/i, ambience: "quiet school hallway room tone" },
  { pattern: /\b(church|cathedral|temple)\b/i, ambience: "reverberant church interior silence" },
  { pattern: /\b(night|dark|evening)\b/i, ambience: "nighttime crickets and distant wind" },
  { pattern: /\b(flood|water|swim|pool)\b/i, ambience: "standing water room tone with gentle lapping" },
];

function inferSceneAmbience(cueDescriptions: string[]): string | undefined {
  const combined = cueDescriptions.join(" ");
  for (const { pattern, ambience } of ENVIRONMENT_PATTERNS) {
    if (pattern.test(combined)) return ambience;
  }
  return undefined;
}

function finalizeScenes(
  scenes: TimelineScene[],
  options: Required<SceneDetectionOptions>
): TimelineScene[] {
  if (!options.inferAmbience) return scenes;

  // This is a simplified approach — we need the original cues to infer ambience
  // The caller should use this with the cues array for full inference
  return scenes.map((scene) => {
    if (scene.inferredAmbience) return scene;
    // Scene name often contains environment info
    const ambience = inferSceneAmbience([scene.name]);
    return ambience ? { ...scene, inferredAmbience: ambience } : scene;
  });
}

/**
 * Enrich scenes with ambience inference using the full cue list.
 */
export function enrichScenesWithAmbience(
  scenes: TimelineScene[],
  cues: TimelineCue[]
): TimelineScene[] {
  return scenes.map((scene) => {
    if (scene.inferredAmbience) return scene;
    const sceneCues = cues.filter((c) => scene.cueIds.includes(c.id));
    const descriptions = [scene.name, ...sceneCues.map((c) => c.description)];
    const ambience = inferSceneAmbience(descriptions);
    return ambience ? { ...scene, inferredAmbience: ambience } : scene;
  });
}
