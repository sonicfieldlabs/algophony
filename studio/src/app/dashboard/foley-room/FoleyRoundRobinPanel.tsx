"use client";

import { useState } from "react";
import { Repeat, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoundRobinConfig, Surface } from "@/lib/sfx/foley-taxonomy";
import {
  SHOE_TYPES, SHOE_TYPE_LABELS, STEP_TYPES, STEP_TYPE_LABELS, SURFACES,
} from "@/lib/sfx/foley-taxonomy";
import type { RoundRobinItem } from "@/lib/sfx/foley-prompt";

interface FoleyRoundRobinPanelProps {
  config: RoundRobinConfig;
  onChange: (c: RoundRobinConfig) => void;
  plan: RoundRobinItem[];
  onGenerate: () => void;
  isGenerating: boolean;
  generatedCount: number;
}

function ChipRow<T extends string>({ label, values, selected, onSelect, labelMap }: {
  label: string; values: readonly T[]; selected: T;
  onSelect: (v: T) => void; labelMap?: Record<T, string>;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-atlas-text-dim uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button key={v} onClick={() => onSelect(v)} className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium border transition-all capitalize",
            selected === v
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
          )}>
            {labelMap?.[v] ?? v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiChipRow<T extends string>({ label, values, selected, onToggle, count }: {
  label: string; values: readonly T[]; selected: T[];
  onToggle: (v: T) => void; count?: number;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-atlas-text-dim uppercase tracking-wide">{label}{count !== undefined ? ` (${count})` : ""}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button key={v} onClick={() => onToggle(v)} className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium border transition-all capitalize",
            selected.includes(v)
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
          )}>
            {v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FoleyRoundRobinPanel({
  config, onChange, plan, onGenerate, isGenerating, generatedCount,
}: FoleyRoundRobinPanelProps) {
  const [showPlan, setShowPlan] = useState(false);
  const update = (patch: Partial<RoundRobinConfig>) => onChange({ ...config, ...patch });
  const totalCount = config.leftCount + config.rightCount;

  const toggleSurface = (s: Surface) => {
    const has = config.surfaces.includes(s);
    const next = has ? config.surfaces.filter((x) => x !== s) : [...config.surfaces, s];
    if (next.length > 0) update({ surfaces: next });
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Repeat className="h-3 w-3" />
        Round-Robin Footsteps
      </span>

      <p className="text-xs text-atlas-text-dim/70">
        Generate L/R footstep sets with subtle variation per take.
      </p>

      {/* Top row: Counts + Shoe + Movement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        {/* Counts */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <span className="text-xs font-medium text-atlas-text-dim uppercase tracking-wide">Left Steps</span>
            <input
              type="number" value={config.leftCount}
              onChange={(e) => update({ leftCount: Math.max(1, Math.min(16, parseInt(e.target.value) || 4)) })}
              min={1} max={16}
              className="w-full rounded-md border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs font-medium text-atlas-text-dim uppercase tracking-wide">Right Steps</span>
            <input
              type="number" value={config.rightCount}
              onChange={(e) => update({ rightCount: Math.max(1, Math.min(16, parseInt(e.target.value) || 4)) })}
              min={1} max={16}
              className="w-full rounded-md border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
            />
          </div>
        </div>

        <ChipRow label="Variation" values={["subtle", "moderate", "strong"] as const} selected={config.variationStrength} onSelect={(v) => update({ variationStrength: v })} />

        <ChipRow label="Shoe" values={SHOE_TYPES} selected={config.shoeType} onSelect={(v) => update({ shoeType: v })} labelMap={SHOE_TYPE_LABELS} />

        <ChipRow label="Movement" values={STEP_TYPES.slice(0, 6)} selected={config.movementType} onSelect={(v) => update({ movementType: v })} labelMap={STEP_TYPE_LABELS} />
      </div>

      {/* Surfaces multi-select */}
      <MultiChipRow
        label="Surfaces"
        values={SURFACES}
        selected={config.surfaces}
        onToggle={toggleSurface}
        count={config.surfaces.length}
      />

      {/* Plan preview */}
      <button onClick={() => setShowPlan(!showPlan)} className="flex w-full items-center justify-between text-xs text-atlas-text-dim hover:text-atlas-text transition-colors">
        <span>Preview Plan ({totalCount * config.surfaces.length} sounds)</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showPlan && "rotate-180")} />
      </button>

      {showPlan && plan.length > 0 && (
        <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-0.5 rounded-xl border border-atlas-border-subtle bg-atlas-bg p-2">
          {plan.map((item) => (
            <div key={item.index} className="flex items-center gap-2 text-xs font-mono text-atlas-text-dim">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.side === "left" ? "bg-blue-400" : "bg-pink-400")} />
              <span className="text-atlas-text">{item.filename}</span>
              <span className="flex-1 truncate opacity-50">{item.prompt.slice(0, 60)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Generate */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-xs font-semibold text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-50"
      >
        {isGenerating ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating {generatedCount}/{totalCount * config.surfaces.length}…</>
        ) : (
          <><Repeat className="h-3.5 w-3.5" /> Generate Round-Robin · {totalCount * config.surfaces.length}cr</>
        )}
      </button>
    </div>
  );
}
