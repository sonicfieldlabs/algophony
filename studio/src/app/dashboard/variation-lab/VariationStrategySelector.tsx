"use client";

import { Fingerprint, Layers, TrendingUp, Move3d, Palette, LayoutGrid, Map, Grid3x3, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariationStrategy } from "@/lib/sfx/variation-taxonomy";
import { STRATEGY_DEFS } from "@/lib/sfx/variation-taxonomy";

const STRATEGY_ICONS: Record<string, React.ElementType> = {
  Fingerprint, Layers, TrendingUp, Move3d, Palette, LayoutGrid, Map, Grid3x3, RefreshCw,
};

interface VariationStrategySelectorProps {
  strategy: VariationStrategy;
  onChange: (strategy: VariationStrategy) => void;
}

export function VariationStrategySelector({ strategy, onChange }: VariationStrategySelectorProps) {
  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Grid3x3 className="h-3 w-3" />
        Variation Strategy
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        {STRATEGY_DEFS.map((def) => {
          const Icon = STRATEGY_ICONS[def.icon] ?? Fingerprint;
          const isActive = strategy === def.id;

          return (
            <button
              key={def.id}
              onClick={() => onChange(def.id)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                isActive
                  ? "bg-atlas-accent-muted border-atlas-accent"
                  : "border-atlas-border-subtle hover:border-atlas-border bg-atlas-bg"
              )}
            >
              <div className="flex items-center gap-1.5 w-full">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg shrink-0",
                  isActive ? "bg-atlas-accent text-white" : "bg-atlas-surface-hover text-atlas-text-dim"
                )}>
                  <Icon className="h-3 w-3" />
                </div>
                <span className={cn(
                  "text-xs font-semibold",
                  isActive ? "text-atlas-accent" : "text-atlas-text"
                )}>
                  {def.label}
                </span>
              </div>
              <p className="text-[8px] text-atlas-text-dim leading-relaxed line-clamp-2">
                {def.description}
              </p>
              <div className="flex flex-wrap gap-0.5 mt-auto">
                {def.bestFor.slice(0, 3).map((use) => (
                  <span key={use} className="rounded-md bg-atlas-surface-hover px-1 py-0.5 text-[7px] text-atlas-text-dim">
                    {use}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
