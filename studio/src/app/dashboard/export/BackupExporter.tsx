"use client";

import { useState } from "react";
import { Shield, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildJsonExport, buildCsvFromRows, buildPromptDatabaseExport, buildSoundMetadataExport, buildUsageReport, PROMPT_DB_COLUMNS, SOUND_METADATA_COLUMNS, USAGE_REPORT_COLUMNS } from "@/lib/sfx/export-builders";

type BackupScope = "full_workspace" | "single_project" | "prompts_only" | "sounds_only" | "metadata_only" | "usage_only";

const SCOPE_OPTIONS: Array<{ id: BackupScope; label: string; description: string }> = [
  { id: "full_workspace", label: "Full Workspace", description: "All projects, prompts, sounds, metadata, and usage data" },
  { id: "single_project", label: "Single Project", description: "All data from one project" },
  { id: "prompts_only", label: "Prompt Database", description: "All prompt cards and configurations" },
  { id: "sounds_only", label: "Generated Sounds", description: "Generation metadata and references" },
  { id: "metadata_only", label: "Metadata Only", description: "Structured metadata without audio" },
  { id: "usage_only", label: "Usage Data", description: "Usage events and cost data" },
];

interface BackupExporterProps {
  cards: Record<string, unknown>[];
  generations: Record<string, unknown>[];
  usageEvents: Record<string, unknown>[];
}

export function BackupExporter({ cards, generations, usageEvents }: BackupExporterProps) {
  const [scope, setScope] = useState<BackupScope>("full_workspace");
  const [format, setFormat] = useState<"json" | "csv">("json");

  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let content: string;
    let filename: string;
    let mime: string;

    if (format === "json") {
      const backupData: Record<string, unknown> = {
        backup_type: scope,
        exported_at: new Date().toISOString(),
        version: "algophony_studio_backup_v1",
        warning: "This backup does not contain API keys, secrets, or payment credentials.",
      };

      if (scope === "full_workspace" || scope === "prompts_only") {
        backupData.prompt_cards = buildPromptDatabaseExport(cards);
      }
      if (scope === "full_workspace" || scope === "sounds_only" || scope === "metadata_only") {
        backupData.generations = buildSoundMetadataExport(generations);
      }
      if (scope === "full_workspace" || scope === "usage_only") {
        backupData.usage_events = buildUsageReport(usageEvents);
      }

      content = buildJsonExport(backupData);
      filename = `algophony_studio_backup_${scope}_${timestamp}.json`;
      mime = "application/json";
    } else {
      // CSV: export the primary data type based on scope
      let rows: Record<string, unknown>[] = [];
      let columns: string[] = [];

      switch (scope) {
        case "prompts_only":
          rows = buildPromptDatabaseExport(cards);
          columns = PROMPT_DB_COLUMNS;
          break;
        case "sounds_only":
        case "metadata_only":
          rows = buildSoundMetadataExport(generations);
          columns = SOUND_METADATA_COLUMNS;
          break;
        case "usage_only":
          rows = buildUsageReport(usageEvents);
          columns = USAGE_REPORT_COLUMNS;
          break;
        default:
          rows = buildPromptDatabaseExport(cards);
          columns = PROMPT_DB_COLUMNS;
      }

      content = buildCsvFromRows(rows, columns);
      filename = `algophony_studio_backup_${scope}_${timestamp}.csv`;
      mime = "text/csv";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const itemCounts = {
    full_workspace: cards.length + generations.length + usageEvents.length,
    single_project: 0,
    prompts_only: cards.length,
    sounds_only: generations.length,
    metadata_only: generations.length,
    usage_only: usageEvents.length,
  };

  return (
    <div className="space-y-4">
      {/* Safety notice */}
      <div className="rounded-lg border border-atlas-warning/30 bg-atlas-warning/5 p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-atlas-warning shrink-0 mt-0.5" />
        <div className="text-xs text-atlas-text-muted">
          <p className="font-semibold text-atlas-warning mb-0.5">Security Notice</p>
          <p>Backups never include API keys, payment secrets, webhook secrets, environment variables, or service credentials.</p>
        </div>
      </div>

      {/* Scope selector */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Backup Scope</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SCOPE_OPTIONS.map((opt) => (
            <button key={opt.id} onClick={() => setScope(opt.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                scope === opt.id
                  ? "border-atlas-accent/40 bg-atlas-accent-muted"
                  : "border-atlas-border hover:border-atlas-border-subtle hover:bg-atlas-surface-hover/30"
              )}
            >
              <div className="text-xs font-medium text-atlas-text">{opt.label}</div>
              <div className="text-xs text-atlas-text-dim mt-0.5">{opt.description}</div>
              <div className="text-xs text-atlas-accent mt-1 font-medium">{itemCounts[opt.id]} items</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="atlas-card p-4">
        <h3 className="text-sm font-semibold text-atlas-text mb-2">Format</h3>
        <div className="flex gap-2">
          {(["json", "csv"] as const).map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-medium transition-all border",
                format === f ? "border-atlas-accent bg-atlas-accent text-white" : "border-atlas-border text-atlas-text-muted"
              )}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <button onClick={handleExport}
        className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all"
      >
        <Download className="h-4 w-4" /> Create Backup ({itemCounts[scope]} items)
      </button>
    </div>
  );
}
