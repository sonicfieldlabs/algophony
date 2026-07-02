"use client";

import { ListOrdered, Play, Pause, RotateCw, X, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariationJob, JobStatus } from "@/lib/sfx/variation-taxonomy";

interface VariationQueueTableProps {
  jobs: VariationJob[];
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetryFailed: () => void;
}

const STATUS_STYLES: Record<JobStatus, { color: string; icon: React.ElementType; label: string }> = {
  queued: { color: "text-atlas-text-dim", icon: Clock, label: "Queued" },
  running: { color: "text-atlas-accent", icon: Loader2, label: "Running" },
  generated: { color: "text-atlas-success", icon: CheckCircle2, label: "Done" },
  failed: { color: "text-atlas-danger", icon: AlertCircle, label: "Failed" },
  cancelled: { color: "text-atlas-text-dim", icon: X, label: "Cancelled" },
  retrying: { color: "text-amber-400", icon: RotateCw, label: "Retrying" },
  skipped: { color: "text-atlas-text-dim/50", icon: X, label: "Skipped" },
};

export function VariationQueueTable({ jobs, isRunning, onPause, onResume, onCancel, onRetryFailed }: VariationQueueTableProps) {
  if (jobs.length === 0) return null;

  const completed = jobs.filter((j) => j.status === "generated").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const progress = jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0;

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <ListOrdered className="h-3 w-3" />
          Generation Queue
        </span>
        <span className="text-xs text-atlas-text-dim tabular-nums">
          {completed}/{jobs.length} · {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-atlas-surface-hover overflow-hidden">
        <div
          className="h-full rounded-full bg-atlas-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-1.5">
        {isRunning ? (
          <button onClick={onPause} className="flex items-center gap-1 rounded-lg border border-atlas-border px-2.5 py-1 text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors">
            <Pause className="h-2.5 w-2.5" /> Pause
          </button>
        ) : (
          <button onClick={onResume} className="flex items-center gap-1 rounded-lg border border-atlas-accent px-2.5 py-1 text-xs text-atlas-accent hover:bg-atlas-accent-muted transition-colors">
            <Play className="h-2.5 w-2.5" /> Resume
          </button>
        )}
        <button onClick={onCancel} className="flex items-center gap-1 rounded-lg border border-atlas-border px-2.5 py-1 text-xs text-atlas-text-dim hover:text-atlas-danger transition-colors">
          <X className="h-2.5 w-2.5" /> Cancel
        </button>
        {failed > 0 && (
          <button onClick={onRetryFailed} className="flex items-center gap-1 rounded-lg border border-amber-400/40 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-400/10 transition-colors">
            <RotateCw className="h-2.5 w-2.5" /> Retry {failed}
          </button>
        )}
      </div>

      {/* Job list */}
      <div className="max-h-64 overflow-y-auto space-y-0.5 scrollbar-thin">
        {jobs.map((job) => {
          const style = STATUS_STYLES[job.status];
          const Icon = style.icon;
          const isSpinning = job.status === "running" || job.status === "retrying";

          return (
            <div key={job.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-atlas-surface transition-colors">
              <span className="text-[8px] text-atlas-text-dim tabular-nums w-5 text-right shrink-0">
                #{job.jobIndex + 1}
              </span>
              <Icon className={cn("h-3 w-3 shrink-0", style.color, isSpinning && "animate-spin")} />
              <span className="text-xs text-atlas-text-muted flex-1 truncate font-mono">
                {job.generatedPrompt.slice(0, 80)}…
              </span>
              <span className={cn("text-[8px] shrink-0", style.color)}>{style.label}</span>
              {job.errorMessage && (
                <span className="text-[7px] text-atlas-danger truncate max-w-[120px]">{job.errorMessage}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
