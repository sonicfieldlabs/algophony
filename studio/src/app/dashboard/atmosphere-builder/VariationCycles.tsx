"use client";

import { useRef, useState } from "react";
import { Copy, Shuffle, Layers, ChevronDown, Trash2, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtmosphereLayer } from "@/lib/sfx/atmosphere-taxonomy";
import { getLayerDef } from "@/lib/sfx/atmosphere-taxonomy";

export interface VariationSet {
  layerId: string;
  variations: AtmosphereLayer[];
}

interface VariationCyclesProps {
  layers: AtmosphereLayer[];
  variationSets: VariationSet[];
  onGenerateVariations: (layerId: string, count: number) => void;
  onSelectVariation: (layerId: string, variationIndex: number) => void;
  onRemoveVariation: (layerId: string, variationIndex: number) => void;
  generating: boolean;
}

export function VariationCycles({
  layers,
  variationSets,
  onGenerateVariations,
  onSelectVariation,
  onRemoveVariation,
  generating,
}: VariationCyclesProps) {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const [variationCount, setVariationCount] = useState(3);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generatedLayers = layers.filter(
    (l) => l.status === "generated" || l.status === "favorite"
  );

  if (generatedLayers.length === 0) return null;

  const playVariation = (v: AtmosphereLayer) => {
    if (!v.audioUrl) return;
    if (playingId === v.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(v.audioUrl);
    audio.loop = v.loopable;
    audio.onended = () => setPlayingId(null);
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    audioRef.current = audio;
    void audio.play();
    setPlayingId(v.id);
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Shuffle className="h-3 w-3" />
          Variation Cycles
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-atlas-text-dim">Variations per layer:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setVariationCount(n)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-all",
                  variationCount === n
                    ? "bg-atlas-accent-muted text-atlas-accent"
                    : "text-atlas-text-dim hover:text-atlas-text-muted"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {generatedLayers.map((layer) => {
          const def = getLayerDef(layer.layerType);
          const varSet = variationSets.find((vs) => vs.layerId === layer.id);
          const isExpanded = expandedLayerId === layer.id;
          const hasVariations = varSet && varSet.variations.length > 0;

          return (
            <div
              key={layer.id}
              className="rounded-xl border border-atlas-border-subtle bg-atlas-surface overflow-hidden"
            >
              {/* Layer header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${def.hue}, 55%, 50%)` }}
                />
                <span className="text-xs font-medium text-atlas-text flex-1">
                  {def.shortLabel}
                  <span className="text-atlas-text-dim ml-1 capitalize">{layer.layerRole}</span>
                </span>
                {hasVariations && (
                  <span className="text-[8px] text-atlas-accent font-medium tabular-nums">
                    {varSet.variations.length} var{varSet.variations.length !== 1 ? "s" : ""}
                  </span>
                )}
                <button
                  onClick={() => onGenerateVariations(layer.id, variationCount)}
                  disabled={generating}
                  className="flex items-center gap-1 rounded-lg border border-atlas-border px-2 py-1 text-xs text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors disabled:opacity-40"
                >
                  <Copy className="h-2.5 w-2.5" />
                  ×{variationCount}
                </button>
                {hasVariations && (
                  <button
                    onClick={() => setExpandedLayerId(isExpanded ? null : layer.id)}
                    className="text-atlas-text-dim hover:text-atlas-accent transition-colors"
                  >
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                )}
              </div>

              {/* Variation list */}
              {isExpanded && hasVariations && (
                <div className="border-t border-atlas-border-subtle px-3 py-2 space-y-1 bg-atlas-bg/50 animate-expand-down">
                  {varSet.variations.map((v, i) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-atlas-surface transition-colors"
                    >
                      <span className="text-[8px] text-atlas-text-dim tabular-nums w-4">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-xs text-atlas-text-muted flex-1 truncate font-mono">
                        {v.promptText.slice(0, 60)}…
                      </span>
                      <span className="text-[8px] text-atlas-text-dim tabular-nums">{v.durationSeconds}s</span>
                      {v.audioUrl && (
                        <button
                          onClick={() => playVariation(v)}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors"
                        >
                          {playingId === v.id ? <Pause className="h-2 w-2" /> : <Play className="h-2 w-2 ml-0.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => onSelectVariation(layer.id, i)}
                        className="rounded-md border border-atlas-border px-1.5 py-0.5 text-[8px] text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => onRemoveVariation(layer.id, i)}
                        className="text-atlas-text-dim hover:text-atlas-danger transition-colors"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch generate */}
      <button
        onClick={() => {
          for (const l of generatedLayers) {
            onGenerateVariations(l.id, variationCount);
          }
        }}
        disabled={generating || generatedLayers.length === 0}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-atlas-border px-3 py-2 text-xs font-medium text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors disabled:opacity-40"
      >
        <Layers className="h-3 w-3" />
        Generate All Variations ({generatedLayers.length} × {variationCount})
      </button>
    </div>
  );
}
