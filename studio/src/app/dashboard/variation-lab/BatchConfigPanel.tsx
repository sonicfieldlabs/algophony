"use client";

import { Calculator, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BatchMode } from "@/lib/sfx/variation-taxonomy";
import { BATCH_MODES, BATCH_MODE_LABELS } from "@/lib/sfx/variation-taxonomy";
import { estimateVariationCost } from "@/lib/sfx/variation-prompt";

interface BatchConfigPanelProps {
  batchMode: BatchMode;
  batchSize: number;
  generationsPerSource: number;
  creditsRemaining: number;
  onBatchModeChange: (mode: BatchMode) => void;
  onBatchSizeChange: (size: number) => void;
  onGenerationsPerSourceChange: (n: number) => void;
}

const QUICK_SIZES = [4, 8, 16, 24, 32];

export function BatchConfigPanel({
  batchMode,
  batchSize,
  generationsPerSource,
  creditsRemaining,
  onBatchModeChange,
  onBatchSizeChange,
  onGenerationsPerSourceChange,
}: BatchConfigPanelProps) {
  const isCardsOnly = batchMode === "cards_only";
  const { totalGenerations, totalCredits } = estimateVariationCost(batchSize, generationsPerSource, isCardsOnly);
  const canAfford = totalCredits <= creditsRemaining;

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Calculator className="h-3 w-3" />
        Batch Configuration
      </span>

      {/* Batch mode selector */}
      <div className="space-y-1.5">
        <span className="text-xs text-atlas-text-dim">Batch Mode</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {BATCH_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => onBatchModeChange(mode)}
              className={cn(
                "rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all text-left",
                batchMode === mode
                  ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
              )}
            >
              <span className="block">{BATCH_MODE_LABELS[mode].label}</span>
              <span className="text-[7px] opacity-70 block mt-0.5">{BATCH_MODE_LABELS[mode].description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Batch size */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-xs text-atlas-text-dim">Variations per source</span>
          <div className="flex gap-1">
            {QUICK_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => onBatchSizeChange(n)}
                className={cn(
                  "flex-1 rounded-lg py-1 text-xs font-medium transition-all border tabular-nums",
                  batchSize === n
                    ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                    : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={batchSize}
            onChange={(e) => onBatchSizeChange(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            min={1}
            max={100}
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
          />
        </div>

        {batchMode === "m_per_card" && (
          <div className="space-y-1.5">
            <span className="text-xs text-atlas-text-dim">Generations per source</span>
            <input
              type="number"
              value={generationsPerSource}
              onChange={(e) => onGenerationsPerSourceChange(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
              min={1}
              max={32}
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Cost estimate */}
      <div className={cn(
        "rounded-xl border p-3 space-y-1",
        canAfford ? "border-atlas-border-subtle bg-atlas-bg" : "border-atlas-danger/40 bg-atlas-danger/5"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-atlas-text-dim">Estimated Cost</span>
          <span className={cn("text-xs font-semibold tabular-nums", canAfford ? "text-atlas-accent" : "text-atlas-danger")}>
            {totalCredits} credits
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-atlas-text-dim">Total Generations</span>
          <span className="text-xs text-atlas-text tabular-nums">{totalGenerations}</span>
        </div>
        {isCardsOnly && (
          <div className="flex items-center gap-1 mt-1">
            <Zap className="h-2.5 w-2.5 text-atlas-success" />
            <span className="text-[8px] text-atlas-success">Prompt cards only — no credits used</span>
          </div>
        )}
        {!canAfford && (
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="h-2.5 w-2.5 text-atlas-danger" />
            <span className="text-[8px] text-atlas-danger">
              Insufficient credits ({creditsRemaining} available)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px] text-atlas-text-dim">Balance after</span>
          <span className="text-xs text-atlas-text-dim tabular-nums">
            {Math.max(0, creditsRemaining - totalCredits)} credits
          </span>
        </div>
      </div>
    </div>
  );
}
