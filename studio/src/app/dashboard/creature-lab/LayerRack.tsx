"use client";

import { Play, Pause, Trash2, Layers, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, useCallback } from "react";

export interface CreatureLayer {
  id: string;
  role: string;
  apiRoute: string;
  prompt: string;
  audioUrl: string | null;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
  characterCost?: number;
}

interface LayerRackProps {
  layers: CreatureLayer[];
  onRemoveLayer: (id: string) => void;
  onCombine: () => void;
  combining: boolean;
  combinedResult: { audioUrl: string; characterCost: number } | null;
}

function LayerPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else void audioRef.current.play();
  }, [playing]);

  return (
    <>
      <audio ref={audioRef} src={url} preload="none" />
      <button onClick={toggle} className="flex h-6 w-6 items-center justify-center rounded-md bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors shrink-0">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>
    </>
  );
}

const ROLE_COLORS: Record<string, string> = {
  main: "bg-atlas-accent-muted text-atlas-accent",
  background: "bg-green-900/15 text-green-400",
  texture: "bg-amber-900/15 text-amber-400",
  accent: "bg-purple-900/15 text-purple-400",
};

export function LayerRack({ layers, onRemoveLayer, onCombine, combining, combinedResult }: LayerRackProps) {
  const doneLayers = layers.filter((l) => l.status === "done");
  const canCombine = doneLayers.length >= 2;

  if (layers.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
          <Layers className="h-3 w-3" /> Layer Rack
        </div>
        <span className="text-xs text-atlas-text-dim">{layers.length} layers · {doneLayers.length} ready</span>
      </div>

      <div className="space-y-1.5">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
              layer.status === "error"
                ? "border-atlas-danger/30 bg-atlas-danger/5"
                : layer.status === "done"
                ? "border-atlas-border bg-atlas-surface"
                : "border-atlas-border-subtle bg-atlas-bg"
            )}
          >
            {/* Role pill */}
            <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-medium shrink-0", ROLE_COLORS[layer.role] || ROLE_COLORS.main)}>
              {layer.role}
            </span>

            {/* Prompt preview */}
            <span className="text-xs text-atlas-text-muted truncate flex-1">
              {layer.prompt.slice(0, 50)}...
            </span>

            {/* Status */}
            {layer.status === "generating" && <Loader2 className="h-3.5 w-3.5 animate-spin text-atlas-accent shrink-0" />}
            {layer.status === "error" && <span className="text-xs text-atlas-danger shrink-0">error</span>}
            {layer.status === "done" && layer.audioUrl && <LayerPlayer url={layer.audioUrl} />}

            {/* Cost */}
            {layer.characterCost && <span className="text-xs text-atlas-text-dim shrink-0">{layer.characterCost}c</span>}

            {/* Remove */}
            <button onClick={() => onRemoveLayer(layer.id)} className="p-0.5 text-atlas-text-dim hover:text-atlas-danger transition-colors shrink-0">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Combine button */}
      {canCombine && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-atlas-warning">
            <AlertTriangle className="h-3 w-3" />
            Combining layers costs additional credits
          </div>
          <button
            onClick={onCombine}
            disabled={combining}
            className={cn(
              "w-full rounded-lg py-2.5 text-xs font-medium transition-all",
              combining
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-gradient-to-r from-atlas-accent to-purple-500 text-white hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
            )}
          >
            {combining ? (
              <span className="flex items-center justify-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Combining...</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Combine {doneLayers.length} Layers into Final</span>
            )}
          </button>
        </div>
      )}

      {/* Combined result */}
      {combinedResult && (
        <div className="rounded-lg border border-atlas-accent/40 bg-atlas-accent-muted p-3 animate-scale-in">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-atlas-accent" />
            <span className="text-xs font-medium text-atlas-accent">Combined Creature</span>
            <span className="text-xs text-atlas-text-dim ml-auto">{combinedResult.characterCost} chars</span>
          </div>
          <audio controls src={combinedResult.audioUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}
