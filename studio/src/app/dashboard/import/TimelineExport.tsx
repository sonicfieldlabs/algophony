"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Code, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineCue } from "@/lib/timeline/types";
import { exportCueSheetCsv, exportGameManifest } from "@/lib/timeline/cue-to-prompt";

type ExportFormat = "csv" | "game_manifest";

interface TimelineExportProps {
  cues: TimelineCue[];
}

export function TimelineExport({ cues }: TimelineExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [copied, setCopied] = useState(false);

  const generatedCues = cues.filter((c) => c.status === "generated");
  const allCuesWithPrompts = cues.filter((c) => c.generatedPrompt);

  if (allCuesWithPrompts.length === 0) return null;

  const handleExport = () => {
    const exportCues = generatedCues.length > 0 ? generatedCues : allCuesWithPrompts;
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (selectedFormat) {
      case "csv":
        content = exportCueSheetCsv(exportCues);
        filename = "algophony-studio-cue-sheet.csv";
        mimeType = "text/csv";
        break;
      case "game_manifest":
        content = exportGameManifest(exportCues);
        filename = "algophony-studio-manifest.json";
        mimeType = "application/json";
        break;
      default:
        return;
    }

    // Download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const content = selectedFormat === "csv"
      ? exportCueSheetCsv(allCuesWithPrompts)
      : exportGameManifest(allCuesWithPrompts);

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="atlas-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-atlas-text flex items-center gap-2">
        <Download className="h-4 w-4 text-atlas-accent" />
        Export Cue Sheet
      </h3>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedFormat("csv")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all",
            selectedFormat === "csv"
              ? "border-atlas-accent bg-atlas-accent/10 text-atlas-accent"
              : "border-atlas-border text-atlas-text-muted hover:border-atlas-accent"
          )}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV Cue Sheet
        </button>
        <button
          onClick={() => setSelectedFormat("game_manifest")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all",
            selectedFormat === "game_manifest"
              ? "border-atlas-accent bg-atlas-accent/10 text-atlas-accent"
              : "border-atlas-border text-atlas-text-muted hover:border-atlas-accent"
          )}
        >
          <Code className="h-3.5 w-3.5" />
          Game Manifest (JSON)
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-atlas-text-dim">
          <span className="font-medium text-atlas-text">{allCuesWithPrompts.length}</span> cues with prompts
          {generatedCues.length > 0 && (
            <span> · <span className="font-medium text-green-400">{generatedCues.length}</span> generated with audio</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg bg-atlas-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-atlas-accent-hover transition-colors"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
