"use client";

import { useRef, useState, useCallback } from "react";
import { Layers, Zap, Plus, X, Loader2, Play, Pause, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGINE_MODE_DEFS, type EngineMode } from "@/lib/sfx/ui-elements-taxonomy";

export interface HybridLayer {
  id: string;
  engineMode: EngineMode;
  label: string;
  promptText: string;
  audioUrl?: string;
  status: "pending" | "generating" | "done" | "error";
}

const DEFAULT_LAYERS: HybridLayer[] = [
  { id: "layer-1", engineMode: "sound_effects", label: "Click Body", promptText: "", status: "pending" },
  { id: "layer-2", engineMode: "sound_effects", label: "Shimmer / Tail", promptText: "", status: "pending" },
];

const ENGINE_OPTIONS = ENGINE_MODE_DEFS.filter((m) => m.id !== "hybrid");

interface HybridEngineProps {
  onLayersGenerated: (layers: HybridLayer[]) => void;
  baseDuration: number;
}

export function HybridEngine({ onLayersGenerated, baseDuration }: HybridEngineProps) {
  const [layers, setLayers] = useState<HybridLayer[]>(DEFAULT_LAYERS);
  const [expanded, setExpanded] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const addLayer = useCallback(() => {
    if (layers.length >= 4) return;
    setLayers((prev) => [
      ...prev,
      {
        id: `layer-${Date.now()}`,
        engineMode: "sound_effects" as EngineMode,
        label: `Layer ${prev.length + 1}`,
        promptText: "",
        status: "pending" as const,
      },
    ]);
  }, [layers.length]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLayer = useCallback((id: string, updates: Partial<HybridLayer>) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const totalCredits = layers.reduce((sum, l) => {
    const mode = ENGINE_MODE_DEFS.find((m) => m.id === l.engineMode);
    return sum + (mode?.creditCost ?? 1);
  }, 0);

  const generateAll = useCallback(async () => {
    setGenerating(true);
    const results: HybridLayer[] = [...layers];

    for (let i = 0; i < results.length; i++) {
      const layer = results[i];
      if (!layer.promptText.trim()) continue;

      // Update status to generating
      results[i] = { ...layer, status: "generating" };
      setLayers([...results]);

      const modeInfo = ENGINE_MODE_DEFS.find((m) => m.id === layer.engineMode);
      const apiRoute = modeInfo?.apiRoute ?? "/api/elevenlabs/generate-sfx";

      try {
        const body: Record<string, unknown> = {
          text: layer.promptText,
          duration_seconds: baseDuration,
          loop: false,
          prompt_influence: 0.3,
          model_id: "eleven_text_to_sound_v2",
          output_format: "mp3_44100_128",
        };

        const res = await fetch(apiRoute, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          results[i] = { ...results[i], audioUrl: data.audioUrl, status: "done" };
        } else {
          results[i] = { ...results[i], status: "error" };
        }
      } catch {
        results[i] = { ...results[i], status: "error" };
      }

      setLayers([...results]);
    }

    setGenerating(false);
    onLayersGenerated(results);
  }, [layers, baseDuration, onLayersGenerated]);

  const playLayer = (layer: HybridLayer) => {
    if (!layer.audioUrl) return;
    if (playingId === layer.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(layer.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    void audio.play();
    setPlayingId(layer.id);
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          Hybrid Layers
          <span className="rounded-full bg-atlas-surface-hover px-1.5 py-0.5 text-[8px] tabular-nums">
            {layers.length}
          </span>
        </span>
        <ChevronDown className={cn("h-3 w-3 text-atlas-text-dim transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="space-y-2 animate-expand-down">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={cn(
                "rounded-xl border p-3 space-y-2 transition-all",
                layer.status === "done"
                  ? "border-emerald-200 bg-emerald-50/50 [data-theme=dark]:border-emerald-900/30 [data-theme=dark]:bg-emerald-950/10"
                  : layer.status === "error"
                  ? "border-red-200 bg-red-50/50 [data-theme=dark]:border-red-900/30 [data-theme=dark]:bg-red-950/10"
                  : layer.status === "generating"
                  ? "border-atlas-accent/30 bg-atlas-accent-muted/20"
                  : "border-atlas-border-subtle bg-atlas-surface"
              )}
            >
              {/* Layer header */}
              <div className="flex items-center gap-2">
                <input
                  value={layer.label}
                  onChange={(e) => updateLayer(layer.id, { label: e.target.value })}
                  className="flex-1 bg-transparent text-xs font-medium text-atlas-text outline-none placeholder-atlas-text-dim"
                  placeholder="Layer name..."
                />
                <select
                  value={layer.engineMode}
                  onChange={(e) => updateLayer(layer.id, { engineMode: e.target.value as EngineMode })}
                  className="rounded-lg border border-atlas-border bg-atlas-bg px-2 py-0.5 text-xs text-atlas-text"
                >
                  {ENGINE_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.shortLabel} ({m.creditCost}cr)
                    </option>
                  ))}
                </select>
                {layer.status === "done" && layer.audioUrl && (
                  <button
                    onClick={() => playLayer(layer)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-atlas-accent text-white"
                  >
                    {playingId === layer.id ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-0.5" />}
                  </button>
                )}
                {layer.status === "generating" && (
                  <Loader2 className="h-3 w-3 animate-spin text-atlas-accent" />
                )}
                {layers.length > 1 && (
                  <button
                    onClick={() => removeLayer(layer.id)}
                    className="text-atlas-text-dim hover:text-atlas-danger transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Layer prompt */}
              <textarea
                value={layer.promptText}
                onChange={(e) => updateLayer(layer.id, { promptText: e.target.value })}
                rows={2}
                placeholder={`Describe this layer (e.g. "${layer.label.toLowerCase()}")...`}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text font-mono placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none resize-none"
              />
            </div>
          ))}

          {/* Add layer */}
          {layers.length < 4 && (
            <button
              onClick={addLayer}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-atlas-border py-2 text-xs text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Layer
            </button>
          )}

          {/* Generate all */}
          <button
            onClick={generateAll}
            disabled={generating || layers.every((l) => !l.promptText.trim())}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-atlas-accent-hover disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating layers...
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                Generate All · {totalCredits} credits
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
