"use client";

import { useState, useRef } from "react";
import { Play, Pause, Download, Loader2, Send, Dices, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HumanItem, EngineMode } from "@/lib/sfx/human-taxonomy";
import { getCategoryDef, getEngineModeDef } from "@/lib/sfx/human-taxonomy";

interface HumanGeneratePanelProps {
  onGenerate: () => void;
  isGenerating: boolean;
  results: HumanItem[];
  estimatedCost: number;
  engineMode: EngineMode;
}

export function HumanGeneratePanel({ onGenerate, isGenerating, results, estimatedCost, engineMode }: HumanGeneratePanelProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (item: HumanItem) => {
    if (!item.audioUrl) return;
    if (playingId === item.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(item.audioUrl);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    void audio.play();
    setPlayingId(item.id);
  };

  const sendToStacker = (item: HumanItem) => {
    localStorage.setItem("algophony-studio-stacker-import", JSON.stringify({
      module: "human_lab",
      promptText: `Human Lab generated audio take ${item.takeNumber}`,
      audioUrl: item.audioUrl,
    }));
    window.open("/dashboard/stacker", "_blank");
  };

  const sendToVariationLab = (item: HumanItem) => {
    localStorage.setItem("algophony-studio-variation-import", JSON.stringify({
      module: "human_lab",
      promptText: `Human Lab generated audio take ${item.takeNumber}`,
      audioUrl: item.audioUrl,
    }));
    window.open("/dashboard/variation-lab", "_blank");
  };

  const engDef = getEngineModeDef(engineMode);

  return (
    <>
      {/* Generate button — matches /generate sidebar (rounded-xl py-4,
          accent solid, waveform loader). */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className={cn(
          "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
          isGenerating
            ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
            : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
        )}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-3">
            <span className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="waveform-bar" />
              ))}
            </span>
            Generating...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" /> Generate {engDef.label} · {estimatedCost}cr
          </span>
        )}
      </button>

      {results.length > 0 && (
        <div className="atlas-card p-3 space-y-2">
          <span className="text-xs font-semibold text-atlas-text-dim uppercase">Results · {results.filter((r) => r.status === "generated").length}</span>
          {results.map((item) => {
            const catDef = getCategoryDef(item.category);
            const isPlaying = playingId === item.id;

            return (
              <div key={item.id} className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 transition-all",
                item.status === "generated" ? "border-atlas-success/20 bg-atlas-success/5" :
                item.status === "failed" ? "border-atlas-danger/20 bg-atlas-danger/5" :
                "border-atlas-border-subtle"
              )}>
                {item.audioUrl && (
                  <button onClick={() => playSound(item)} className="shrink-0">
                    {isPlaying ? <Pause className="h-4 w-4 text-atlas-accent" /> : <Play className="h-4 w-4 text-atlas-text-dim hover:text-atlas-accent" />}
                  </button>
                )}
                {item.status === "generating" && <Loader2 className="h-4 w-4 text-atlas-accent animate-spin shrink-0" />}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-atlas-text">{catDef.label} · Take {item.takeNumber}</span>
                    <span className="text-xs text-atlas-text-dim capitalize px-1 py-0.5 rounded bg-atlas-surface">{item.engineMode}</span>
                  </div>
                  <p className="text-xs text-atlas-text-dim truncate font-mono">{item.composedPrompt.slice(0, 80)}…</p>
                  {item.dawNotes && <p className="text-[10px] text-atlas-text-dim/50 italic mt-0.5">{item.dawNotes}</p>}
                </div>

                {item.status === "generated" && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => sendToStacker(item)} title="Send to Stacker" className="text-atlas-text-dim hover:text-atlas-accent p-0.5"><Send className="h-3 w-3" /></button>
                    <button onClick={() => sendToVariationLab(item)} title="Send to Variation Lab" className="text-atlas-text-dim hover:text-atlas-accent p-0.5"><Dices className="h-3 w-3" /></button>
                    {item.audioUrl && <a href={item.audioUrl} download className="text-atlas-text-dim hover:text-atlas-accent p-0.5"><Download className="h-3 w-3" /></a>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
