"use client";

import { useState, useRef } from "react";
import { Play, Pause, Download, Volume2 } from "lucide-react";
import type { StackerLayer } from "@/lib/sfx/stacker-taxonomy";
import { getLayerTypeDef, getFrequencyRoleDef } from "@/lib/sfx/stacker-taxonomy";

interface StackerResultsPanelProps {
  layers: StackerLayer[];
}

export function StackerResultsPanel({ layers }: StackerResultsPanelProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generated = layers.filter((l) => l.status === "generated");
  if (generated.length === 0) return null;

  const playSound = (layer: StackerLayer) => {
    if (!layer.audioUrl) return;
    if (playingId === layer.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(layer.audioUrl);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    void audio.play();
    setPlayingId(layer.id);
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Volume2 className="h-3 w-3" />
          Stack Audio Layers · {generated.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {generated.map((layer) => {
          const typeDef = getLayerTypeDef(layer.layerType);
          const freqDef = getFrequencyRoleDef(layer.frequencyRole);
          const isPlaying = playingId === layer.id;

          return (
            <div
              key={layer.id}
              className="rounded-xl border border-atlas-border-subtle bg-atlas-bg p-2.5 space-y-2 hover:border-atlas-border transition-all"
            >
              {/* Play button */}
              <button
                onClick={() => playSound(layer)}
                className="flex h-12 w-full items-center justify-center rounded-lg transition-colors"
                style={{ backgroundColor: `hsl(${typeDef.hue}, 50%, 92%)` }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" style={{ color: `hsl(${typeDef.hue}, 70%, 40%)` }} />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" style={{ color: `hsl(${typeDef.hue}, 70%, 40%)` }} />
                )}
              </button>

              {/* Labels */}
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-atlas-text block">{typeDef.label}</span>
                <span
                  className="rounded px-1 py-0.5 text-[7px] font-medium inline-block"
                  style={{
                    backgroundColor: `hsl(${freqDef.hue}, 50%, 92%)`,
                    color: `hsl(${freqDef.hue}, 60%, 35%)`,
                  }}
                >
                  {freqDef.label}
                </span>
                {layer.sourceKind && (
                  <span className="ml-1 rounded bg-atlas-surface px-1 py-0.5 text-[7px] font-medium text-atlas-text-dim">
                    {layer.sourceKind}
                  </span>
                )}
                {layer.sourceFileName && (
                  <span className="mt-1 block truncate font-mono text-[8px] text-atlas-text-dim">
                    {layer.sourceFileName}
                  </span>
                )}
              </div>

              {/* Duration + Download */}
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-atlas-text-dim tabular-nums">{layer.durationSeconds}s</span>
                {layer.audioUrl && (
                  <a
                    href={layer.audioUrl}
                    download
                    className="text-atlas-text-dim hover:text-atlas-accent transition-colors"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
