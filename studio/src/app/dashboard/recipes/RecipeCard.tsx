"use client";

import { Heart, Layers, Sparkles, Tag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SoundDesignRecipe } from "@/lib/recipes/recipe-schema";
import { RECIPE_CATEGORY_HUES } from "@/lib/recipes/recipe-schema";
import { estimateRecipeCost } from "@/lib/recipes/recipe-engine";

interface RecipeCardProps {
  recipe: SoundDesignRecipe;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (recipe: SoundDesignRecipe) => void;
}

export function RecipeCard({ recipe, isFavorite, onToggleFavorite, onSelect }: RecipeCardProps) {
  const hue = RECIPE_CATEGORY_HUES[recipe.category] ?? 200;
  const cost = estimateRecipeCost(recipe);
  const requiredLayers = recipe.layers.filter((l) => !l.optional).length;
  const optionalLayers = recipe.layers.filter((l) => l.optional).length;
  const totalVariations = recipe.variationAxes.reduce((p, a) => p * a.values.length, 1);

  return (
    <div
      className="group relative rounded-xl border border-atlas-border bg-atlas-surface hover:border-atlas-accent/40 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => onSelect(recipe)}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `hsl(${hue}, 60%, 50%)` }}
      />

      <div className="p-5 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `hsl(${hue}, 40%, 15%)`, color: `hsl(${hue}, 60%, 60%)` }}
            >
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-atlas-text group-hover:text-atlas-accent transition-colors">
                {recipe.name}
              </h3>
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: `hsl(${hue}, 50%, 55%)` }}
              >
                {recipe.category}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
            className={cn(
              "p-1.5 rounded-md transition-all",
              isFavorite
                ? "text-red-400 bg-red-400/10"
                : "text-atlas-text-dim hover:text-red-400 hover:bg-red-400/5 opacity-0 group-hover:opacity-100"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-atlas-text-muted leading-relaxed mb-3 line-clamp-2">
          {recipe.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-atlas-text-dim mb-3">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {requiredLayers} layers{optionalLayers > 0 && ` +${optionalLayers}`}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {totalVariations} variations
          </span>
          <span>~{cost.totalCredits} credits</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs text-atlas-text-dim bg-atlas-surface-hover"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {recipe.tags.length > 4 && (
            <span className="text-xs text-atlas-text-dim">+{recipe.tags.length - 4}</span>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between">
          {recipe.isBuiltIn && (
            <span className="text-xs text-atlas-accent/60 font-medium">Built-in</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-atlas-accent opacity-0 group-hover:opacity-100 transition-opacity">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
