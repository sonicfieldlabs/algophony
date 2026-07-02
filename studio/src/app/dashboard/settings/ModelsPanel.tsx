"use client";

import { useEffect, useState, useCallback } from "react";
import { Cpu, RefreshCw, Check, X, Loader2, AlertTriangle, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelData {
  modelId: string;
  name: string;
  description: string;
  canDoTextToSpeech: boolean;
  canDoVoiceConversion: boolean;
  canDoSoundEffects: boolean;
  canBeFinetuned: boolean;
  canUseStyle: boolean;
  canUseSpeakerBoost: boolean;
  tokenCostFactor: number | null;
  maxInputLength: number | null;
  concurrencyLimit: number | null;
  languageCount: number;
}

function CapBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
      enabled
        ? "bg-green-500/10 text-green-500"
        : "bg-atlas-surface-hover text-atlas-text-dim"
    )}>
      {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-40" />}
      {label}
    </div>
  );
}

export function ModelsPanel() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Failed to load models");
      const data = await res.json();
      setModels(data.models ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      setModels(data.models ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchModels);
  }, [fetchModels]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
          <Cpu className="h-4 w-4 text-atlas-accent" /> Model Compatibility Center
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          {refreshing ? "Syncing..." : "Sync Models"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-atlas-text-dim" />
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <div key={model.modelId} className="atlas-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-atlas-text">{model.name}</h3>
                  <p className="text-xs text-atlas-text-dim font-mono mt-0.5">{model.modelId}</p>
                  {model.description && (
                    <p className="text-xs text-atlas-text-muted mt-1.5">{model.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {model.tokenCostFactor !== null && (
                    <div className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      model.tokenCostFactor <= 0.5
                        ? "bg-green-500/10 text-green-400"
                        : model.tokenCostFactor <= 1
                        ? "bg-atlas-accent-muted text-atlas-accent"
                        : "bg-amber-500/10 text-amber-400"
                    )}>
                      {model.tokenCostFactor}x cost
                    </div>
                  )}
                  {model.languageCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-atlas-text-dim">
                      <Globe className="h-3 w-3" />
                      {model.languageCount} langs
                    </div>
                  )}
                </div>
              </div>

              {/* Capabilities grid */}
              <div className="flex flex-wrap gap-1.5">
                <CapBadge enabled={model.canDoSoundEffects} label="Sound Effects" />
                <CapBadge enabled={model.canDoTextToSpeech} label="Text-to-Speech" />
                <CapBadge enabled={model.canDoVoiceConversion} label="Voice Conversion" />
                <CapBadge enabled={model.canUseStyle} label="Style Control" />
                <CapBadge enabled={model.canUseSpeakerBoost} label="Speaker Boost" />
                <CapBadge enabled={model.canBeFinetuned} label="Fine-tunable" />
              </div>

              {/* Limits */}
              {(model.maxInputLength || model.concurrencyLimit) && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-atlas-border-subtle">
                  {model.maxInputLength && (
                    <div className="text-xs text-atlas-text-dim">
                      Max input: <span className="text-atlas-text font-medium">{model.maxInputLength.toLocaleString()} chars</span>
                    </div>
                  )}
                  {model.concurrencyLimit && (
                    <div className="text-xs text-atlas-text-dim">
                      Concurrency: <span className="text-atlas-text font-medium">{model.concurrencyLimit}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
