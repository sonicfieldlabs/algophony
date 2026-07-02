"use client";

import { useState, useRef } from "react";
import { Play, Pause, Download, Loader2, Send, Dices, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FoleyItem } from "@/lib/sfx/foley-taxonomy";
import { getCategoryDef } from "@/lib/sfx/foley-taxonomy";
import type { StackerImportPayload } from "@/lib/sfx/stacker-taxonomy";

interface FoleyGeneratePanelProps {
  onGenerate: () => void;
  isGenerating: boolean;
  results: FoleyItem[];
  estimatedCost: number;
}

export function FoleyGeneratePanel({ onGenerate, isGenerating, results, estimatedCost }: FoleyGeneratePanelProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (item: FoleyItem) => {
    if (!item.audioUrl) return;
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
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

  const sendToStacker = (item: FoleyItem) => {
    const payload: StackerImportPayload = {
      module: "foley_room",
      promptText: item.composedPrompt,
      audioUrl: item.audioUrl,
    };
    localStorage.setItem("algophony-studio-stacker-import", JSON.stringify(payload));
    window.open("/dashboard/stacker", "_blank");
  };

  const sendToVariationLab = (item: FoleyItem) => {
    localStorage.setItem("algophony-studio-variation-import", JSON.stringify({
      module: "foley_room",
      promptText: item.composedPrompt,
      audioUrl: item.audioUrl,
    }));
    window.open("/dashboard/variation-lab", "_blank");
  };

  return (
    <>
      {/* Generate button — matches /generate sidebar. */}
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
            <Sparkles className="h-4 w-4" /> Generate Foley · {estimatedCost}cr
          </span>
        )}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="atlas-card p-3 space-y-2">
          <span className="text-xs font-semibold text-atlas-text-dim uppercase">Results · {results.filter((r) => r.status === "generated").length}</span>
          {results.map((item) => {
            const catDef = getCategoryDef(item.category);
            const isPlaying = playingId === item.id;

            return (
              <div key={item.id} className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                item.status === "generated" ? "border-atlas-success/20 bg-atlas-success/5" :
                item.status === "failed" ? "border-atlas-danger/20 bg-atlas-danger/5" :
                "border-atlas-border-subtle"
              )}>
                {/* Play */}
                {item.audioUrl && (
                  <button onClick={() => playSound(item)} className="shrink-0">
                    {isPlaying ? <Pause className="h-4 w-4 text-atlas-accent" /> : <Play className="h-4 w-4 text-atlas-text-dim hover:text-atlas-accent" />}
                  </button>
                )}
                {item.status === "generating" && <Loader2 className="h-4 w-4 text-atlas-accent animate-spin shrink-0" />}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-atlas-text">{catDef.label} · Take {item.takeNumber}</span>
                  {item.side && <span className="text-xs text-atlas-text-dim ml-1.5">({item.side})</span>}
                  <p className="text-xs text-atlas-text-dim truncate font-mono mt-0.5">{item.composedPrompt.slice(0, 100)}…</p>
                </div>

                {/* Actions */}
                {item.status === "generated" && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => sendToStacker(item)} title="Send to Stacker" className="p-1 rounded-md text-atlas-text-dim hover:text-atlas-accent hover:bg-atlas-surface transition-colors">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => sendToVariationLab(item)} title="Send to Variation Lab" className="p-1 rounded-md text-atlas-text-dim hover:text-atlas-accent hover:bg-atlas-surface transition-colors">
                      <Dices className="h-3.5 w-3.5" />
                    </button>
                    {item.audioUrl && (
                      <a href={item.audioUrl} download className="p-1 rounded-md text-atlas-text-dim hover:text-atlas-accent hover:bg-atlas-surface transition-colors">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
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
