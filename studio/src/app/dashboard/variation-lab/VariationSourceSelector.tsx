"use client";

import { useState } from "react";
import { FileText, Music, Grid3x3, Bug, Layers, Upload, SquareStack, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceType, VariationSource } from "@/lib/sfx/variation-taxonomy";
import { SOURCE_TYPE_LABELS } from "@/lib/sfx/variation-taxonomy";

const SOURCE_ICONS: Partial<Record<SourceType, React.ElementType>> = {
  prompt_card: FileText,
  generated_sound: Music,
  manual_prompt: Mic,
  ui_sound_set: Grid3x3,
  creature_layer: Bug,
  project_folder: Layers,
  imported_row: Upload,
  multi_card: SquareStack,
};

const QUICK_SOURCES: SourceType[] = [
  "manual_prompt", "prompt_card", "generated_sound",
  "ui_sound_set", "creature_layer",
];

interface VariationSourceSelectorProps {
  source: VariationSource;
  onSourceChange: (source: VariationSource) => void;
}

export function VariationSourceSelector({ source, onSourceChange }: VariationSourceSelectorProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const visibleSources = showAllSources ? Object.keys(SOURCE_TYPE_LABELS) as SourceType[] : QUICK_SOURCES;

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Source
      </span>

      {/* Source type tabs */}
      <div className="flex flex-wrap gap-1.5">
        {visibleSources.map((st) => {
          const Icon = SOURCE_ICONS[st] ?? FileText;
          return (
            <button
              key={st}
              onClick={() => onSourceChange({ ...source, type: st })}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all border",
                source.type === st
                  ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border hover:text-atlas-text-muted"
              )}
            >
              <Icon className="h-3 w-3" />
              {SOURCE_TYPE_LABELS[st]}
            </button>
          );
        })}
        {!showAllSources && (
          <button
            onClick={() => setShowAllSources(true)}
            className="rounded-xl px-3 py-1.5 text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors border border-dashed border-atlas-border-subtle"
          >
            More…
          </button>
        )}
      </div>

      {/* Prompt input */}
      <div className="space-y-2">
        {source.type === "manual_prompt" && (
          <textarea
            value={source.promptText}
            onChange={(e) => onSourceChange({ ...source, promptText: e.target.value })}
            placeholder="Short wet boot footstep on concrete, close mic, realistic Foley…"
            rows={3}
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none font-mono"
          />
        )}
        {source.type === "prompt_card" && (
          <input
            value={source.promptCardId ?? ""}
            onChange={(e) => onSourceChange({ ...source, promptCardId: e.target.value, promptText: source.promptText })}
            placeholder="Paste prompt card ID or search…"
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none font-mono"
          />
        )}
        {source.type === "generated_sound" && (
          <input
            value={source.generatedSoundId ?? ""}
            onChange={(e) => onSourceChange({ ...source, generatedSoundId: e.target.value })}
            placeholder="Paste generated sound ID…"
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none font-mono"
          />
        )}

        {/* Always show prompt text editor for non-manual sources */}
        {source.type !== "manual_prompt" && (
          <textarea
            value={source.promptText}
            onChange={(e) => onSourceChange({ ...source, promptText: e.target.value })}
            placeholder="Source prompt text (will be used as variation base)…"
            rows={2}
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none font-mono"
          />
        )}
      </div>

      {/* Prompt char count */}
      {source.promptText && (
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-xs tabular-nums",
            source.promptText.length > 450 ? "text-atlas-danger" : "text-atlas-text-dim"
          )}>
            {source.promptText.length} / 450 chars
          </span>
          {source.promptText.length > 0 && (
            <span className="text-xs text-atlas-success">Source ready</span>
          )}
        </div>
      )}
    </div>
  );
}
