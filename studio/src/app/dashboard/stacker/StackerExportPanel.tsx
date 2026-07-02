"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Clapperboard, Gamepad2, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StackerCue, NamingConvention } from "@/lib/sfx/stacker-taxonomy";
import { NAMING_CONVENTIONS, NAMING_CONVENTION_DEFS } from "@/lib/sfx/stacker-taxonomy";
import {
  exportStackManifest,
  exportDAWSessionInfo,
  exportGameManifest,
  exportPromptCSV,
} from "@/lib/sfx/stacker-prompt";

interface StackerExportPanelProps {
  cue: StackerCue;
  onNamingChange: (convention: NamingConvention) => void;
}

type ExportFormat = "stack_manifest" | "daw_session" | "game_manifest" | "prompt_csv";

const EXPORTS: Array<{ id: ExportFormat; label: string; description: string; icon: React.ElementType; extension: string }> = [
  { id: "stack_manifest", label: "Stack Manifest", description: "Full cue with layer metadata", icon: FileJson, extension: "json" },
  { id: "daw_session", label: "DAW Session Info", description: "Track layout for Reaper/Pro Tools", icon: Clapperboard, extension: "json" },
  { id: "game_manifest", label: "Game Manifest", description: "FMOD/Wwise event structure", icon: Gamepad2, extension: "json" },
  { id: "prompt_csv", label: "Prompt CSV", description: "All layer prompts as spreadsheet", icon: FileSpreadsheet, extension: "csv" },
];

export function StackerExportPanel({ cue, onNamingChange }: StackerExportPanelProps) {
  const [showExports, setShowExports] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (cue.layers.length === 0) return null;

  const generate = (format: ExportFormat): { content: string; filename: string; mime: string } => {
    const slug = cue.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "cue";
    switch (format) {
      case "stack_manifest":
        return { content: JSON.stringify(exportStackManifest(cue), null, 2), filename: `${slug}_stack.json`, mime: "application/json" };
      case "daw_session":
        return { content: JSON.stringify(exportDAWSessionInfo(cue), null, 2), filename: `${slug}_daw.json`, mime: "application/json" };
      case "game_manifest":
        return { content: JSON.stringify(exportGameManifest(cue), null, 2), filename: `${slug}_game.json`, mime: "application/json" };
      case "prompt_csv":
        return { content: exportPromptCSV(cue), filename: `${slug}_prompts.csv`, mime: "text/csv" };
    }
  };

  const handleExport = (format: ExportFormat) => {
    const { content, filename, mime } = generate(format);
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (format: ExportFormat) => {
    const { content } = generate(format);
    navigator.clipboard.writeText(content);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      {/* Naming convention selector */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Download className="h-3 w-3" />
          Naming & Export
        </span>
        <div className="flex gap-1">
          {NAMING_CONVENTIONS.map((nc) => {
            const def = NAMING_CONVENTION_DEFS[nc];
            return (
              <button
                key={nc}
                onClick={() => onNamingChange(nc)}
                className={cn(
                  "rounded-xl border px-2.5 py-1 text-xs font-medium transition-all text-left",
                  cue.namingConvention === nc
                    ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                    : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
                )}
              >
                <span className="block">{def.label}</span>
                <span className="text-[7px] opacity-60 block font-mono">{def.example}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export toggle */}
      <button onClick={() => setShowExports(!showExports)} className="flex w-full items-center justify-between">
        <span className="text-xs text-atlas-text-dim">Export Formats</span>
        <ChevronDown className={cn("h-3 w-3 text-atlas-text-dim transition-transform", showExports && "rotate-180")} />
      </button>

      {showExports && (
        <div className="space-y-1.5 animate-expand-down">
          {EXPORTS.map((exp) => {
            const Icon = exp.icon;
            return (
              <div key={exp.id} className="flex items-center gap-3 rounded-xl border border-atlas-border-subtle bg-atlas-bg px-3 py-2.5 hover:border-atlas-border transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-atlas-surface-hover shrink-0">
                  <Icon className="h-3.5 w-3.5 text-atlas-text-dim" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-atlas-text">{exp.label}</span>
                  <span className="text-xs text-atlas-text-dim block">{exp.description}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleCopy(exp.id)} className="rounded-lg border border-atlas-border px-2 py-1 text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors">
                    {copied === exp.id ? <Check className="h-3 w-3 text-atlas-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button onClick={() => handleExport(exp.id)} className="rounded-lg bg-atlas-accent px-2 py-1 text-xs font-medium text-white hover:bg-atlas-accent-hover transition-colors">
                    .{exp.extension}
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
