"use client";

import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { HumanItem } from "@/lib/sfx/human-taxonomy";
import type { HybridCrowdLayer } from "@/lib/sfx/human-prompt";
import { exportHumanManifest, exportCrowdDAWNotes, exportHumanCSV } from "@/lib/sfx/human-prompt";

interface HumanExportPanelProps {
  items: HumanItem[];
  hybridPlan: HybridCrowdLayer[];
  setName: string;
}

type ExportFormat = "manifest" | "daw_notes" | "csv";

export function HumanExportPanel({ items, hybridPlan, setName }: HumanExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("manifest");
  const [copied, setCopied] = useState(false);

  const getExportContent = (): string => {
    switch (format) {
      case "manifest": return JSON.stringify(exportHumanManifest(items, setName), null, 2);
      case "daw_notes": return exportCrowdDAWNotes(hybridPlan);
      case "csv": return exportHumanCSV(items);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getExportContent();
    const ext = format === "csv" ? "csv" : format === "daw_notes" ? "md" : "json";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `human_lab_${format}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatedCount = items.filter((i) => i.status === "generated").length;

  if (generatedCount === 0 && hybridPlan.length === 0) return null;

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Download className="h-3 w-3" />
        Export
      </span>

      <div className="flex gap-1">
        {(["manifest", "daw_notes", "csv"] as ExportFormat[]).map((f) => (
          <button key={f} onClick={() => setFormat(f)} className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-all capitalize ${format === f ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent" : "border-atlas-border-subtle text-atlas-text-dim"}`}>
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-atlas-bg border border-atlas-border-subtle p-3 max-h-32 overflow-y-auto scrollbar-thin">
        <pre className="text-xs text-atlas-text-dim font-mono whitespace-pre-wrap">{getExportContent().slice(0, 800)}{getExportContent().length > 800 ? "\n…" : ""}</pre>
      </div>

      <div className="flex gap-2">
        <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border py-1.5 text-xs font-medium text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-all">
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
        <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border py-1.5 text-xs font-medium text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-all">
          <Download className="h-3 w-3" /> Download
        </button>
      </div>
    </div>
  );
}
