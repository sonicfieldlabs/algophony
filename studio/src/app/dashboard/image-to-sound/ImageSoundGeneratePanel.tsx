"use client";

import { SoundCard } from "@/lib/sfx/image-to-sound-taxonomy";
import { Zap, AudioWaveform } from "lucide-react";
import { AudioPlayer } from "../components/audio-player";

interface ImageSoundGeneratePanelProps {
  cards: SoundCard[];
  onGenerate: () => void;
  isGenerating: boolean;
  estimatedCost: number;
}

export function ImageSoundGeneratePanel({ cards, onGenerate, isGenerating, estimatedCost }: ImageSoundGeneratePanelProps) {
  const selectedCount = cards.filter(c => c.selected).length;
  const completedCards = cards.filter(c => c.status === "generated");

  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="atlas-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up" style={{ animationDelay: "350ms" }}>
        <div>
          <h2 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
            <AudioWaveform className="h-4 w-4 text-atlas-accent" />
            Generate Sounds
          </h2>
          <p className="text-xs text-atlas-text-dim mt-0.5">
            {selectedCount} cards selected for generation.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col items-end text-xs">
            <span className="text-atlas-text-dim font-medium">Estimated Cost</span>
            <span className="flex items-center gap-1 font-bold text-atlas-text">
              <Zap className="h-3 w-3 text-atlas-accent" /> {estimatedCost} credits
            </span>
          </div>

          <button
            onClick={onGenerate}
            disabled={isGenerating || selectedCount === 0}
            className={`
              flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-[13px] transition-all
              ${isGenerating || selectedCount === 0
                ? "bg-atlas-surface-hover text-atlas-text-muted cursor-not-allowed border border-atlas-border-subtle"
                : "bg-atlas-text text-atlas-bg hover:bg-atlas-text-muted border border-transparent shadow-sm"}
            `}
          >
            {isGenerating ? (
              <>
                <div className="flex items-end gap-[2px] h-3">
                  <div className="waveform-bar bg-current" />
                  <div className="waveform-bar bg-current" />
                  <div className="waveform-bar bg-current" />
                  <div className="waveform-bar bg-current" />
                </div>
                Generating...
              </>
            ) : (
              "Generate Selected"
            )}
          </button>
        </div>
      </div>

      {/* Results List */}
      {completedCards.length > 0 && (
        <div className="atlas-card p-4 animate-slide-up space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim mb-3">
            Generated Sounds ({completedCards.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {completedCards.map(card => (
              <div key={card.id} className="bg-atlas-surface-hover border border-atlas-border rounded-lg p-3">
                <div className="text-xs font-medium text-atlas-text mb-2 truncate">
                  {card.title}
                </div>
                {card.audioUrl && (
                  <AudioPlayer
                    src={card.audioUrl}
                    title={card.title}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
