"use client";

import { useState, useRef } from "react";
import { Play, Pause, Star, X, Repeat, Save, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtmosphereLayer } from "@/lib/sfx/atmosphere-taxonomy";
import { getLayerDef } from "@/lib/sfx/atmosphere-taxonomy";

interface AtmosphereSetPanelProps {
  layers: AtmosphereLayer[];
  projectName: string;
  onFavorite: (id: string) => void;
  onReject: (id: string) => void;
  onSaveSet: () => void;
}

export function AtmosphereSetPanel({
  layers,
  projectName: _projectName,
  onFavorite,
  onReject,
  onSaveSet,
}: AtmosphereSetPanelProps) {
  const [view, setView] = useState<"grid" | "list">("list");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generatedLayers = layers.filter(
    (l) => l.status === "generated" || l.status === "favorite"
  );

  if (generatedLayers.length === 0) return null;

  const playSound = (layer: AtmosphereLayer) => {
    if (!layer.audioUrl) return;
    if (playingId === layer.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = layer.audioUrl;
      audioRef.current.loop = layer.loopable;
      void audioRef.current.play();
      setPlayingId(layer.id);
    }
  };

  return (
    <div className="atlas-card p-4">
      <audio
        ref={audioRef}
        onPause={() => setPlayingId(null)}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
          Atmosphere Set · {generatedLayers.length} layers
        </span>
        <div className="flex gap-1">
          <button
            onClick={onSaveSet}
            className="flex items-center gap-1 rounded-lg border border-atlas-border px-2 py-1 text-xs text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
          >
            <Save className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn("rounded p-1 transition-colors", view === "grid" ? "text-atlas-accent" : "text-atlas-text-dim")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("rounded p-1 transition-colors", view === "list" ? "text-atlas-accent" : "text-atlas-text-dim")}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {view === "list" && (
        <div className="space-y-1">
          {generatedLayers.map((layer, i) => {
            const def = getLayerDef(layer.layerType);
            return (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  layer.status === "favorite"
                    ? "border-atlas-accent/20 bg-atlas-accent-muted/20"
                    : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
                )}
              >
                <span className="text-xs text-atlas-text-dim tabular-nums w-4 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${def.hue}, 55%, 50%)` }}
                />
                {layer.audioUrl && (
                  <button
                    onClick={() => playSound(layer)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors"
                  >
                    {playingId === layer.id ? (
                      <Pause className="h-2.5 w-2.5" />
                    ) : (
                      <Play className="h-2.5 w-2.5 ml-0.5" />
                    )}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-atlas-text capitalize">
                    {def.shortLabel}
                  </span>
                  <span className="text-xs text-atlas-text-dim ml-1.5 capitalize">{layer.layerRole}</span>
                </div>
                <span className="text-[8px] text-atlas-text-dim tabular-nums shrink-0">{layer.durationSeconds}s</span>
                {layer.loopable && <Repeat className="h-2.5 w-2.5 text-atlas-accent shrink-0" />}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onFavorite(layer.id)}
                    className={cn(
                      "p-0.5 transition-colors",
                      layer.status === "favorite" ? "text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-accent"
                    )}
                  >
                    <Star className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onReject(layer.id)}
                    className="p-0.5 text-atlas-text-dim hover:text-atlas-danger transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {generatedLayers.map((layer, i) => {
            const def = getLayerDef(layer.layerType);
            return (
              <div
                key={layer.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  layer.status === "favorite"
                    ? "border-atlas-accent/30 bg-atlas-accent-muted/30"
                    : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: `hsl(${def.hue}, 55%, 50%)` }}
                    />
                    <span className="text-xs font-medium text-atlas-text">{def.shortLabel}</span>
                  </div>
                  <span className="text-[8px] text-atlas-text-dim tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="text-xs text-atlas-text-dim capitalize mb-2">{layer.layerRole}</div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[8px] text-atlas-text-dim tabular-nums">{layer.durationSeconds}s</span>
                  {layer.loopable && <Repeat className="h-2 w-2 text-atlas-accent" />}
                </div>
                <div className="flex items-center gap-1">
                  {layer.audioUrl && (
                    <button
                      onClick={() => playSound(layer)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors"
                    >
                      {playingId === layer.id ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-0.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => onFavorite(layer.id)}
                    className={cn("p-0.5 transition-colors", layer.status === "favorite" ? "text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-accent")}
                  >
                    <Star className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onReject(layer.id)}
                    className="p-0.5 text-atlas-text-dim hover:text-atlas-danger transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
