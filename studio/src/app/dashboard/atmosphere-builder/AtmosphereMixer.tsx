"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause, Repeat, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtmosphereLayer } from "@/lib/sfx/atmosphere-taxonomy";
import { getLayerDef } from "@/lib/sfx/atmosphere-taxonomy";

interface AtmosphereMixerProps {
  layers: AtmosphereLayer[];
  onLayerChange: (id: string, updates: Partial<AtmosphereLayer>) => void;
  onFavorite: (id: string) => void;
  onReject: (id: string) => void;
}

export function AtmosphereMixer({
  layers,
  onLayerChange,
  onFavorite,
  onReject,
}: AtmosphereMixerProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (layers.length === 0) return null;

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

  const toggleMute = (layer: AtmosphereLayer) => {
    onLayerChange(layer.id, { muted: !layer.muted, solo: false });
  };

  const toggleSolo = (layer: AtmosphereLayer) => {
    onLayerChange(layer.id, { solo: !layer.solo, muted: false });
  };

  const MiniSlider = ({
    label,
    value,
    onChange: onSliderChange,
    min = 0,
    max = 1,
    step = 0.05,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-atlas-text-dim w-8 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onSliderChange(parseFloat(e.target.value))}
        className="flex-1 h-0.5 accent-atlas-accent"
      />
      <span className="text-[8px] text-atlas-text-dim tabular-nums w-5">{value.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="atlas-card p-4">
      <audio
        ref={audioRef}
        onPause={() => setPlayingId(null)}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim block mb-3">
        Atmosphere Mixer
      </span>

      <div className="space-y-1">
        {layers.map((layer) => {
          const def = getLayerDef(layer.layerType);
          const hasSolo = layers.some((l) => l.solo);
          const effectiveMuted = layer.muted || (hasSolo && !layer.solo);

          return (
            <div
              key={layer.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 transition-all",
                effectiveMuted
                  ? "opacity-40 border-atlas-border-subtle bg-atlas-surface"
                  : layer.solo
                  ? "border-atlas-accent/30 bg-atlas-accent-muted/20"
                  : layer.status === "generated"
                  ? "border-emerald-200/30 bg-atlas-surface"
                  : "border-atlas-border-subtle bg-atlas-surface"
              )}
            >
              {/* Color dot + label */}
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(${def.hue}, 55%, 50%)` }}
              />
              <span className="text-xs font-medium text-atlas-text w-14 shrink-0 truncate">
                {def.shortLabel}
              </span>

              {/* Mute / Solo */}
              <div className="flex gap-0.5 shrink-0">
                <button
                  onClick={() => toggleMute(layer)}
                  className={cn(
                    "rounded p-0.5 transition-colors",
                    layer.muted ? "text-atlas-danger" : "text-atlas-text-dim hover:text-atlas-text-muted"
                  )}
                >
                  {layer.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => toggleSolo(layer)}
                  className={cn(
                    "rounded px-1 py-0.5 text-[7px] font-bold transition-colors",
                    layer.solo ? "text-atlas-accent bg-atlas-accent-muted" : "text-atlas-text-dim hover:text-atlas-text-muted"
                  )}
                >
                  S
                </button>
              </div>

              {/* Mini sliders */}
              <div className="flex-1 min-w-0 grid grid-cols-4 gap-x-2">
                <MiniSlider label="Int" value={layer.intensity} onChange={(v) => onLayerChange(layer.id, { intensity: v })} />
                <MiniSlider label="Den" value={layer.density} onChange={(v) => onLayerChange(layer.id, { density: v })} />
                <MiniSlider label="Dist" value={layer.distance} onChange={(v) => onLayerChange(layer.id, { distance: v })} />
                <MiniSlider label="Mov" value={layer.movement} onChange={(v) => onLayerChange(layer.id, { movement: v })} />
              </div>

              {/* Duration + Loop */}
              <span className="text-[8px] text-atlas-text-dim tabular-nums shrink-0 w-6 text-right">
                {layer.durationSeconds}s
              </span>
              {layer.loopable && (
                <Repeat className="h-2.5 w-2.5 text-atlas-accent shrink-0" />
              )}

              {/* Play */}
              {layer.audioUrl && (
                <button
                  onClick={() => playSound(layer)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-atlas-accent text-white shrink-0 hover:bg-atlas-accent-hover transition-colors"
                >
                  {playingId === layer.id ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-0.5" />}
                </button>
              )}

              {/* Status + Actions */}
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
    </div>
  );
}
