"use client";

import { useState } from "react";
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, Plus, Copy,
  Zap, Circle, Fingerprint, Wind, Box, MoveRight, Target,
  Sparkles, Activity, Mic, Cog, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StackerLayer, StackerLayerType } from "@/lib/sfx/stacker-taxonomy";
import {
  STACKER_LAYER_TYPES, getLayerTypeDef,
  FREQUENCY_ROLES, getFrequencyRoleDef,
  MAX_LAYERS, createDefaultLayer,
} from "@/lib/sfx/stacker-taxonomy";

const LAYER_ICONS: Record<string, React.ElementType> = {
  Zap, Circle, Fingerprint, Wind, Box, MoveRight,
  Target, Sparkles, Activity, Mic, Cog, Leaf,
};

interface LayerStackEditorProps {
  layers: StackerLayer[];
  onChange: (layers: StackerLayer[]) => void;
}

export function LayerStackEditor({ layers, onChange }: LayerStackEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateLayer = (id: string, patch: Partial<StackerLayer>) => {
    onChange(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLayer = (id: string) => {
    onChange(layers.filter((l) => l.id !== id).map((l, i) => ({ ...l, priority: i })));
  };

  const addLayer = (type: StackerLayerType = "body") => {
    if (layers.length >= MAX_LAYERS) return;
    onChange([...layers, createDefaultLayer(type, layers.length)]);
  };

  const duplicateLayer = (id: string) => {
    if (layers.length >= MAX_LAYERS) return;
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const dup: StackerLayer = {
      ...src,
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      priority: layers.length,
      status: "draft",
      audioUrl: undefined,
      generationId: undefined,
      sourceKind: undefined,
      sourceAssetId: undefined,
      sourceFileName: undefined,
      sourcePath: undefined,
      importedFrom: undefined,
      importedModule: undefined,
      metadata: undefined,
    };
    onChange([...layers, dup]);
  };

  const moveLayer = (id: string, direction: -1 | 1) => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= layers.length) return;
    const reordered = [...layers];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    onChange(reordered.map((l, i) => ({ ...l, priority: i })));
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Layer Stack
        </span>
        <span className="text-xs text-atlas-accent tabular-nums">
          {layers.length}/{MAX_LAYERS} layers
        </span>
      </div>

      {/* Layers */}
      <div className="space-y-1.5">
        {layers.map((layer, index) => {
          const typeDef = getLayerTypeDef(layer.layerType);
          const freqDef = getFrequencyRoleDef(layer.frequencyRole);
          const Icon = LAYER_ICONS[typeDef.icon] ?? Circle;
          const isExpanded = expandedId === layer.id;

          return (
            <div
              key={layer.id}
              className={cn(
                "rounded-xl border transition-all",
                layer.muted ? "opacity-50 border-atlas-border-subtle" :
                layer.status === "generated" ? "border-atlas-success/30 bg-atlas-success/5" :
                layer.status === "failed" ? "border-atlas-danger/30 bg-atlas-danger/5" :
                "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
              )}
            >
              {/* Compact row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <GripVertical className="h-3 w-3 text-atlas-text-dim/40 shrink-0 cursor-grab" />

                {/* Layer type badge */}
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0"
                  style={{ backgroundColor: `hsl(${typeDef.hue}, 60%, 90%)` }}
                >
                  <Icon className="h-3 w-3" style={{ color: `hsl(${typeDef.hue}, 70%, 40%)` }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-atlas-text">{typeDef.label}</span>
                    <span
                      className="rounded px-1 py-0.5 text-[7px] font-medium"
                      style={{
                        backgroundColor: `hsl(${freqDef.hue}, 50%, 92%)`,
                        color: `hsl(${freqDef.hue}, 60%, 35%)`,
                      }}
                    >
                      {freqDef.label} · {freqDef.range}
                    </span>
                    {layer.importedModule && (
                      <span className="rounded px-1 py-0.5 text-[7px] font-medium bg-atlas-accent-muted/30 text-atlas-accent">
                        from {layer.importedModule}
                      </span>
                    )}
                    {layer.sourceKind && (
                      <span className="rounded px-1 py-0.5 text-[7px] font-medium bg-atlas-surface text-atlas-text-dim">
                        {layer.sourceKind}
                      </span>
                    )}
                  </div>
                  <p className="text-[8px] text-atlas-text-dim truncate mt-0.5 font-mono">
                    {layer.promptText || "No prompt — will use cue description"}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-xs text-atlas-text-dim tabular-nums shrink-0">{layer.durationSeconds}s</span>

                {/* Reorder */}
                <div className="flex flex-col shrink-0">
                  <button onClick={() => moveLayer(layer.id, -1)} disabled={index === 0} className="text-atlas-text-dim hover:text-atlas-accent disabled:opacity-20">
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                  <button onClick={() => moveLayer(layer.id, 1)} disabled={index === layers.length - 1} className="text-atlas-text-dim hover:text-atlas-accent disabled:opacity-20">
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </div>

                {/* Expand toggle */}
                <button onClick={() => setExpandedId(isExpanded ? null : layer.id)} className="text-atlas-text-dim hover:text-atlas-accent shrink-0">
                  <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                </button>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-atlas-border-subtle animate-expand-down">
                  {/* Layer type selector */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-atlas-text-dim">Layer Type</span>
                    <div className="flex flex-wrap gap-1">
                      {STACKER_LAYER_TYPES.map((t) => {
                        const d = getLayerTypeDef(t);
                        return (
                          <button
                            key={t}
                            onClick={() => updateLayer(layer.id, { layerType: t })}
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[8px] font-medium border transition-all",
                              layer.layerType === t
                                ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                                : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
                            )}
                          >
                            {d.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Frequency role selector */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-atlas-text-dim">Frequency Role</span>
                    <div className="flex flex-wrap gap-1">
                      {FREQUENCY_ROLES.map((r) => {
                        const d = getFrequencyRoleDef(r);
                        return (
                          <button
                            key={r}
                            onClick={() => updateLayer(layer.id, { frequencyRole: r })}
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[8px] font-medium border transition-all",
                              layer.frequencyRole === r
                                ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                                : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prompt */}
                  <textarea
                    value={layer.promptText}
                    onChange={(e) => updateLayer(layer.id, { promptText: e.target.value })}
                    placeholder="Layer-specific prompt (leave empty to inherit cue description)…"
                    rows={2}
                    className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text font-mono placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none"
                  />

                  {layer.sourceFileName && (
                    <div className="rounded-lg border border-atlas-border-subtle bg-atlas-surface px-2 py-1.5">
                      <div className="text-[7px] text-atlas-text-dim">Source File</div>
                      <div className="mt-0.5 truncate font-mono text-[9px] text-atlas-text-muted">
                        {layer.sourceFileName}
                      </div>
                    </div>
                  )}

                  {/* Duration + Loop + Influence */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-atlas-text-dim">Duration (s)</span>
                      <input
                        type="number"
                        value={layer.durationSeconds}
                        onChange={(e) => updateLayer(layer.id, { durationSeconds: Math.max(0.5, Math.min(30, parseFloat(e.target.value) || 1)) })}
                        min={0.5}
                        max={30}
                        step={0.5}
                        className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-atlas-text-dim">Prompt Influence</span>
                      <input
                        type="number"
                        value={layer.promptInfluence}
                        onChange={(e) => updateLayer(layer.id, { promptInfluence: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.3)) })}
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <label className="flex items-center gap-1 text-[8px] text-atlas-text-dim cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layer.loop}
                          onChange={(e) => updateLayer(layer.id, { loop: e.target.checked })}
                          className="accent-atlas-accent h-3 w-3"
                        />
                        Loop
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    <button onClick={() => duplicateLayer(layer.id)} disabled={layers.length >= MAX_LAYERS} className="flex items-center gap-1 rounded-lg border border-atlas-border-subtle px-2 py-0.5 text-[8px] text-atlas-text-dim hover:text-atlas-accent transition-colors disabled:opacity-30">
                      <Copy className="h-2.5 w-2.5" /> Duplicate
                    </button>
                    <button onClick={() => removeLayer(layer.id)} className="flex items-center gap-1 rounded-lg border border-atlas-border-subtle px-2 py-0.5 text-[8px] text-atlas-text-dim hover:text-atlas-danger transition-colors">
                      <Trash2 className="h-2.5 w-2.5" /> Remove
                    </button>
                    <button
                      onClick={() => updateLayer(layer.id, { muted: !layer.muted })}
                      className={cn("rounded-lg border px-2 py-0.5 text-[8px] font-medium transition-colors",
                        layer.muted ? "border-atlas-danger/40 text-atlas-danger" : "border-atlas-border-subtle text-atlas-text-dim hover:text-atlas-accent"
                      )}
                    >
                      {layer.muted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={() => updateLayer(layer.id, { solo: !layer.solo })}
                      className={cn("rounded-lg border px-2 py-0.5 text-[8px] font-medium transition-colors",
                        layer.solo ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent" : "border-atlas-border-subtle text-atlas-text-dim hover:text-atlas-accent"
                      )}
                    >
                      Solo
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add layer */}
      {layers.length < MAX_LAYERS && (
        <div className="flex flex-wrap gap-1">
          {STACKER_LAYER_TYPES.slice(0, 6).map((t) => {
            const d = getLayerTypeDef(t);
            return (
              <button
                key={t}
                onClick={() => addLayer(t)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-atlas-border-subtle px-2 py-1 text-[8px] text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
              >
                <Plus className="h-2.5 w-2.5" />
                {d.shortLabel}
              </button>
            );
          })}
          <button
            onClick={() => addLayer("body")}
            className="rounded-lg border border-dashed border-atlas-border-subtle px-2 py-1 text-[8px] text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
          >
            + More…
          </button>
        </div>
      )}
    </div>
  );
}
