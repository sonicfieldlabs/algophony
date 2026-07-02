/**
 * Algophony Studio — Prompt Autopsy Engine
 *
 * Generates retry prompts from failed generation data.
 * Takes the original prompt, the selected failure reasons,
 * and any user-specified corrections to produce an improved prompt
 * with corrective constraints baked in.
 */

import {
  type EvaluationTag,
  tagToExclusionGuidance,
  aggregateGuidance,
  requiresUserInput,
} from "@/lib/sfx/evaluations";

// ── Autopsy Report ───────────────────────────────────────────

export interface AutopsyReport {
  generationId: string;
  originalPrompt: string;
  failureReasons: EvaluationTag[];
  userCorrections: Record<string, string>;
  exclusionGuidance: string[];
  retryPrompt: string;
  retryExclusions: string[];
  suggestedDuration?: number;
  suggestedLoop?: boolean;
  suggestedInfluence?: number;
  timestamp: string;
}

// ── Failure Reason Groups (for UI) ───────────────────────────

export interface FailureGroup {
  label: string;
  reasons: EvaluationTag[];
}

export const FAILURE_GROUPS: FailureGroup[] = [
  {
    label: "Character",
    reasons: ["too musical", "too synthetic", "not realistic", "wrong emotional tone"],
  },
  {
    label: "Level / Mix",
    reasons: ["too noisy", "too clean", "too busy", "not enough body"],
  },
  {
    label: "Space / Reverb",
    reasons: ["too reverberant", "too ambient", "too much room", "too wet", "too dry"],
  },
  {
    label: "Duration / Loop",
    reasons: ["too long", "too short", "wrong duration", "not loopable"],
  },
  {
    label: "Perspective / Material",
    reasons: ["wrong perspective", "wrong material", "wrong surface", "wrong action"],
  },
  {
    label: "Weight / Dynamics",
    reasons: ["too heavy", "too light", "too exaggerated"],
  },
  {
    label: "Voice / Performance",
    reasons: ["contains unwanted voice", "too verbal", "too artificial", "too dramatic", "too cartoonish"],
  },
  {
    label: "Distance / Sync",
    reasons: ["too close", "too distant", "not isolated enough", "bad for sync"],
  },
];

// ── Correction Prompts ───────────────────────────────────────
// These define what the user should specify when a tag needs user input

export const CORRECTION_PROMPTS: Record<string, { label: string; placeholder: string; options?: string[] }> = {
  "wrong material": {
    label: "What material should it be?",
    placeholder: "e.g. metal, wood, glass, plastic",
    options: ["metal", "wood", "glass", "plastic", "stone", "concrete", "rubber", "leather", "fabric", "ceramic"],
  },
  "wrong perspective": {
    label: "What perspective should it be?",
    placeholder: "e.g. close-mic, medium distance, far away",
    options: ["close-mic", "medium distance", "far away", "offscreen", "interior", "exterior", "overhead", "underground"],
  },
  "wrong duration": {
    label: "What duration should it be?",
    placeholder: "e.g. 0.3 seconds, 2 seconds, 10 seconds",
  },
  "wrong action": {
    label: "What action should it be?",
    placeholder: "e.g. slam, slide, creak, click",
  },
  "wrong emotional tone": {
    label: "What emotional tone should it have?",
    placeholder: "e.g. tense, calm, aggressive, eerie",
    options: ["tense", "calm", "aggressive", "eerie", "playful", "urgent", "neutral", "ominous", "warm", "cold"],
  },
  "wrong surface": {
    label: "What surface should it be?",
    placeholder: "e.g. concrete, tile, gravel, carpet",
    options: ["concrete", "wood", "metal", "gravel", "tile", "carpet", "sand", "grass", "mud", "water"],
  },
};

// ── Retry Prompt Generator ───────────────────────────────────

/**
 * Generate a corrected retry prompt from failure analysis.
 */
export function generateRetryPrompt(
  originalPrompt: string,
  failureReasons: EvaluationTag[],
  userCorrections: Record<string, string> = {},
  currentExclusions: string[] = []
): AutopsyReport & { retryPrompt: string; retryExclusions: string[] } {
  // 1. Aggregate guidance from all failure reasons
  const exclusionGuidance = aggregateGuidance(failureReasons);

  // 2. Build corrective modifiers
  const modifiers: string[] = [];
  const newExclusions: string[] = [...currentExclusions];

  for (const reason of failureReasons) {
    const guidance = tagToExclusionGuidance(reason);

    // Add negative constraints as exclusions
    for (const g of guidance) {
      if (g.startsWith("no ")) {
        if (!newExclusions.includes(g)) newExclusions.push(g);
      } else {
        // Positive constraints become modifiers
        modifiers.push(g);
      }
    }

    // Add user corrections as positive modifiers
    if (requiresUserInput(reason) && userCorrections[reason]) {
      modifiers.push(userCorrections[reason]);
    }
  }

  // 3. Infer duration/loop/influence suggestions
  let suggestedDuration: number | undefined;
  let suggestedLoop: boolean | undefined;
  let suggestedInfluence: number | undefined;

  if (failureReasons.includes("too long")) {
    // Parse existing duration hint or suggest shorter
    const durationMatch = originalPrompt.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|second)/i);
    if (durationMatch) {
      suggestedDuration = Math.max(0.2, Number(durationMatch[1]) * 0.5);
    }
  }
  if (failureReasons.includes("too short")) {
    const durationMatch = originalPrompt.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|second)/i);
    if (durationMatch) {
      suggestedDuration = Number(durationMatch[1]) * 2;
    }
  }
  if (userCorrections["wrong duration"]) {
    const parsed = parseFloat(userCorrections["wrong duration"]);
    if (!isNaN(parsed)) suggestedDuration = parsed;
  }

  if (failureReasons.includes("not loopable")) {
    suggestedLoop = true;
    modifiers.push("seamless loop");
  }

  // If too musical or too synthetic, lower prompt influence for more variation
  if (failureReasons.includes("too musical") || failureReasons.includes("too synthetic")) {
    suggestedInfluence = 0.3;
  }

  // 4. Reconstruct the prompt
  let retryPrompt = originalPrompt;

  // Remove any conflicting existing modifiers from original
  for (const reason of failureReasons) {
    if (reason === "too musical") {
      retryPrompt = retryPrompt.replace(/\b(musical|melodic|tonal phrase)\b/gi, "").trim();
    }
    if (reason === "too reverberant") {
      retryPrompt = retryPrompt.replace(/\b(reverberant|reverb|cathedral|hall)\b/gi, "").trim();
    }
    if (reason === "contains unwanted voice") {
      retryPrompt = retryPrompt.replace(/\b(voice|vocal|speech|dialogue|speaking)\b/gi, "").trim();
    }
  }

  // Clean up double spaces from removals
  retryPrompt = retryPrompt.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();

  // Append corrective modifiers
  if (modifiers.length > 0) {
    retryPrompt = retryPrompt.replace(/[.,]?\s*$/, "");
    retryPrompt += ", " + modifiers.join(", ");
  }

  // Append duration constraint
  if (suggestedDuration != null) {
    const durationStr = suggestedDuration < 1
      ? `under ${suggestedDuration} seconds`
      : `approximately ${suggestedDuration} seconds`;
    retryPrompt += `, ${durationStr}`;
  }

  // Deduplicate exclusions
  const retryExclusions = [...new Set(newExclusions)];

  return {
    generationId: "",
    originalPrompt,
    failureReasons,
    userCorrections,
    exclusionGuidance,
    retryPrompt,
    retryExclusions,
    suggestedDuration,
    suggestedLoop,
    suggestedInfluence,
    timestamp: new Date().toISOString(),
  };
}

// ── Autopsy Summary (human-readable) ─────────────────────────

/**
 * Generate a human-readable autopsy summary for the provenance panel.
 */
export function formatAutopsySummary(report: AutopsyReport): string {
  const lines: string[] = [];
  lines.push(`Rejected because: ${report.failureReasons.join(", ")}.`);

  if (Object.keys(report.userCorrections).length > 0) {
    lines.push("");
    lines.push("Corrections:");
    for (const [tag, value] of Object.entries(report.userCorrections)) {
      lines.push(`  ${tag} → ${value}`);
    }
  }

  lines.push("");
  lines.push("Retry prompt:");
  lines.push(report.retryPrompt);

  if (report.retryExclusions.length > 0) {
    lines.push("");
    lines.push("Added exclusions:");
    for (const ex of report.retryExclusions) {
      lines.push(`  • ${ex}`);
    }
  }

  if (report.suggestedDuration != null) {
    lines.push(`\nSuggested duration: ${report.suggestedDuration}s`);
  }
  if (report.suggestedLoop != null) {
    lines.push(`Suggested loop: ${report.suggestedLoop ? "yes" : "no"}`);
  }
  if (report.suggestedInfluence != null) {
    lines.push(`Suggested prompt influence: ${report.suggestedInfluence}`);
  }

  return lines.join("\n");
}
