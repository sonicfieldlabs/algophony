"use client";

import { useState } from "react";
import { ClipboardList, Download } from "lucide-react";
import { type ExportDataFormat } from "@/lib/sfx/export-taxonomy";
import {
  buildCueSheet, buildCsvFromRows, buildJsonExport,
  buildMarkdownTable, CUE_SHEET_COLUMNS,
} from "@/lib/sfx/export-builders";
import { ExportPreviewTable } from "./ExportPreviewTable";

interface CueSheetExporterProps {
  cards: Record<string, unknown>[];
  format: ExportDataFormat;
}

export function CueSheetExporter({ cards, format }: CueSheetExporterProps) {
  const [projectCode, setProjectCode] = useState("PRJ");

  const cueEntries = buildCueSheet(cards, projectCode);
  const rows = cueEntries as unknown as Record<string, unknown>[];

  const handleExport = () => {
    let content: string;
    let ext: string;
    let mime: string;

    switch (format) {
      case "csv":
        content = buildCsvFromRows(rows, CUE_SHEET_COLUMNS);
        ext = "csv"; mime = "text/csv";
        break;
      case "json":
        content = buildJsonExport({ cue_sheet: cueEntries, project_code: projectCode, exported_at: new Date().toISOString() });
        ext = "json"; mime = "application/json";
        break;
      case "markdown":
        content = `# Cue Sheet — ${projectCode}\n\n${buildMarkdownTable(rows, CUE_SHEET_COLUMNS)}`;
        ext = "md"; mime = "text/markdown";
        break;
      default:
        content = buildCsvFromRows(rows, CUE_SHEET_COLUMNS);
        ext = "csv"; mime = "text/csv";
    }

    downloadFile(content, `${projectCode}_cue_sheet.${ext}`, mime);
  };

  return (
    <div className="space-y-4">
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Cue Sheet Configuration</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-atlas-text-dim mb-1 block">Project Code</label>
            <input value={projectCode} onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text font-mono focus:border-atlas-accent focus:outline-none" />
          </div>
          <div className="flex items-end">
            <span className="text-xs text-atlas-text-dim">
              {cueEntries.length} cue{cueEntries.length !== 1 ? "s" : ""} from {cards.length} prompt card{cards.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <ExportPreviewTable columns={CUE_SHEET_COLUMNS.slice(0, 8)} rows={rows} totalCount={rows.length} />

      <button onClick={handleExport} disabled={rows.length === 0}
        className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
      >
        <Download className="h-4 w-4" /> Export Cue Sheet ({format.toUpperCase()})
      </button>
    </div>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
