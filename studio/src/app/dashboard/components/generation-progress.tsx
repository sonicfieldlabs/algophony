/**
 * Algophony Studio — Generation Progress Indicator
 *
 * §5.12: Shows ETA, elapsed time, and generation status with a cancel option.
 * Uses a rolling p50 estimate from localStorage history.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, X, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ETA_STORAGE_KEY = "algophony-studio-gen-times";
const MAX_HISTORY = 20;

/** Get p50 generation time from recent history */
function getEstimatedTime(): number {
  try {
    const raw = localStorage.getItem(ETA_STORAGE_KEY);
    if (!raw) return 5000; // default 5s
    const times: number[] = JSON.parse(raw);
    if (!times.length) return 5000;
    const sorted = [...times].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  } catch {
    return 5000;
  }
}

/** Record a generation time for future estimates */
export function recordGenerationTime(ms: number) {
  try {
    const raw = localStorage.getItem(ETA_STORAGE_KEY);
    const times: number[] = raw ? JSON.parse(raw) : [];
    times.push(ms);
    if (times.length > MAX_HISTORY) times.shift();
    localStorage.setItem(ETA_STORAGE_KEY, JSON.stringify(times));
  } catch { /* ignore */ }
}

export interface GenerationProgressProps {
  /** Is a generation currently in progress? */
  active: boolean;
  /** Number of generations in queue */
  queueSize?: number;
  /** Called when cancel is clicked */
  onCancel?: () => void;
  /** CSS class */
  className?: string;
}

export function GenerationProgress({
  active,
  queueSize = 0,
  onCancel,
  className,
}: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [eta] = useState(() => getEstimatedTime());
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    startRef.current = Date.now();
    const resetTimer = setTimeout(() => setElapsed(0), 0);
    const interval = setInterval(() => {
      setElapsed(Date.now() - (startRef.current ?? Date.now()));
    }, 100);
    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [active]);

  if (!active) return null;

  const remaining = Math.max(0, eta - elapsed);
  const pct = Math.min(100, (elapsed / eta) * 100);

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border border-atlas-accent/20 bg-atlas-accent/5 px-4 py-2.5",
      className
    )}>
      <Loader2 className="h-4 w-4 text-atlas-accent animate-spin shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-atlas-text font-medium">
            Generating{queueSize > 1 ? ` (${queueSize} in queue)` : ""}…
          </span>
          <span className="text-atlas-text-dim tabular-nums flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {remaining > 1000
              ? `~${Math.ceil(remaining / 1000)}s remaining`
              : "Almost done"
            }
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-atlas-surface-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-atlas-accent transition-all duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1 text-xs text-atlas-text-dim">
          <span className="tabular-nums">{(elapsed / 1000).toFixed(1)}s elapsed</span>
          <span className="flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            p50: {(eta / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="shrink-0 rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
