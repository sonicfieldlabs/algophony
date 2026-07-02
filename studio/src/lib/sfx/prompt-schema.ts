/**
 * Algophony Studio — Prompt Schema
 *
 * Canonical internal model for SFX prompt attributes.
 * Validated with Zod for runtime safety.
 */

import { z } from "zod";

/** Sonic DNA Profile shape */
export interface SonicDNAProfile {
  id: string;
  name: string;
  acousticSpace?: string;
  texture?: string;
  perspective?: string;
  realismLevel?: string;
  mood?: string;
  exclusions: string[];
}

/** Canonical SFX prompt attributes */
export interface SfxPromptAttributes {
  category: string;
  subcategory?: string;
  sourceObject?: string;
  action?: string;
  material?: string;
  surface?: string;
  environment?: string;
  acousticSpace?: string;
  perspective?: string;
  distance?: string;
  motion?: string;
  rhythm?: string;
  density?: string;
  texture?: string;
  mood?: string;
  realismLevel?: string;
  durationSeconds?: number | null;
  loop: boolean;
  promptInfluence: number;
  modelId: "eleven_text_to_sound_v2";
  outputFormat?: string;
  exclusions: string[];
  useCase?: string;
  sonicDna?: SonicDNAProfile;
}

/** Zod schema for runtime validation */
export const sfxPromptSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  sourceObject: z.string().optional(),
  action: z.string().optional(),
  material: z.string().optional(),
  surface: z.string().optional(),
  environment: z.string().optional(),
  acousticSpace: z.string().optional(),
  perspective: z.string().optional(),
  distance: z.string().optional(),
  motion: z.string().optional(),
  rhythm: z.string().optional(),
  density: z.string().optional(),
  texture: z.string().optional(),
  mood: z.string().optional(),
  realismLevel: z.string().optional(),
  durationSeconds: z
    .number()
    .min(0.5, "Duration must be at least 0.5 seconds")
    .max(30, "Duration must be at most 30 seconds")
    .nullable()
    .optional(),
  loop: z.boolean().default(false),
  promptInfluence: z
    .number()
    .min(0, "Prompt influence must be between 0 and 1")
    .max(1, "Prompt influence must be between 0 and 1")
    .default(0.3),
  modelId: z.literal("eleven_text_to_sound_v2").default("eleven_text_to_sound_v2"),
  outputFormat: z.string().optional(),
  exclusions: z.array(z.string()).default([]),
  useCase: z.string().optional(),
  sonicDna: z
    .object({
      id: z.string(),
      name: z.string(),
      acousticSpace: z.string().optional(),
      texture: z.string().optional(),
      perspective: z.string().optional(),
      realismLevel: z.string().optional(),
      mood: z.string().optional(),
      exclusions: z.array(z.string()).default([]),
    })
    .optional(),
});

export type SfxPromptInput = z.input<typeof sfxPromptSchema>;
export type SfxPromptParsed = z.output<typeof sfxPromptSchema>;

/** Validate prompt attributes, returning parsed result or errors */
export function validatePromptAttributes(
  input: unknown
): { success: true; data: SfxPromptParsed } | { success: false; errors: string[] } {
  const result = sfxPromptSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    ),
  };
}
