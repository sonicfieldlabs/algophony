"use client";

import { Volume2, VolumeX, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StackerLayer } from "@/lib/sfx/stacker-taxonomy";
import { getLayerTypeDef, getFrequencyRoleDef } from "@/lib/sfx/stacker-taxonomy";

interface StackerMixerProps {
  layers: StackerLayer[];
  onChange: (layers: StackerLayer[]) => void;
}

export function StackerMixer({ layers, onChange }: StackerMixerProps) {
  if (layers.length === 0) return null;

  const updateLayer = (id: string, patch: Partial<StackerLayer>) => {
    onChange(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Volume2 className="h-3 w-3" />
        Layer Mixer
      </span>

      <div className="space-y-1">
        {layers.map((layer) => {
          const typeDef = getLayerTypeDef(layer.layerType);
          const freqDef = getFrequencyRoleDef(layer.frequencyRole);

          return (
            <div
              key={layer.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
                layer.muted ? "opacity-40 bg-atlas-bg" : "bg-atlas-surface hover:bg-atlas-surface-hover"
              )}
            >
              {/* Color indicator */}
              <div
                className="h-6 w-1 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(${typeDef.hue}, 70%, 50%)` }}
              />

              {/* Label */}
              <div className="w-16 shrink-0">
                <span className="text-xs font-semibold text-atlas-text block">{typeDef.shortLabel}</span>
                <span className="text-[7px] text-atlas-text-dim block">{freqDef.label}</span>
              </div>

              {/* Duration bar */}
              <div className="flex-1 h-4 bg-atlas-bg rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${Math.min(100, (layer.durationSeconds / 10) * 100)}%`,
                    backgroundColor: `hsl(${typeDef.hue}, 60%, 70%)`,
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-medium text-atlas-text tabular-nums">
                  {layer.durationSeconds}s
                </span>
              </div>

              {/* Mute / Solo */}
              <button
                onClick={() => updateLayer(layer.id, { muted: !layer.muted })}
                className={cn(
                  "rounded-md p-1 transition-colors shrink-0",
                  layer.muted ? "text-atlas-danger bg-atlas-danger/10" : "text-atlas-text-dim hover:text-atlas-accent"
                )}
              >
                {layer.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
              <button
                onClick={() => updateLayer(layer.id, { solo: !layer.solo })}
                className={cn(
                  "rounded-md p-1 transition-colors shrink-0",
                  layer.solo ? "text-atlas-accent bg-atlas-accent-muted" : "text-atlas-text-dim hover:text-atlas-accent"
                )}
              >
                <Headphones className="h-3 w-3" />
              </button>

              {/* Status indicator */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{
                backgroundColor: layer.status === "generated" ? "var(--atlas-success)" :
                  layer.status === "failed" ? "var(--atlas-danger)" :
                  layer.status === "generating" ? "var(--atlas-accent)" :
                  "var(--atlas-border)",
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
