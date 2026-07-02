/**
 * Algophony Studio — Recipe Engine
 *
 * Converts recipes into Stacker cues, expands variations,
 * resolves prompt templates, and estimates costs.
 */

import type { SoundDesignRecipe, RecipeLayer, VariationAxis } from "./recipe-schema";
import type { StackerCue, StackerLayer } from "@/lib/sfx/stacker-taxonomy";
import { createDefaultLayer, createDefaultCue } from "@/lib/sfx/stacker-taxonomy";

// ── Prompt Template Resolution ───────────────────────────────

/**
 * Resolve a prompt template by replacing {variable} placeholders.
 */
export function resolvePromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  // Clean up any unresolved variables
  result = result.replace(/\{[^}]+\}/g, "");
  // Normalize whitespace
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

// ── Recipe → Stacker Cue ─────────────────────────────────────

/**
 * Instantiate a recipe as a Stacker cue with resolved prompts.
 * Optionally supply variable values for the variation axes.
 */
export function instantiateRecipe(
  recipe: SoundDesignRecipe,
  variables: Record<string, string> = {}
): StackerCue {
  const cue = createDefaultCue();
  cue.name = recipe.name;
  cue.description = recipe.description;
  cue.namingConvention = "custom";

  // Build layers from recipe definition
  cue.layers = recipe.layers
    .filter((layer) => !layer.optional || variables["include_optional"] === "true")
    .map((layer, i) => recipeLayerToStackerLayer(layer, i, variables));

  return cue;
}

/**
 * Convert a recipe layer definition to a Stacker layer.
 */
function recipeLayerToStackerLayer(
  layer: RecipeLayer,
  index: number,
  variables: Record<string, string>
): StackerLayer {
  const base = createDefaultLayer(layer.role, index);
  return {
    ...base,
    layerType: layer.role,
    frequencyRole: layer.frequencyRole,
    promptText: resolvePromptTemplate(layer.promptTemplate, variables),
    durationSeconds: layer.duration.max,
    loop: layer.loop,
    promptInfluence: layer.promptInfluence,
    priority: layer.priority,
    importedFrom: `recipe:${layer.label}`,
    importedModule: "recipes",
  };
}

// ── Variation Expansion ──────────────────────────────────────

/**
 * Generate all possible variation combinations from a recipe's axes.
 * Returns an array of variable maps.
 */
export function expandVariationAxes(
  axes: VariationAxis[]
): Array<Record<string, string>> {
  if (axes.length === 0) return [{}];

  const combinations: Array<Record<string, string>> = [];

  function expand(axisIndex: number, current: Record<string, string>) {
    if (axisIndex >= axes.length) {
      combinations.push({ ...current });
      return;
    }

    const axis = axes[axisIndex];
    for (const value of axis.values) {
      expand(axisIndex + 1, { ...current, [axis.name]: value });
    }
  }

  expand(0, {});
  return combinations;
}

/**
 * Expand a recipe into all variation combinations as Stacker cues.
 * Optionally limit which axes to expand.
 */
export function expandRecipeVariations(
  recipe: SoundDesignRecipe,
  axisNames?: string[]
): StackerCue[] {
  const activeAxes = axisNames
    ? recipe.variationAxes.filter((a) => axisNames.includes(a.name))
    : recipe.variationAxes;

  const combinations = expandVariationAxes(activeAxes);
  return combinations.map((vars) => {
    const cue = instantiateRecipe(recipe, vars);
    // Name the cue with variation values
    const suffix = Object.values(vars).join(" / ");
    cue.name = suffix ? `${recipe.name} — ${suffix}` : recipe.name;
    return cue;
  });
}

// ── Cost Estimation ──────────────────────────────────────────

export interface RecipeCostEstimate {
  layerCount: number;
  optionalLayerCount: number;
  variationCombinations: number;
  totalGenerations: number;
  creditCostPerGeneration: number;
  totalCredits: number;
  breakdown: Array<{
    axisName: string;
    values: string[];
    multiplier: number;
  }>;
}

/**
 * Estimate the credit cost of fully generating a recipe.
 */
export function estimateRecipeCost(
  recipe: SoundDesignRecipe,
  includeOptional = false,
  creditPerGeneration = 1
): RecipeCostEstimate {
  const requiredLayers = recipe.layers.filter((l) => !l.optional);
  const optionalLayers = recipe.layers.filter((l) => l.optional);
  const activeLayerCount = includeOptional
    ? recipe.layers.length
    : requiredLayers.length;

  const variationCombinations = recipe.variationAxes.reduce(
    (product, axis) => product * axis.values.length,
    1
  );

  const totalGenerations = activeLayerCount * variationCombinations;

  return {
    layerCount: requiredLayers.length,
    optionalLayerCount: optionalLayers.length,
    variationCombinations,
    totalGenerations,
    creditCostPerGeneration: creditPerGeneration,
    totalCredits: totalGenerations * creditPerGeneration,
    breakdown: recipe.variationAxes.map((axis) => ({
      axisName: axis.name,
      values: axis.values,
      multiplier: axis.values.length,
    })),
  };
}

// ── Recipe Storage (Client-side) ─────────────────────────────

import { RECIPE_STORAGE_KEY, RECIPE_FAVORITES_KEY } from "./recipe-schema";
import { BUILT_IN_RECIPES } from "./recipe-presets";

/**
 * Load all recipes (built-in + user custom) from localStorage.
 */
export function loadAllRecipes(): SoundDesignRecipe[] {
  const builtIn = [...BUILT_IN_RECIPES];
  if (typeof window === "undefined") return builtIn;

  try {
    const stored = localStorage.getItem(RECIPE_STORAGE_KEY);
    const custom: SoundDesignRecipe[] = stored ? JSON.parse(stored) : [];
    return [...builtIn, ...custom];
  } catch {
    return builtIn;
  }
}

/**
 * Save a custom recipe to localStorage.
 */
export function saveCustomRecipe(recipe: SoundDesignRecipe): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(RECIPE_STORAGE_KEY);
  const customs: SoundDesignRecipe[] = stored ? JSON.parse(stored) : [];
  const index = customs.findIndex((r) => r.id === recipe.id);
  if (index >= 0) {
    customs[index] = { ...recipe, updatedAt: new Date().toISOString() };
  } else {
    customs.push({ ...recipe, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(customs));
}

/**
 * Delete a custom recipe.
 */
export function deleteCustomRecipe(recipeId: string): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(RECIPE_STORAGE_KEY);
  const customs: SoundDesignRecipe[] = stored ? JSON.parse(stored) : [];
  localStorage.setItem(
    RECIPE_STORAGE_KEY,
    JSON.stringify(customs.filter((r) => r.id !== recipeId))
  );
}

/**
 * Get favorite recipe IDs.
 */
export function getRecipeFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(RECIPE_FAVORITES_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

/**
 * Toggle recipe favorite.
 */
export function toggleRecipeFavorite(recipeId: string): boolean {
  const favs = getRecipeFavorites();
  if (favs.has(recipeId)) {
    favs.delete(recipeId);
  } else {
    favs.add(recipeId);
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(RECIPE_FAVORITES_KEY, JSON.stringify([...favs]));
  }
  return favs.has(recipeId);
}
