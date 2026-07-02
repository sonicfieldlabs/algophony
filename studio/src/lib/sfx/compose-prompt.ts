/**
 * Algophony Studio — Prompt Composer
 *
 * Deterministic prompt composition from structured attributes.
 * No LLM required — builds compact, ElevenLabs-ready prompts.
 *
 * Composition order:
 * [perspective/distance] [source object] [action] [material/surface]
 * in [environment/acoustic space], [motion/rhythm/density], [texture],
 * [mood], [realism level], [use case].
 * [exclusion constraints].
 *
 * NOTE: durationSeconds and loop are NOT written into prompt text — they
 * are forwarded to ElevenLabs as `duration_seconds` / `loop` API params.
 * Including them in the prompt wastes ~8% of the char budget and pushes
 * the model toward describing the duration instead of generating the sound.
 */

import type { SfxPromptAttributes } from "./prompt-schema";

/**
 * Compose a deterministic ElevenLabs-ready prompt from structured attributes.
 */
export function composePrompt(attrs: SfxPromptAttributes): string {
  const parts: string[] = [];

  // 1. Perspective / Distance
  const perspective = attrs.sonicDna?.perspective ?? attrs.perspective;
  if (perspective || attrs.distance) {
    const combined = [perspective, attrs.distance].filter(Boolean).join(" ");
    parts.push(combined);
  }

  // 2. Source object
  if (attrs.sourceObject) {
    parts.push(attrs.sourceObject);
  } else if (attrs.subcategory) {
    parts.push(attrs.subcategory);
  }

  // 3. Action
  if (attrs.action) {
    parts.push(attrs.action);
  }

  // 4. Material / Surface
  if (attrs.material || attrs.surface) {
    const matSurf = [attrs.material, attrs.surface].filter(Boolean).join(" on ");
    if (matSurf) {
      parts.push(`on ${matSurf}`);
    }
  }

  // 5. Environment / Acoustic space
  const acousticSpace = attrs.sonicDna?.acousticSpace ?? attrs.acousticSpace;
  const envSpace = [attrs.environment, acousticSpace].filter(Boolean).join(", ");
  if (envSpace) {
    parts.push(`in ${envSpace}`);
  }

  // Build the main clause
  let prompt = parts.join(" ");

  // 6. Secondary descriptors: motion, rhythm, density
  const secondaryParts: string[] = [];
  if (attrs.motion) secondaryParts.push(attrs.motion);
  if (attrs.rhythm) secondaryParts.push(attrs.rhythm);
  if (attrs.density) secondaryParts.push(attrs.density);

  // 7. Texture
  const texture = attrs.sonicDna?.texture ?? attrs.texture;
  if (texture) secondaryParts.push(texture);

  // 8. Mood
  const mood = attrs.sonicDna?.mood ?? attrs.mood;
  if (mood) secondaryParts.push(mood);

  // 9. Realism level
  const realism = attrs.sonicDna?.realismLevel ?? attrs.realismLevel;
  if (realism) secondaryParts.push(realism);

  if (secondaryParts.length > 0) {
    prompt += ", " + secondaryParts.join(", ");
  }

  // 10. Use-case context only.
  // durationSeconds and loop are forwarded to the API as native params, not text.
  if (attrs.useCase) {
    prompt += ", " + attrs.useCase;
  }

  // 11. Exclusion constraints (appended as prompt text, not an API parameter)
  const allExclusions = mergeExclusions(
    attrs.exclusions,
    attrs.sonicDna?.exclusions
  );
  if (allExclusions.length > 0) {
    prompt += ". " + allExclusions.join(", ");
  }

  // Ensure it ends with a period
  prompt = prompt.trim();
  if (prompt && !prompt.endsWith(".")) {
    prompt += ".";
  }

  return prompt;
}

/** Merge and deduplicate exclusions from attributes and Sonic DNA */
function mergeExclusions(
  exclusions: string[],
  dnaExclusions?: string[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const e of [...exclusions, ...(dnaExclusions ?? [])]) {
    const normalized = e.toLowerCase().trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Get the character count of a composed prompt.
 * Target under 450 for reliable ElevenLabs SFX prompting.
 */
export function getPromptCharCount(prompt: string): number {
  return prompt.length;
}

/** Check if prompt exceeds the recommended character limit */
export function isPromptOverLimit(prompt: string, limit = 450): boolean {
  return prompt.length > limit;
}
