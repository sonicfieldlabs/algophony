"use client";

import { useState } from "react";
import { Waves, TreePine, Fingerprint, Move3d, Drama, Cpu, Zap, Plus, X, Repeat, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtmosphereLayer, AtmosphereLayerType } from "@/lib/sfx/atmosphere-taxonomy";
import { LAYER_TYPE_DEFS, getLayerDef } from "@/lib/sfx/atmosphere-taxonomy";

const LAYER_ICONS: Record<AtmosphereLayerType, React.ElementType> = {
  base_bed: Waves,
  ecology: TreePine,
  texture: Fingerprint,
  spatial: Move3d,
  dramatic: Drama,
  synthetic: Cpu,
  micro_event: Zap,
};

interface LayerDecomposerProps {
  layers: AtmosphereLayer[];
  onLayerChange: (id: string, updates: Partial<AtmosphereLayer>) => void;
  onAddLayer: (type: AtmosphereLayerType) => void;
  onRemoveLayer: (id: string) => void;
  onGenerateLayer: (id: string) => void;
}

export function LayerDecomposer({
  layers,
  onLayerChange,
  onAddLayer,
  onRemoveLayer,
  onGenerateLayer,
}: LayerDecomposerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (layers.length === 0) {
    return (
      <div className="atlas-card p-6 text-center">
        <p className="text-sm text-atlas-text-dim">
          Fill in the Atmosphere Brief above and press &ldquo;Decompose&rdquo; to generate layer prompts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
          Layers · {layers.length}
        </span>
        <div className="relative group">
          <button className="flex items-center gap-1 text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors">
            <Plus className="h-3 w-3" /> Add Layer
          </button>
          <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block">
            <div className="rounded-xl border border-atlas-border bg-atlas-surface shadow-lg p-1 min-w-[140px]">
              {LAYER_TYPE_DEFS.map((def) => {
                const Icon = LAYER_ICONS[def.id];
                return (
                  <button
                    key={def.id}
                    onClick={() => onAddLayer(def.id)}
                    className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-xs text-atlas-text-muted hover:bg-atlas-surface-hover transition-colors"
                  >
                    <Icon className="h-3 w-3" style={{ color: `hsl(${def.hue}, 55%, 50%)` }} />
                    {def.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {layers.map((layer) => {
          const def = getLayerDef(layer.layerType);
          const Icon = LAYER_ICONS[layer.layerType];
          const isExpanded = expandedId === layer.id;

          return (
            <div
              key={layer.id}
              className={cn(
                "rounded-xl border p-3 transition-all",
                layer.status === "generated"
                  ? "border-emerald-200/50 bg-emerald-50/30 [data-theme=dark]:border-emerald-900/20 [data-theme=dark]:bg-emerald-950/10"
                  : layer.status === "generating"
                  ? "border-atlas-accent/30 bg-atlas-accent-muted/20 animate-pulse"
                  : layer.status === "favorite"
                  ? "border-atlas-accent/30 bg-atlas-accent-muted/30"
                  : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
              )}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `hsla(${def.hue}, 50%, 50%, 0.12)` }}
                  >
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: `hsl(${def.hue}, 55%, 50%)` }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-atlas-text">{def.shortLabel}</span>
                    <span className="text-[8px] text-atlas-text-dim ml-1 capitalize">{layer.layerRole}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      layer.status === "generated" && "bg-atlas-success",
                      layer.status === "generating" && "bg-atlas-accent animate-pulse",
                      layer.status === "favorite" && "bg-atlas-accent",
                      layer.status === "rejected" && "bg-atlas-danger",
                      layer.status === "draft" && "bg-atlas-text-dim"
                    )}
                  />
                  <button
                    onClick={() => onRemoveLayer(layer.id)}
                    className="text-atlas-text-dim hover:text-atlas-danger transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Prompt preview / editor */}
              <textarea
                value={layer.promptText}
                onChange={(e) => onLayerChange(layer.id, { promptText: e.target.value })}
                rows={isExpanded ? 5 : 2}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text font-mono leading-relaxed placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none resize-none mb-2"
              />

              {/* Compact controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-atlas-text-dim tabular-nums">{layer.durationSeconds}s</span>
                  {layer.loopable && (
                    <Repeat className="h-2.5 w-2.5 text-atlas-accent" />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : layer.id)}
                    className="text-atlas-text-dim hover:text-atlas-accent transition-colors"
                  >
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                  <button
                    onClick={() => onGenerateLayer(layer.id)}
                    disabled={layer.status === "generating"}
                    className="rounded-lg bg-atlas-accent px-2 py-0.5 text-xs font-medium text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-50"
                  >
                    Gen
                  </button>
                </div>
              </div>

              {/* Expanded controls */}
              {isExpanded && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-atlas-border-subtle animate-expand-down">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-atlas-text-dim w-12">Duration</span>
                    <input
                      type="range"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={layer.durationSeconds}
                      onChange={(e) => onLayerChange(layer.id, { durationSeconds: parseFloat(e.target.value) })}
                      className="flex-1 h-1 accent-atlas-accent"
                    />
                    <span className="text-xs text-atlas-text-dim tabular-nums w-8">{layer.durationSeconds}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-atlas-text-dim w-12">Influence</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={layer.promptInfluence}
                      onChange={(e) => onLayerChange(layer.id, { promptInfluence: parseFloat(e.target.value) })}
                      className="flex-1 h-1 accent-atlas-accent"
                    />
                    <span className="text-xs text-atlas-text-dim tabular-nums w-8">{layer.promptInfluence.toFixed(2)}</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-atlas-text-dim cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layer.loopable}
                      onChange={(e) => onLayerChange(layer.id, { loopable: e.target.checked })}
                      className="rounded accent-atlas-accent h-3 w-3"
                    />
                    Loopable
                  </label>
                  <div>
                    <span className="text-xs text-atlas-text-dim block mb-1">Freq. Role</span>
                    <div className="flex gap-1">
                      {(["low", "mid", "high", "full"] as const).map((fr) => (
                        <button
                          key={fr}
                          onClick={() => onLayerChange(layer.id, { frequencyRole: fr })}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[8px] font-medium capitalize transition-all",
                            layer.frequencyRole === fr
                              ? "bg-atlas-accent-muted text-atlas-accent"
                              : "text-atlas-text-dim hover:text-atlas-text-muted"
                          )}
                        >
                          {fr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
