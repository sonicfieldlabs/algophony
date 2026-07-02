"use client";

import { Zap, Loader2, Layers, Hash } from "lucide-react";
import type { AtmosphereLayer } from "@/lib/sfx/atmosphere-taxonomy";
import { getLayerDef } from "@/lib/sfx/atmosphere-taxonomy";
import { estimateAtmosphereCost } from "@/lib/sfx/atmosphere-prompt";

type GenerateMode = "selected" | "all" | "beds_only" | "micro_only";

interface GenerationQueueProps {
  layers: AtmosphereLayer[];
  generating: boolean;
  currentLayerId: string | null;
  onGenerate: (mode: GenerateMode) => void;
}

export function GenerationQueue({
  layers,
  generating,
  currentLayerId,
  onGenerate,
}: GenerationQueueProps) {
  const activeLayers = layers.filter((l) => !l.muted && l.status !== "rejected");
  const draftLayers = activeLayers.filter((l) => l.status === "draft");
  const bedLayers = activeLayers.filter((l) => l.layerType === "base_bed" && l.loopable);
  const microLayers = activeLayers.filter((l) => l.layerType === "micro_event");
  const totalCost = estimateAtmosphereCost(layers);

  const generatedCount = layers.filter((l) => l.status === "generated" || l.status === "favorite").length;
  const progressPercent = layers.length > 0 ? (generatedCount / layers.length) * 100 : 0;

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Layers className="h-3 w-3" />
        Generation Queue
      </span>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-atlas-text-dim">
          <span>{generatedCount} / {layers.length} layers</span>
          <span className="tabular-nums">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-atlas-surface-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-atlas-accent transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Generating indicator */}
      {generating && currentLayerId && (
        <div className="flex items-center gap-2 rounded-lg border border-atlas-accent/20 bg-atlas-accent-muted/20 px-3 py-2 animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin text-atlas-accent" />
          <span className="text-xs text-atlas-accent">
            Generating: {getLayerDef(layers.find((l) => l.id === currentLayerId)?.layerType ?? "base_bed").shortLabel}
          </span>
        </div>
      )}

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onGenerate("all")}
          disabled={generating || activeLayers.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-atlas-accent px-3 py-2.5 text-xs font-semibold text-white transition-all hover:bg-atlas-accent-hover disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          All · {totalCost}cr
        </button>

        <button
          onClick={() => onGenerate("selected")}
          disabled={generating || draftLayers.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border px-3 py-2.5 text-xs font-medium text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-40"
        >
          <Hash className="h-3.5 w-3.5" />
          Drafts ({draftLayers.length})
        </button>

        <button
          onClick={() => onGenerate("beds_only")}
          disabled={generating || bedLayers.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border px-3 py-2 text-xs font-medium text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-40"
        >
          Loop Beds ({bedLayers.length})
        </button>

        <button
          onClick={() => onGenerate("micro_only")}
          disabled={generating || microLayers.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border px-3 py-2 text-xs font-medium text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-40"
        >
          Micro Events ({microLayers.length})
        </button>
      </div>

      {/* Cost breakdown */}
      <div className="flex items-center justify-between text-xs text-atlas-text-dim pt-1 border-t border-atlas-border-subtle">
        <span>Estimated cost</span>
        <span className="tabular-nums font-medium">{totalCost} credit{totalCost !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
