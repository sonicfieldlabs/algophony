"use client";

import {
  Film, Gamepad2, Sparkles, Smartphone, Clapperboard, Share2, Landmark,
  AudioWaveform, FlaskConical, Layers,
} from "lucide-react";
import { USE_CASES, INTERPRETATION_MODES, UseCase, InterpretationMode } from "@/lib/sfx/image-to-sound-taxonomy";

// Lookup table for use-case icons. Lives here (not the taxonomy) because
// React components don't serialize cleanly into shared TS data files.
const USE_CASE_ICONS: Record<string, React.ElementType> = {
  Film, Gamepad2, Sparkles, Smartphone, Clapperboard, Share2,
  Landmark, AudioWaveform, FlaskConical,
};

interface ImageConfigPanelProps {
  useCase: UseCase;
  interpretationMode: InterpretationMode;
  onUseCaseChange: (val: UseCase) => void;
  onModeChange: (val: InterpretationMode) => void;
  disabled?: boolean;
}

export function ImageConfigPanel({
  useCase,
  interpretationMode,
  onUseCaseChange,
  onModeChange,
  disabled
}: ImageConfigPanelProps) {
  return (
    <div className="atlas-card p-4 animate-slide-up space-y-4" style={{ animationDelay: "50ms" }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Layers className="h-3 w-3" /> Target Context
      </span>

      <div className="space-y-4">
        {/* Use Case */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-atlas-text-dim mb-2 block">
            Media Use Case
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
            {USE_CASES.map((uc) => {
              const Icon = USE_CASE_ICONS[uc.icon] ?? Layers;
              const isActive = useCase === uc.id;
              return (
                <button
                  key={uc.id}
                  onClick={() => onUseCaseChange(uc.id)}
                  disabled={disabled}
                  title={uc.label}
                  className={`
                    flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-colors border
                    ${isActive
                      ? "bg-atlas-accent-muted text-atlas-accent border-atlas-accent"
                      : "bg-atlas-bg text-atlas-text-muted border-atlas-border-subtle hover:border-atlas-border hover:text-atlas-text"}
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-none truncate w-full text-center">{uc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-atlas-border-subtle w-full" />

        {/* Interpretation Mode */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-atlas-text-dim mb-2 block">
            Interpretation Lens
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {INTERPRETATION_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                disabled={disabled}
                className={`
                  flex flex-col items-start p-2 rounded-lg border text-left transition-colors
                  ${interpretationMode === mode.id
                    ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                    : "bg-atlas-bg border-atlas-border-subtle hover:border-atlas-border text-atlas-text"}
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <span className="text-xs font-semibold mb-0.5">{mode.label}</span>
                <span className={`text-[11px] leading-tight ${interpretationMode === mode.id ? "text-atlas-accent/80" : "text-atlas-text-dim"}`}>
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
