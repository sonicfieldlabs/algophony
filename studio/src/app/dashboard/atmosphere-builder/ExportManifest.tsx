"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, FolderOpen, Copy, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtmosphereProject } from "@/lib/sfx/atmosphere-taxonomy";
import { getLayerDef } from "@/lib/sfx/atmosphere-taxonomy";
import { buildAtmospherePlan } from "@/lib/sfx/atmosphere-prompt";
import type { VariationSet } from "./VariationCycles";

interface ExportManifestProps {
  project: AtmosphereProject | null;
  variationSets: VariationSet[];
}

type ExportFormat = "atmosphere_plan" | "layer_manifest" | "prompt_csv" | "daw_structure" | "game_manifest";

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  extension: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "atmosphere_plan",
    label: "Atmosphere Plan",
    description: "Full project plan with traits and layers (JSON)",
    icon: FileJson,
    extension: "json",
  },
  {
    id: "layer_manifest",
    label: "Layer Manifest",
    description: "Per-layer metadata with audio references (JSON)",
    icon: FileJson,
    extension: "json",
  },
  {
    id: "prompt_csv",
    label: "Prompt Cards",
    description: "All layer prompts as CSV for spreadsheet import",
    icon: FileSpreadsheet,
    extension: "csv",
  },
  {
    id: "daw_structure",
    label: "DAW Session Info",
    description: "Track layout, routing, and color mapping for DAW import",
    icon: FolderOpen,
    extension: "json",
  },
  {
    id: "game_manifest",
    label: "Game Ambience Manifest",
    description: "State-based layer groupings for game/interactive engines",
    icon: FileJson,
    extension: "json",
  },
];

function generateExport(
  format: ExportFormat,
  project: AtmosphereProject,
  variationSets: VariationSet[]
): { content: string; filename: string; mime: string } {
  const { brief, layers, name } = project;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  switch (format) {
    case "atmosphere_plan": {
      const plan = buildAtmospherePlan(brief, layers);
      return {
        content: JSON.stringify(plan, null, 2),
        filename: `${slug}_atmosphere_plan.json`,
        mime: "application/json",
      };
    }

    case "layer_manifest": {
      const manifest = layers.map((l, i) => {
        const def = getLayerDef(l.layerType);
        const vars = variationSets.find((vs) => vs.layerId === l.id);
        return {
          index: i,
          id: l.id,
          type: l.layerType,
          role: l.layerRole,
          label: `${def.shortLabel}: ${l.layerRole}`,
          prompt: l.promptText,
          duration_seconds: l.durationSeconds,
          loop: l.loopable,
          frequency_role: l.frequencyRole,
          intensity: l.intensity,
          density: l.density,
          distance: l.distance,
          movement: l.movement,
          status: l.status,
          audio_url: l.audioUrl ?? null,
          generation_id: l.generationId ?? null,
          muted: l.muted,
          priority: l.priority,
          variations: vars?.variations.map((v, vi) => ({
            variant: String.fromCharCode(65 + vi),
            audio_url: v.audioUrl ?? null,
            generation_id: v.generationId ?? null,
            duration_seconds: v.durationSeconds,
          })) ?? [],
        };
      });
      return {
        content: JSON.stringify({ project: name, layers: manifest }, null, 2),
        filename: `${slug}_layer_manifest.json`,
        mime: "application/json",
      };
    }

    case "prompt_csv": {
      const header = "Layer Type,Role,Duration (s),Loop,Freq Role,Prompt Text";
      const rows = layers.map((l) =>
        [
          l.layerType,
          l.layerRole,
          l.durationSeconds,
          l.loopable ? "yes" : "no",
          l.frequencyRole,
          `"${l.promptText.replace(/"/g, '""')}"`,
        ].join(",")
      );
      return {
        content: [header, ...rows].join("\n"),
        filename: `${slug}_prompts.csv`,
        mime: "text/csv",
      };
    }

    case "daw_structure": {
      const tracks = layers.map((l, i) => {
        const def = getLayerDef(l.layerType);
        return {
          track_number: i + 1,
          name: `${def.shortLabel} — ${l.layerRole}`,
          color_hue: def.hue,
          bus: l.frequencyRole === "low" ? "LF_BUS" : l.frequencyRole === "high" ? "HF_BUS" : "MAIN_BUS",
          pan: l.distance > 0.5 ? "wide" : "center",
          initial_volume_db: -6 + (l.intensity * 12 - 6),
          loop: l.loopable,
          duration_seconds: l.durationSeconds,
          file_ref: l.audioUrl ?? null,
          muted: l.muted,
          solo: l.solo,
        };
      });
      return {
        content: JSON.stringify({ project: name, sample_rate: 44100, tracks }, null, 2),
        filename: `${slug}_daw_session.json`,
        mime: "application/json",
      };
    }

    case "game_manifest": {
      // Group layers by functional state
      const states = {
        ambient_base: layers.filter((l) => l.layerType === "base_bed" || l.layerType === "spatial"),
        ecological: layers.filter((l) => l.layerType === "ecology"),
        texture_detail: layers.filter((l) => l.layerType === "texture"),
        dramatic_shift: layers.filter((l) => l.layerType === "dramatic" || l.layerType === "synthetic"),
        event_triggers: layers.filter((l) => l.layerType === "micro_event"),
      };

      const manifest = {
        project: name,
        engine_format: "generic_middleware",
        states: Object.entries(states).reduce((acc, [key, stateLayers]) => {
          acc[key] = {
            layers: stateLayers.map((l) => ({
              id: l.id,
              type: l.layerType,
              role: l.layerRole,
              file_ref: l.audioUrl ?? null,
              loop: l.loopable,
              duration_seconds: l.durationSeconds,
              default_volume: l.intensity,
              variations: (variationSets.find((vs) => vs.layerId === l.id)?.variations ?? []).map(
                (v, i) => ({
                  variant: String.fromCharCode(65 + i),
                  file_ref: v.audioUrl ?? null,
                })
              ),
            })),
            crossfade_ms: key === "dramatic_shift" ? 2000 : 500,
            trigger: key === "event_triggers" ? "random_interval" : "state_change",
          };
          return acc;
        }, {} as Record<string, unknown>),
      };
      return {
        content: JSON.stringify(manifest, null, 2),
        filename: `${slug}_game_manifest.json`,
        mime: "application/json",
      };
    }
  }
}

export function ExportManifest({ project, variationSets }: ExportManifestProps) {
  const [showExports, setShowExports] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!project || project.layers.length === 0) return null;

  const hasGenerated = project.layers.some(
    (l) => l.status === "generated" || l.status === "favorite"
  );

  const handleExport = (format: ExportFormat) => {
    const { content, filename, mime } = generateExport(format, project, variationSets);

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (format: ExportFormat) => {
    const { content } = generateExport(format, project, variationSets);
    navigator.clipboard.writeText(content);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="atlas-card p-4">
      <button
        onClick={() => setShowExports(!showExports)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Download className="h-3 w-3" />
          Export Manifests
        </span>
        <ChevronDown className={cn("h-3 w-3 text-atlas-text-dim transition-transform", showExports && "rotate-180")} />
      </button>

      {showExports && (
        <div className="mt-3 space-y-1.5 animate-expand-down">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <div
                key={opt.id}
                className="flex items-center gap-3 rounded-xl border border-atlas-border-subtle bg-atlas-bg px-3 py-2.5 hover:border-atlas-border transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-atlas-surface-hover shrink-0">
                  <Icon className="h-3.5 w-3.5 text-atlas-text-dim" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-atlas-text">{opt.label}</span>
                  <span className="text-xs text-atlas-text-dim block">{opt.description}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(opt.id)}
                    className="rounded-lg border border-atlas-border px-2 py-1 text-xs text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
                  >
                    {copied === opt.id ? <Check className="h-3 w-3 text-atlas-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => handleExport(opt.id)}
                    disabled={!hasGenerated && opt.id !== "atmosphere_plan" && opt.id !== "prompt_csv"}
                    className="rounded-lg bg-atlas-accent px-2 py-1 text-xs font-medium text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-40"
                  >
                    .{opt.extension}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
