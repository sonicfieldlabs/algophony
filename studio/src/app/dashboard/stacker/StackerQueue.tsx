"use client";

import { ListOrdered, Play, Pause, X, RotateCw, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StackerLayer } from "@/lib/sfx/stacker-taxonomy";
import { getLayerTypeDef, getFrequencyRoleDef } from "@/lib/sfx/stacker-taxonomy";

type QueueStatus = "idle" | "running" | "paused" | "completed";

interface StackerQueueProps {
  layers: StackerLayer[];
  queueStatus: QueueStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetryFailed: () => void;
}

const STATUS_ICON: Record<StackerLayer["status"], React.ElementType> = {
  draft: Clock,
  queued: Clock,
  generating: Loader2,
  generated: CheckCircle2,
  failed: AlertCircle,
};

export function StackerQueue({ layers, queueStatus, onStart, onPause, onResume, onCancel, onRetryFailed }: StackerQueueProps) {
  if (layers.length === 0) return null;

  const generated = layers.filter((l) => l.status === "generated").length;
  const failed = layers.filter((l) => l.status === "failed").length;
  const eligible = layers.filter((l) => !l.muted && l.status !== "generated").length;
  const progress = layers.length > 0 ? Math.round((generated / layers.length) * 100) : 0;

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <ListOrdered className="h-3 w-3" />
          Generation Queue
        </span>
        <span className="text-xs text-atlas-text-dim tabular-nums">
          {generated}/{layers.length} · {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-atlas-surface-hover overflow-hidden">
        <div className="h-full rounded-full bg-atlas-accent transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="flex gap-1.5">
        {queueStatus === "idle" || queueStatus === "completed" ? (
          <button
            onClick={onStart}
            disabled={eligible === 0}
            className="flex items-center gap-1 rounded-xl bg-atlas-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-40"
          >
            <Play className="h-2.5 w-2.5" />
            Generate {eligible} Layers · {eligible}cr
          </button>
        ) : queueStatus === "running" ? (
          <button onClick={onPause} className="flex items-center gap-1 rounded-xl border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors">
            <Pause className="h-2.5 w-2.5" /> Pause
          </button>
        ) : (
          <button onClick={onResume} className="flex items-center gap-1 rounded-xl border border-atlas-accent px-3 py-1.5 text-xs text-atlas-accent hover:bg-atlas-accent-muted transition-colors">
            <Play className="h-2.5 w-2.5" /> Resume
          </button>
        )}
        {(queueStatus === "running" || queueStatus === "paused") && (
          <button onClick={onCancel} className="flex items-center gap-1 rounded-xl border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-dim hover:text-atlas-danger transition-colors">
            <X className="h-2.5 w-2.5" /> Cancel
          </button>
        )}
        {failed > 0 && (
          <button onClick={onRetryFailed} className="flex items-center gap-1 rounded-xl border border-amber-400/40 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-400/10 transition-colors">
            <RotateCw className="h-2.5 w-2.5" /> Retry {failed}
          </button>
        )}
      </div>

      {/* Layer queue list */}
      <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
        {layers.map((layer) => {
          const typeDef = getLayerTypeDef(layer.layerType);
          const freqDef = getFrequencyRoleDef(layer.frequencyRole);
          const Icon = STATUS_ICON[layer.status];

          return (
            <div key={layer.id} className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
              layer.muted ? "opacity-30" : "hover:bg-atlas-surface"
            )}>
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(${typeDef.hue}, 70%, 50%)` }}
              />
              <span className="text-xs font-medium text-atlas-text w-12 shrink-0">{typeDef.shortLabel}</span>
              <span className="text-[7px] text-atlas-text-dim w-14 shrink-0">{freqDef.label}</span>
              <span className="text-[8px] text-atlas-text-muted flex-1 truncate font-mono">
                {layer.promptText.slice(0, 60) || "—"}
              </span>
              <Icon className={cn("h-3 w-3 shrink-0",
                layer.status === "generated" ? "text-atlas-success" :
                layer.status === "failed" ? "text-atlas-danger" :
                layer.status === "generating" ? "text-atlas-accent animate-spin" :
                "text-atlas-text-dim"
              )} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
