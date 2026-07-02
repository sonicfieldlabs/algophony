/**
 * Algophony Studio — Advanced Sound Effects Client
 *
 * Server-only. Wraps the base SFX generator with exclusion-constraint
 * merging and enriched response metadata.
 */

import "server-only";

import { z } from "zod";
import { generateSoundEffect } from "./client";

export const advancedSfxInputSchema = z.object({
  text: z.string().min(1, "Prompt text is required").max(2000, "Prompt text must be under 2,000 characters"),
  duration_seconds: z.number().min(0.5).max(30).nullable().optional(),
  loop: z.boolean().default(false),
  prompt_influence: z.number().min(0).max(1).default(0.3),
  model_id: z.enum(["eleven_text_to_sound_v2"]).default("eleven_text_to_sound_v2"),
  output_format: z.string().optional(),
  exclusion_constraints: z.array(z.string().max(100)).max(20).default([]),
});

export type AdvancedSfxInput = z.infer<typeof advancedSfxInputSchema>;

export interface AdvancedSfxResult {
  success: true;
  audioBuffer: Buffer;
  contentType: string;
  characterCost: number | null;
  requestId: string | null;
  isMock: boolean;
  finalPromptText: string;
}

export interface AdvancedSfxError {
  success: false;
  statusCode: number;
  errorType: string;
  message: string;
  isMock: boolean;
}

/**
 * Maximum number of exclusion constraints to inline into the prompt.
 * ElevenLabs SFX has no native negative_prompt parameter, so each exclusion
 * costs prompt budget. Past ~6 entries the model treats the exclusion list
 * as background noise and quality drops. Callers can build longer lists for
 * UI display, but only the first N (in priority order) reach the model.
 */
export const MAX_INLINED_EXCLUSIONS = 6;

/**
 * Merge exclusion constraints into prompt text.
 * Order is preserved so callers can put high-impact constraints first
 * (e.g. base defaults like "no music" / "no dialogue" before category-specific
 * or user-added ones). The list is deduplicated, normalized, and capped.
 */
export function mergeExclusionsIntoPrompt(
  text: string,
  exclusions: string[]
): string {
  if (exclusions.length === 0) return text;

  // Deduplicate and normalize, preserving caller-supplied priority order.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const e of exclusions) {
    const normalized = e.toLowerCase().trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }

  if (unique.length === 0) return text;

  const capped = unique.slice(0, MAX_INLINED_EXCLUSIONS);

  let prompt = text.trim();
  if (prompt && !prompt.endsWith(".")) {
    prompt += ".";
  }
  prompt += " " + capped.join(", ");
  if (!prompt.endsWith(".")) {
    prompt += ".";
  }
  return prompt;
}

/**
 * Generate SFX with advanced controls including exclusion constraints.
 */
export async function generateAdvancedSfx(
  input: AdvancedSfxInput
): Promise<AdvancedSfxResult | AdvancedSfxError> {
  const finalPromptText = mergeExclusionsIntoPrompt(
    input.text,
    input.exclusion_constraints
  );

  const result = await generateSoundEffect({
    text: finalPromptText,
    duration_seconds: input.duration_seconds ?? null,
    loop: input.loop,
    prompt_influence: input.prompt_influence,
    model_id: input.model_id,
    output_format: input.output_format,
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    audioBuffer: result.audioBuffer,
    contentType: result.contentType,
    characterCost: result.characterCost,
    requestId: result.requestId,
    isMock: result.isMock,
    finalPromptText,
  };
}
