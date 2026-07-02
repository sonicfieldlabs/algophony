"use client";

import { AudioWaveform, MessageSquare, MessagesSquare, Mic2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EngineMode, HumanCategory } from "@/lib/sfx/human-taxonomy";
import { ENGINE_MODE_DEFS, getCategoryDef } from "@/lib/sfx/human-taxonomy";

const ICONS: Record<string, React.ElementType> = {
  AudioWaveform, MessageSquare, MessagesSquare, Mic2, Layers,
};

interface EngineModePickerProps {
  selected: EngineMode;
  category: HumanCategory;
  onSelect: (m: EngineMode) => void;
}

export function EngineModePicker({ selected, category, onSelect }: EngineModePickerProps) {
  const catDef = getCategoryDef(category);
  const selectedDef = ENGINE_MODE_DEFS.find((m) => m.id === selected);

  return (
    // Inline segmented control — icons only with tooltips, label/description
    // for the active mode shown beside it so the page no longer needs a tall
    // 5-card panel for what is effectively a toggle.
    <div className="flex items-center gap-3 rounded-xl border border-atlas-border-subtle bg-atlas-surface p-2 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1 px-1">
        <AudioWaveform className="h-3 w-3" />
        Engine
      </span>
      <div className="flex rounded-lg border border-atlas-border overflow-hidden">
        {ENGINE_MODE_DEFS.map((mode, i) => {
          const isActive = selected === mode.id;
          const Icon = ICONS[mode.icon] ?? AudioWaveform;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              title={`${mode.label} — ${mode.description}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                i > 0 && "border-l border-atlas-border",
                isActive
                  ? "bg-atlas-accent text-white"
                  : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </div>
      {selectedDef && (
        <span className="text-[11px] text-atlas-text-dim truncate flex-1 min-w-0">{selectedDef.description}</span>
      )}
      <span className="text-[10px] text-atlas-text-dim/60 shrink-0">
        rec: <span className="text-atlas-accent font-medium capitalize">{catDef.defaultEngine}</span>
      </span>
    </div>
  );
}
