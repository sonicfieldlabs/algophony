"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, FolderOpen, Copy, Check, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariationBatch, SoundFamily } from "@/lib/sfx/variation-taxonomy";

interface BatchExportPanelProps {
  batch: VariationBatch | null;
  family: SoundFamily | null;
}

type ExportFormat = "round_robin_manifest" | "family_manifest" | "prompt_csv" | "metadata_json";

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  extension: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: "round_robin_manifest", label: "Round-Robin Manifest", description: "Named variation set for game engines", icon: RefreshCw, extension: "json" },
  { id: "family_manifest", label: "Family Manifest", description: "Sound family with source, strategy, members", icon: FolderOpen, extension: "json" },
  { id: "prompt_csv", label: "Prompt Cards CSV", description: "All variation prompts as spreadsheet", icon: FileSpreadsheet, extension: "csv" },
  { id: "metadata_json", label: "Full Metadata", description: "Complete batch metadata with settings", icon: FileJson, extension: "json" },
];

function generateExport(
  format: ExportFormat,
  batch: VariationBatch,
  family: SoundFamily | null
): { content: string; filename: string; mime: string } {
  const slug = batch.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "variation_batch";
  const generatedJobs = batch.jobs.filter((j) => j.status === "generated");
  const favoriteJobs = generatedJobs.filter((j) => j.isFavorite);

  switch (format) {
    case "round_robin_manifest": {
      const manifest = {
        family: family?.name ?? batch.name,
        category: batch.jobs[0]?.generatedPrompt.split(" ").slice(0, 3).join("_") ?? "unknown",
        strategy: batch.strategy,
        total_variations: generatedJobs.length,
        favorites: favoriteJobs.length,
        variations: generatedJobs.map((j, i) => ({
          name: `${slug}_rr_${String(i + 1).padStart(2, "0")}`,
          file: `${slug}_rr_${String(i + 1).padStart(2, "0")}.mp3`,
          job_index: j.jobIndex,
          is_favorite: j.isFavorite,
          audio_url: j.audioUrl ?? null,
          generation_id: j.generationId ?? null,
        })),
      };
      return { content: JSON.stringify(manifest, null, 2), filename: `${slug}_round_robin.json`, mime: "application/json" };
    }

    case "family_manifest": {
      const manifest = {
        family: family ?? { name: batch.name, strategy: batch.strategy, sourcePrompt: batch.jobs[0]?.sourcePrompt ?? "" },
        preservation: batch.preservation,
        axes: batch.selectedAxes,
        members: generatedJobs.map((j) => ({
          index: j.jobIndex,
          prompt: j.generatedPrompt,
          audio_url: j.audioUrl ?? null,
          generation_id: j.generationId ?? null,
          is_favorite: j.isFavorite,
          is_rejected: j.isRejected,
        })),
      };
      return { content: JSON.stringify(manifest, null, 2), filename: `${slug}_family.json`, mime: "application/json" };
    }

    case "prompt_csv": {
      const header = "Index,Strategy,Status,Prompt,Is Favorite,Is Rejected";
      const rows = batch.jobs.map((j) =>
        [j.jobIndex, batch.strategy, j.status, `"${j.generatedPrompt.replace(/"/g, '""')}"`, j.isFavorite, j.isRejected].join(",")
      );
      return { content: [header, ...rows].join("\n"), filename: `${slug}_prompts.csv`, mime: "text/csv" };
    }

    case "metadata_json": {
      const data = {
        batch: {
          id: batch.id,
          name: batch.name,
          strategy: batch.strategy,
          batchMode: batch.batchMode,
          batchSize: batch.batchSize,
          preservation: batch.preservation,
          selectedAxes: batch.selectedAxes,
          estimatedCost: batch.estimatedCost,
          actualCost: batch.actualCost,
          status: batch.status,
        },
        jobs: batch.jobs.map((j) => ({
          index: j.jobIndex,
          status: j.status,
          sourcePrompt: j.sourcePrompt,
          generatedPrompt: j.generatedPrompt,
          audioUrl: j.audioUrl,
          generationId: j.generationId,
          isFavorite: j.isFavorite,
          isRejected: j.isRejected,
          evaluationTags: j.evaluationTags,
        })),
      };
      return { content: JSON.stringify(data, null, 2), filename: `${slug}_metadata.json`, mime: "application/json" };
    }
  }
}

export function BatchExportPanel({ batch, family }: BatchExportPanelProps) {
  const [showExports, setShowExports] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!batch || batch.jobs.length === 0) return null;
  const hasGenerated = batch.jobs.some((j) => j.status === "generated");

  const handleExport = (format: ExportFormat) => {
    const { content, filename, mime } = generateExport(format, batch, family);
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (format: ExportFormat) => {
    const { content } = generateExport(format, batch, family);
    navigator.clipboard.writeText(content);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="atlas-card p-4">
      <button onClick={() => setShowExports(!showExports)} className="flex w-full items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Download className="h-3 w-3" />
          Export
        </span>
        <ChevronDown className={cn("h-3 w-3 text-atlas-text-dim transition-transform", showExports && "rotate-180")} />
      </button>

      {showExports && (
        <div className="mt-3 space-y-1.5 animate-expand-down">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <div key={opt.id} className="flex items-center gap-3 rounded-xl border border-atlas-border-subtle bg-atlas-bg px-3 py-2.5 hover:border-atlas-border transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-atlas-surface-hover shrink-0">
                  <Icon className="h-3.5 w-3.5 text-atlas-text-dim" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-atlas-text">{opt.label}</span>
                  <span className="text-xs text-atlas-text-dim block">{opt.description}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleCopy(opt.id)} className="rounded-lg border border-atlas-border px-2 py-1 text-xs text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors">
                    {copied === opt.id ? <Check className="h-3 w-3 text-atlas-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => handleExport(opt.id)}
                    disabled={!hasGenerated && opt.id !== "prompt_csv"}
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
