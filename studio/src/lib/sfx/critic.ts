/**
 * Algophony Studio — Prompt Critic
 *
 * Deterministic 100-point scoring system for SFX prompt quality.
 */

import type { SfxPromptAttributes } from "./prompt-schema";
import { composePrompt } from "./compose-prompt";

export interface CriticIssue {
  field: string;
  severity: "low" | "medium" | "high";
  message: string;
  suggestion: string;
}

export interface CriticReport {
  score: number;
  grade: "weak" | "usable" | "strong";
  issues: CriticIssue[];
  improvedPrompt: string;
}

const SOUND_MOODS = new Set([
  "tense","eerie","calm","aggressive","harsh","soft","muffled","bright",
  "dark","wet","dry","hollow","metallic","organic","distant","intimate",
  "industrial","natural","chaotic","steady","rumbling","crisp","warm",
  "cold","raw","gritty","clean","muddy","sharp","dull","resonant",
]);

function countSoundEvents(attrs: SfxPromptAttributes): number {
  const text = [attrs.sourceObject, attrs.action].filter(Boolean).join(" ").toLowerCase();
  const splits = text.split(/\b(and|while|then|followed by|simultaneously)\b/gi)
    .filter(p => p.trim().length > 3 && !["and","while","then","followed by","simultaneously"].includes(p.trim().toLowerCase()));
  return Math.max(1, splits.length);
}

export function criticize(attrs: SfxPromptAttributes): CriticReport {
  let score = 0;
  const issues: CriticIssue[] = [];
  const fixes: Partial<SfxPromptAttributes> = {};

  if (attrs.sourceObject) { score += 15; } else {
    issues.push({ field: "sourceObject", severity: "high", message: "No source object specified.", suggestion: "Add a concrete sound source." });
    fixes.sourceObject = attrs.subcategory || attrs.category.toLowerCase();
  }

  if (attrs.action) { score += 15; } else {
    issues.push({ field: "action", severity: "high", message: "No action specified.", suggestion: "Add an action verb." });
  }

  if (attrs.material || attrs.surface) { score += 10; } else {
    issues.push({ field: "material/surface", severity: "medium", message: "No material or surface.", suggestion: "Add a material or surface." });
  }

  if (attrs.environment || attrs.acousticSpace) { score += 10; } else {
    issues.push({ field: "environment", severity: "medium", message: "No environment.", suggestion: "Add an environment." });
  }

  if (attrs.perspective || attrs.distance) { score += 10; } else {
    issues.push({ field: "perspective", severity: "medium", message: "No perspective.", suggestion: "Add 'close-mic' or similar." });
    fixes.perspective = "close-mic";
  }

  if (attrs.durationSeconds != null) { score += 10; } else {
    score += 5;
    issues.push({ field: "durationSeconds", severity: "low", message: "No duration set.", suggestion: "Set 0.5–30 seconds." });
  }

  if (attrs.loop === true || attrs.loop === false) { score += 5; }

  if (attrs.exclusions.length > 0) { score += 10; } else {
    issues.push({ field: "exclusions", severity: "medium", message: "No exclusions.", suggestion: "Add 'no music', 'no dialogue'." });
    fixes.exclusions = ["no music", "no dialogue"];
  }

  const eventCount = countSoundEvents(attrs);
  if (eventCount <= 2) { score += 10; } else {
    issues.push({ field: "prompt_complexity", severity: "high", message: `${eventCount} sound events detected.`, suggestion: "Split into separate cards." });
  }

  if (attrs.mood) {
    const terms = attrs.mood.toLowerCase().split(/[\s,]+/);
    if (terms.some(t => SOUND_MOODS.has(t))) { score += 5; }
    else { issues.push({ field: "mood", severity: "low", message: "Mood not sound-relevant.", suggestion: "Use 'tense', 'hollow', 'metallic'." }); }
  } else {
    issues.push({ field: "mood", severity: "low", message: "No mood.", suggestion: "Add a sonic mood." });
  }

  const grade: CriticReport["grade"] = score >= 75 ? "strong" : score >= 50 ? "usable" : "weak";

  const improvedAttrs: SfxPromptAttributes = {
    ...attrs, ...fixes,
    exclusions: fixes.exclusions ? [...new Set([...attrs.exclusions, ...fixes.exclusions])] : attrs.exclusions,
  };

  return { score, grade, issues, improvedPrompt: composePrompt(improvedAttrs) };
}
