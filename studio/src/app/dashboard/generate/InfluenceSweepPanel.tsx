"use client";

import { useState, useCallback } from "react";
import { Zap, Play, Pause, Loader2, ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRESET_LIST,
  INFLUENCE_PRESETS,
  getInfluenceLabel,
  getInfluenceColor,
  getInfluenceBg,
  estimateInfluenceSweepCost,
  type InfluencePresetId,
} from "@/lib/sfx/prompt-influence";

interface SweepResult {
  index: number;
  influence: number;
  status: "completed" | "failed";
  audioUrl?: string;
  generationId?: string;
  characterCost?: number;
  errorMessage?: string;
}

interface InfluenceSweepPanelProps {
  promptText: string;
  duration: number;
  loop: boolean;
  modelId: string;
  outputFormat: string;
  exclusions: string[];
  projectId?: string;
  creditsRemaining: number;
  onCreditsUpdated?: (remaining: number) => void;
}

export function InfluenceSweepPanel({
  promptText,
  duration,
  loop,
  modelId,
  outputFormat,
  exclusions,
  projectId,
  creditsRemaining,
  onCreditsUpdated,
}: InfluenceSweepPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<InfluencePresetId>("round_robin");
  const [customValues, setCustomValues] = useState("0.2, 0.5, 0.8");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SweepResult[]>([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimate = estimateInfluenceSweepCost(
    selectedPreset,
    1,
    selectedPreset === "custom"
      ? customValues.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v) && v >= 0 && v <= 1)
      : undefined
  );

  const canAfford = creditsRemaining >= estimate.totalCredits;

  const runSweep = useCallback(async () => {
    if (!promptText.trim() || running || !canAfford) return;
    setRunning(true);
    setError(null);
    setResults([]);

    try {
      const body: Record<string, unknown> = {
        text: promptText,
        presetId: selectedPreset,
        duration_seconds: duration,
        loop,
        model_id: modelId,
        output_format: outputFormat,
        exclusion_constraints: exclusions,
      };

      if (selectedPreset === "custom") {
        body.customValues = customValues
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !isNaN(v) && v >= 0 && v <= 1);
      }

      if (projectId) body.projectId = projectId;

      const res = await fetch("/api/elevenlabs/influence-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sweep failed");
        return;
      }

      setResults(data.results ?? []);
      if (data.summary?.creditsRemaining != null) {
        onCreditsUpdated?.(data.summary.creditsRemaining);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sweep failed");
    } finally {
      setRunning(false);
    }
  }, [promptText, selectedPreset, customValues, duration, loop, modelId, outputFormat, exclusions, projectId, running, canAfford, onCreditsUpdated]);

  const togglePlay = useCallback((index: number, _audioUrl: string) => {
    const audios = document.querySelectorAll<HTMLAudioElement>(`[data-sweep-audio]`);
    audios.forEach((a) => { a.pause(); a.currentTime = 0; });

    if (playingIndex === index) {
      setPlayingIndex(null);
      return;
    }

    const audio = document.querySelector<HTMLAudioElement>(`[data-sweep-audio="${index}"]`);
    if (audio) {
      void audio.play();
      audio.onended = () => setPlayingIndex(null);
      setPlayingIndex(index);
    }
  }, [playingIndex]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-atlas-border px-4 py-2.5 text-xs text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent w-full justify-center"
      >
        <Zap className="h-3.5 w-3.5" />
        Influence Sweep — Compare same prompt at different influence values
      </button>
    );
  }

  return (
    <div className="atlas-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
          <Zap className="h-4 w-4 text-atlas-accent" />
          Prompt Influence Comparison
        </h3>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-atlas-text-dim hover:text-atlas-text transition-colors"
        >
          Collapse
        </button>
      </div>

      {/* Preset selector */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_LIST.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setSelectedPreset(preset.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
              selectedPreset === preset.id
                ? "bg-atlas-accent text-white border-atlas-accent"
                : "bg-atlas-surface border-atlas-border text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent"
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setSelectedPreset("custom")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
            selectedPreset === "custom"
              ? "bg-atlas-accent text-white border-atlas-accent"
              : "bg-atlas-surface border-atlas-border text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent"
          )}
        >
          Custom
        </button>
      </div>

      {/* Preset description */}
      <div className="text-xs text-atlas-text-dim">
        {selectedPreset === "custom" ? (
          <div className="space-y-2">
            <p>Enter comma-separated values (0–1):</p>
            <input
              value={customValues}
              onChange={(e) => setCustomValues(e.target.value)}
              placeholder="0.2, 0.4, 0.6, 0.8"
              className="rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text w-full font-mono"
            />
          </div>
        ) : (
          <p>
            {INFLUENCE_PRESETS[selectedPreset].description}
            {" · "}
            <span className="text-atlas-text-muted font-mono">
              [{estimate.values.join(", ")}]
            </span>
          </p>
        )}
      </div>

      {/* Cost estimate + run button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-atlas-text-dim">
          <span className="font-medium text-atlas-text">{estimate.generationCount}</span> generations ·{" "}
          <span className={cn("font-medium", canAfford ? "text-atlas-accent" : "text-red-400")}>
            {estimate.totalCredits} credits
          </span>
          {!canAfford && <span className="text-red-400 ml-1">(insufficient)</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={runSweep}
            disabled={running || !promptText.trim() || !canAfford}
            className="flex items-center gap-2 rounded-lg bg-atlas-accent px-4 py-2 text-xs font-medium text-white transition-all hover:bg-atlas-accent-hover disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            {running ? "Running..." : "Run Sweep"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Results comparison grid */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-atlas-text-dim uppercase tracking-wider">Comparison Results</h4>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(results.length, 4)}, 1fr)` }}>
            {results.map((r) => (
              <div
                key={r.index}
                className={cn(
                  "atlas-card p-3 text-center space-y-2",
                  r.status === "failed" && "opacity-60"
                )}
              >
                {/* Influence badge */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-full px-3 py-1 text-xs font-bold tabular-nums"
                    style={{ background: getInfluenceBg(r.influence), color: getInfluenceColor(r.influence) }}
                  >
                    {r.influence.toFixed(2)}
                  </div>
                  <span className="text-xs text-atlas-text-dim">{getInfluenceLabel(r.influence)}</span>
                </div>

                {/* Audio player */}
                {r.status === "completed" && r.audioUrl ? (
                  <>
                    <audio
                      data-sweep-audio={r.index}
                      src={r.audioUrl}
                      preload="none"
                      onPause={() => setPlayingIndex(null)}
                      onEnded={() => setPlayingIndex(null)}
                    />
                    <button
                      onClick={() => togglePlay(r.index, r.audioUrl!)}
                      className={cn(
                        "flex h-10 w-10 mx-auto items-center justify-center rounded-full transition-all",
                        playingIndex === r.index
                          ? "bg-atlas-accent text-white scale-110"
                          : "bg-atlas-surface-hover text-atlas-text hover:bg-atlas-accent/20"
                      )}
                    >
                      {playingIndex === r.index ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </button>
                    {r.characterCost != null && (
                      <div className="text-xs text-atlas-text-dim tabular-nums">
                        {r.characterCost} chars
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-red-400 truncate">
                    {r.errorMessage ?? "Failed"}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Batch button — send to Variation Lab */}
          <div className="flex justify-center pt-2">
            <button
              className="flex items-center gap-2 rounded-lg border border-atlas-border px-4 py-2 text-xs text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent"
              onClick={() => {
                // Navigate to Variation Lab with the prompt pre-filled
                const params = new URLSearchParams({
                  text: promptText,
                  mode: "influence_sweep",
                  preset: selectedPreset,
                });
                window.location.href = `/dashboard/variation-lab?${params}`;
              }}
            >
              <Layers className="h-3.5 w-3.5" />
              Send to Variation Lab as Batch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
