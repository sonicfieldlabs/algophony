"use client";

import { cn } from "@/lib/utils";
import { ENGINE_MODE_DEFS, type EngineMode } from "@/lib/sfx/ui-elements-taxonomy";
import { Volume2, Mic, MessageCircle, Music, Layers } from "lucide-react";

const MODE_ICONS: Record<EngineMode, React.ElementType> = {
  sound_effects: Volume2,
  text_to_speech: Mic,
  text_to_dialogue: MessageCircle,
  music_motif: Music,
  hybrid: Layers,
};

interface EngineModeSelectorProps {
  value: EngineMode;
  onChange: (mode: EngineMode) => void;
  voiceText: string;
  onVoiceTextChange: (text: string) => void;
}

export function EngineModeSelector({
  value,
  onChange,
  voiceText,
  onVoiceTextChange,
}: EngineModeSelectorProps) {
  const showTextInput = value === "text_to_speech" || value === "text_to_dialogue";

  const activeDef = ENGINE_MODE_DEFS.find((m) => m.id === value);

  return (
    // Inline icon-only segmented control: rotates description + credit cost
    // into a single line below the picker so the panel collapses from 5
    // stacked cards to roughly one row of chrome.
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">
          Engine
        </span>
        <div className="flex rounded-lg border border-atlas-border overflow-hidden">
          {ENGINE_MODE_DEFS.map((mode, i) => {
            const Icon = MODE_ICONS[mode.id];
            const isActive = value === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onChange(mode.id)}
                title={`${mode.shortLabel} — ${mode.description} · ${mode.creditCost} cr`}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
                  i > 0 && "border-l border-atlas-border",
                  isActive
                    ? "bg-atlas-accent text-white"
                    : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>
      {activeDef && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-atlas-text-dim">
          <span className="font-medium text-atlas-text-muted">{activeDef.shortLabel}</span>
          <span className="truncate flex-1 min-w-0">{activeDef.description}</span>
          <span className="tabular-nums shrink-0">{activeDef.creditCost} cr</span>
        </div>
      )}

      {/* Voice/Dialogue text input */}
      {showTextInput && (
        <div className="animate-expand-down">
          <input
            value={voiceText}
            onChange={(e) => onVoiceTextChange(e.target.value)}
            placeholder={
              value === "text_to_speech"
                ? '"Done." / "Saved." / "Welcome back."'
                : '"Nice move!" / "Try again."'
            }
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
