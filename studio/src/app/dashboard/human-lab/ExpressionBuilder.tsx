"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpressionSettings, HumanCategory } from "@/lib/sfx/human-taxonomy";
import {
  EMOTIONS, INTENSITIES, REALISM_STYLES, PAIN_LEVELS, DISTANCES,
  getCategoryDef,
} from "@/lib/sfx/human-taxonomy";

interface ExpressionBuilderProps {
  category: HumanCategory;
  expression: ExpressionSettings;
  onChange: (e: ExpressionSettings) => void;
}

function ChipRow<T extends string>({ label, values, selected, onSelect }: {
  label: string; values: readonly T[]; selected: T; onSelect: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-atlas-text-dim">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button key={v} onClick={() => onSelect(v)} className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all capitalize",
            selected === v
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
          )}>
            {v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExpressionBuilder({ category, expression, onChange }: ExpressionBuilderProps) {
  const update = (patch: Partial<ExpressionSettings>) => onChange({ ...expression, ...patch });
  const catDef = getCategoryDef(category);
  const showPain = ["combat", "reactions", "efforts"].includes(category);

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Zap className="h-3 w-3" />
        Expression
      </span>

      {/* Action selector from category */}
      <div className="space-y-1">
        <span className="text-xs text-atlas-text-dim">Action</span>
        <div className="flex flex-wrap gap-1">
          {catDef.actions.map((a) => (
            <button key={a} onClick={() => update({ action: a })} className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all capitalize",
              expression.action === a
                ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
            )}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <ChipRow label="Emotion" values={EMOTIONS} selected={expression.emotion} onSelect={(v) => update({ emotion: v })} />
      <ChipRow label="Intensity" values={INTENSITIES} selected={expression.intensity} onSelect={(v) => update({ intensity: v })} />
      <ChipRow label="Realism" values={REALISM_STYLES} selected={expression.realism} onSelect={(v) => update({ realism: v })} />

      {showPain && (
        <ChipRow label="Pain Level" values={PAIN_LEVELS} selected={expression.painLevel} onSelect={(v) => update({ painLevel: v })} />
      )}

      <ChipRow label="Distance" values={DISTANCES} selected={expression.distance} onSelect={(v) => update({ distance: v })} />

      {/* Duration */}
      <div className="space-y-1">
        <span className="text-xs text-atlas-text-dim">Duration (s)</span>
        <input
          type="number" value={expression.durationSeconds}
          onChange={(e) => update({ durationSeconds: Math.max(0.5, Math.min(30, parseFloat(e.target.value) || 2)) })}
          min={0.5} max={30} step={0.5}
          className="w-24 rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
        />
      </div>
    </div>
  );
}
