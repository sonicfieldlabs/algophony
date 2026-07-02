"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft, Layers, Sparkles, Zap, ChevronDown, ChevronRight,
  Copy, Check, Music, Tag, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SoundDesignRecipe } from "@/lib/recipes/recipe-schema";
import { RECIPE_CATEGORY_HUES, RECIPE_CATEGORY_LABELS } from "@/lib/recipes/recipe-schema";
import { estimateRecipeCost, resolvePromptTemplate } from "@/lib/recipes/recipe-engine";

interface RecipeDetailProps {
  recipe: SoundDesignRecipe;
  onBack: () => void;
  onUseRecipe: (recipe: SoundDesignRecipe, variables: Record<string, string>) => void;
}

const FREQUENCY_ROLE_LABELS: Record<string, string> = {
  sub: "Sub (20–60 Hz)", low_body: "Low Body (60–200 Hz)", low_mid: "Low-Mid (200–500 Hz)",
  mid_detail: "Mid (500 Hz–2 kHz)", upper_mid: "Upper-Mid (2–5 kHz)", high_texture: "High (5–10 kHz)",
  air: "Air (10–20 kHz)", noise: "Broadband", transient_click: "Impulse", wide: "Full Range",
};

export function RecipeDetail({ recipe, onBack, onUseRecipe }: RecipeDetailProps) {
  const hue = RECIPE_CATEGORY_HUES[recipe.category] ?? 200;
  const cost = estimateRecipeCost(recipe);
  const [selectedVars, setSelectedVars] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const axis of recipe.variationAxes) {
      defaults[axis.name] = axis.values[0];
    }
    return defaults;
  });
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);

  const resolvedPrompts = useMemo(() =>
    recipe.layers.map((layer) => resolvePromptTemplate(layer.promptTemplate, selectedVars)),
    [recipe.layers, selectedVars]
  );

  const handleCopyPrompt = async (index: number) => {
    await navigator.clipboard.writeText(resolvedPrompts[index]);
    setCopiedPrompt(index);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-atlas-text-muted hover:text-atlas-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Recipes
      </button>

      {/* Header */}
      <div className="atlas-card p-6">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{ background: `hsl(${hue}, 40%, 15%)`, color: `hsl(${hue}, 60%, 60%)` }}
          >
            <Layers className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-atlas-text">{recipe.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: `hsl(${hue}, 50%, 55%)` }}
              >
                {RECIPE_CATEGORY_LABELS[recipe.category]}
              </span>
              <span className="text-xs text-atlas-text-dim">{recipe.layers.length} layers</span>
              <span className="text-xs text-atlas-text-dim">{cost.variationCombinations} combinations</span>
              <span className="text-xs text-atlas-accent">~{cost.totalCredits} credits full set</span>
            </div>
            <p className="text-xs text-atlas-text-muted mt-2 leading-relaxed">{recipe.description}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {recipe.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-0.5 rounded-md bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text-dim">
              <Tag className="h-2.5 w-2.5" /> {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Variation Axis Controls */}
      {recipe.variationAxes.length > 0 && (
        <div className="atlas-card p-5">
          <h3 className="text-sm font-semibold text-atlas-text mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-atlas-accent" />
            Variation Axes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipe.variationAxes.map((axis) => (
              <div key={axis.name}>
                <label className="text-xs text-atlas-text-dim mb-1.5 block font-medium">{axis.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {axis.values.map((val) => (
                    <button
                      key={val}
                      onClick={() => setSelectedVars((prev) => ({ ...prev, [axis.name]: val }))}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                        selectedVars[axis.name] === val
                          ? "bg-atlas-accent text-white"
                          : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-atlas-text-dim mt-1">
                  Affects layers: {axis.affectsLayers.map((i) => recipe.layers[i]?.label).filter(Boolean).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer Breakdown */}
      <div className="atlas-card p-5">
        <h3 className="text-sm font-semibold text-atlas-text mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-atlas-accent" />
          Layer Structure
        </h3>
        <div className="space-y-2">
          {recipe.layers.map((layer, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border transition-all",
                expandedLayer === i ? "border-atlas-accent bg-atlas-accent/5" : "border-atlas-border-subtle hover:border-atlas-border"
              )}
            >
              {/* Layer header */}
              <button
                onClick={() => setExpandedLayer(expandedLayer === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold shrink-0",
                  layer.optional ? "bg-atlas-surface-hover text-atlas-text-dim" : "bg-atlas-accent/10 text-atlas-accent"
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-atlas-text">{layer.label}</span>
                    <span className="text-xs text-atlas-text-dim uppercase">{layer.role}</span>
                    {layer.optional && (
                      <span className="text-xs text-atlas-text-dim bg-atlas-surface-hover px-1.5 py-0.5 rounded">optional</span>
                    )}
                    {layer.loop && (
                      <span className="text-xs text-atlas-accent bg-atlas-accent/10 px-1.5 py-0.5 rounded">loop</span>
                    )}
                  </div>
                  <p className="text-xs text-atlas-text-muted mt-0.5 truncate">{resolvedPrompts[i]}</p>
                </div>
                {expandedLayer === i ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-dim" />}
              </button>

              {/* Expanded details */}
              {expandedLayer === i && (
                <div className="border-t border-atlas-border-subtle px-4 py-3 space-y-3">
                  {/* Resolved prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-atlas-text-dim font-medium">Resolved Prompt</span>
                      <button
                        onClick={() => handleCopyPrompt(i)}
                        className="flex items-center gap-1 text-xs text-atlas-text-dim hover:text-atlas-accent"
                      >
                        {copiedPrompt === i ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                        {copiedPrompt === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="rounded-lg bg-atlas-bg px-3 py-2 text-xs text-atlas-text font-mono leading-relaxed">
                      {resolvedPrompts[i]}
                    </div>
                  </div>

                  {/* Layer metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-atlas-text-dim">Frequency Role</span>
                      <div className="text-atlas-text font-medium mt-0.5">{FREQUENCY_ROLE_LABELS[layer.frequencyRole] ?? layer.frequencyRole}</div>
                    </div>
                    <div>
                      <span className="text-atlas-text-dim">Duration</span>
                      <div className="text-atlas-text font-medium mt-0.5">{layer.duration.min}–{layer.duration.max}s</div>
                    </div>
                    <div>
                      <span className="text-atlas-text-dim">Prompt Influence</span>
                      <div className="text-atlas-text font-medium mt-0.5">{layer.promptInfluence}</div>
                    </div>
                    <div>
                      <span className="text-atlas-text-dim">Priority</span>
                      <div className="text-atlas-text font-medium mt-0.5">{layer.priority}</div>
                    </div>
                  </div>

                  {/* Template (raw) */}
                  <div>
                    <span className="text-xs text-atlas-text-dim font-medium">Template</span>
                    <div className="rounded-lg bg-atlas-bg px-3 py-2 text-xs text-atlas-text-dim font-mono mt-1">
                      {layer.promptTemplate}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="atlas-card p-5">
        <h3 className="text-sm font-semibold text-atlas-text mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-atlas-accent" />
          Cost Estimate
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-atlas-text-dim">Required Layers</span>
            <div className="text-lg font-bold text-atlas-text mt-0.5">{cost.layerCount}</div>
          </div>
          <div>
            <span className="text-atlas-text-dim">Optional Layers</span>
            <div className="text-lg font-bold text-atlas-text mt-0.5">{cost.optionalLayerCount}</div>
          </div>
          <div>
            <span className="text-atlas-text-dim">Variation Combos</span>
            <div className="text-lg font-bold text-atlas-text mt-0.5">{cost.variationCombinations}</div>
          </div>
          <div>
            <span className="text-atlas-text-dim">Total Credits</span>
            <div className="text-lg font-bold text-atlas-accent mt-0.5">{cost.totalCredits}</div>
          </div>
        </div>
        {cost.breakdown.length > 0 && (
          <div className="mt-3 text-xs text-atlas-text-dim">
            <span className="font-medium">Breakdown:</span>{" "}
            {cost.breakdown.map((b) => `${b.axisName} (×${b.multiplier})`).join(" × ")}
            {` × ${cost.layerCount} layers = ${cost.totalCredits} credits`}
          </div>
        )}
      </div>

      {/* Exclusions */}
      {recipe.exclusions.length > 0 && (
        <div className="atlas-card p-5">
          <h3 className="text-sm font-semibold text-atlas-text mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-atlas-text-dim" />
            Exclusion Constraints
          </h3>
          <div className="flex flex-wrap gap-2">
            {recipe.exclusions.map((ex) => (
              <span key={ex} className="rounded-md bg-red-500/5 border border-red-500/10 px-2 py-1 text-xs text-red-400">
                {ex}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onUseRecipe(recipe, selectedVars)}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-3.5 text-sm font-semibold text-white hover:bg-atlas-accent-hover transition-all hover:shadow-lg hover:shadow-atlas-accent/20"
        >
          <Music className="h-4 w-4" />
          Use Recipe in Stacker
        </button>
      </div>
    </div>
  );
}
