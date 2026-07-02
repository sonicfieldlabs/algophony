/**
 * Algophony Studio — Sound Design Recipe Schema
 *
 * A recipe is a reusable sound-design structure — not a finished sound.
 * Contains layer roles, prompt templates, duration ranges, frequency roles,
 * variation axes, exclusion constraints, and export naming rules.
 *
 * Designed for future profile-to-profile sharing via `isPublic` + `author`.
 */

import type { StackerLayerType, FrequencyRoleId } from "@/lib/sfx/stacker-taxonomy";
import type { NamingTemplate } from "@/lib/sfx/export-taxonomy";

// ── Recipe Layer ─────────────────────────────────────────────

export interface RecipeLayer {
  /** Layer role from Stacker taxonomy */
  role: StackerLayerType;
  /** Human-readable label for this layer in the recipe */
  label: string;
  /** Prompt template with {variable} placeholders */
  promptTemplate: string;
  /** Spectral role */
  frequencyRole: FrequencyRoleId;
  /** Duration range in seconds */
  duration: { min: number; max: number };
  /** Default prompt influence (0–1) */
  promptInfluence: number;
  /** Whether this layer loops */
  loop: boolean;
  /** Whether this layer is optional */
  optional: boolean;
  /** Render priority (lower = first) */
  priority: number;
}

// ── Variation Axis ───────────────────────────────────────────

export interface VariationAxis {
  /** Axis name: "material", "intensity", "speed", etc. */
  name: string;
  /** Display label */
  label: string;
  /** Possible values */
  values: string[];
  /** Which layer indices this axis affects */
  affectsLayers: number[];
  /** How the value modifies the prompt template */
  promptModifier: "replace" | "append" | "prefix";
}

// ── Recipe ───────────────────────────────────────────────────

export type RecipeCategory =
  | "cinematic"
  | "sci-fi"
  | "foley"
  | "horror"
  | "fantasy"
  | "ui"
  | "trailer"
  | "game"
  | "ambient"
  | "custom";

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  cinematic: "Cinematic",
  "sci-fi": "Sci-Fi",
  foley: "Foley",
  horror: "Horror",
  fantasy: "Fantasy",
  ui: "UI / Interface",
  trailer: "Trailer",
  game: "Game Audio",
  ambient: "Ambient",
  custom: "Custom",
};

export const RECIPE_CATEGORY_HUES: Record<RecipeCategory, number> = {
  cinematic: 220,
  "sci-fi": 180,
  foley: 40,
  horror: 280,
  fantasy: 300,
  ui: 160,
  trailer: 0,
  game: 120,
  ambient: 200,
  custom: 60,
};

export interface SoundDesignRecipe {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: RecipeCategory;
  tags: string[];
  icon: string;

  layers: RecipeLayer[];
  variationAxes: VariationAxis[];
  exclusions: string[];

  duration: { min: number; max: number; default: number };
  recommendedBatchCount: number;
  exportNaming: NamingTemplate;

  /** Metadata */
  author?: string;
  isBuiltIn: boolean;
  /** Future: shareable between profiles */
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ── Factory ──────────────────────────────────────────────────

export function createRecipeId(): string {
  return `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyRecipe(name = "Untitled Recipe"): SoundDesignRecipe {
  const now = new Date().toISOString();
  return {
    id: createRecipeId(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    description: "",
    category: "custom",
    tags: [],
    icon: "Layers",
    layers: [],
    variationAxes: [],
    exclusions: ["no music", "no dialogue"],
    duration: { min: 1, max: 10, default: 4 },
    recommendedBatchCount: 5,
    exportNaming: {
      template: "{category}_{sound_name}_{layer_role}_v{version}",
      variables: ["category", "sound_name", "layer_role", "version"],
      separator: "_",
      caseStyle: "pascal",
    },
    author: undefined,
    isBuiltIn: false,
    isPublic: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Storage Keys ─────────────────────────────────────────────

export const RECIPE_STORAGE_KEY = "algophony-studio-recipes";
export const RECIPE_FAVORITES_KEY = "algophony-studio-recipe-favorites";
