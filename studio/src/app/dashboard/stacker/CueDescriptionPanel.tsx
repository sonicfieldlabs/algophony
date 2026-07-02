"use client";

import { FileText, Clapperboard, Gamepad2, Film, Smartphone, Radio, Zap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CueContext } from "@/lib/sfx/stacker-taxonomy";
import { CUE_CONTEXT_LABELS, CUE_CONTEXTS } from "@/lib/sfx/stacker-taxonomy";

const CONTEXT_ICONS: Partial<Record<CueContext, React.ElementType>> = {
  film_scene: Clapperboard,
  game_event: Gamepad2,
  trailer_moment: Film,
  ui_interaction: Smartphone,
  podcast_transition: Radio,
  installation_trigger: Zap,
  social_beat: Zap,
  custom: Settings,
};

interface CueDescriptionPanelProps {
  description: string;
  context: CueContext;
  cueName: string;
  onDescriptionChange: (description: string) => void;
  onContextChange: (context: CueContext) => void;
  onCueNameChange: (name: string) => void;
  onDecompose: () => void;
  hasLayers: boolean;
}

export function CueDescriptionPanel({
  description, context, cueName,
  onDescriptionChange, onContextChange, onCueNameChange,
  onDecompose, hasLayers,
}: CueDescriptionPanelProps) {
  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Cue Description
      </span>

      {/* Cue name */}
      <input
        value={cueName}
        onChange={(e) => onCueNameChange(e.target.value)}
        placeholder="Cue name…"
        className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-sm font-medium text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
      />

      {/* Scene description */}
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="A character opens a heavy metal hatch in an abandoned underground lab. Dust releases, hinges creak, low resonance echoes through the space…"
        rows={4}
        className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none font-mono leading-relaxed"
      />

      {/* Context selector */}
      <div className="space-y-1.5">
        <span className="text-xs text-atlas-text-dim">Context</span>
        <div className="flex flex-wrap gap-1">
          {CUE_CONTEXTS.map((c) => {
            const Icon = CONTEXT_ICONS[c] ?? Settings;
            return (
              <button
                key={c}
                onClick={() => onContextChange(c)}
                className={cn(
                  "flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all border",
                  context === c
                    ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                    : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border hover:text-atlas-text-muted"
                )}
              >
                <Icon className="h-2.5 w-2.5" />
                {CUE_CONTEXT_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Decompose button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDecompose}
          disabled={!description.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-atlas-accent px-4 py-2 text-xs font-semibold text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-40"
        >
          <Zap className="h-3 w-3" />
          {hasLayers ? "Re-Decompose" : "Decompose into Layers"}
        </button>

        {description.trim() && (
          <span className={cn(
            "text-xs tabular-nums",
            description.length > 450 ? "text-atlas-danger" : "text-atlas-text-dim"
          )}>
            {description.length} chars
          </span>
        )}
      </div>
    </div>
  );
}
