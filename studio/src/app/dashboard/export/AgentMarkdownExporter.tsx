"use client";

import { useState } from "react";
import { Bot, Download, Eye } from "lucide-react";
import { buildAgentArchive } from "@/lib/sfx/export-builders";

interface AgentMarkdownExporterProps {
  cards: Record<string, unknown>[];
  generations: Record<string, unknown>[];
  usageEvents: Record<string, unknown>[];
}

export function AgentMarkdownExporter({ cards, generations, usageEvents }: AgentMarkdownExporterProps) {
  const [projectName, setProjectName] = useState("Algophony_Studio_Project");
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const archive = buildAgentArchive(projectName, cards, generations, usageEvents);
  const fileNames = Object.keys(archive);

  const handleDownloadAll = () => {
    // Download each file individually (ZIP requires jszip, Phase 3)
    for (const [name, content] of Object.entries(archive)) {
      const ext = name.split(".").pop() ?? "txt";
      const mime = ext === "json" ? "application/json" : "text/markdown";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${projectName}_AgentArchive_${name}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadSingle = (name: string) => {
    const content = archive[name];
    const ext = name.split(".").pop() ?? "txt";
    const mime = ext === "json" ? "application/json" : "text/markdown";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectName}_${name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Agent Archive Configuration</h3>
        </div>
        <div>
          <label className="text-xs text-atlas-text-dim mb-1 block">Project Name</label>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none" />
        </div>
      </div>

      {/* File list */}
      <div className="atlas-card p-4">
        <h3 className="text-sm font-semibold text-atlas-text mb-3">Archive Contents</h3>
        <div className="font-mono text-xs text-atlas-text-muted space-y-0.5">
          <div className="text-atlas-text font-semibold mb-1">{projectName}_AgentArchive/</div>
          {fileNames.map((name) => (
            <div key={name} className="flex items-center gap-2 pl-4 py-1 hover:bg-atlas-surface-hover/30 rounded-md group">
              <span className="text-atlas-text-dim">├─</span>
              <span className="flex-1">{name}</span>
              <span className="text-xs text-atlas-text-dim">{(archive[name].length / 1024).toFixed(1)}kb</span>
              <button onClick={() => setPreviewFile(previewFile === name ? null : name)}
                className="opacity-0 group-hover:opacity-100 text-atlas-text-dim hover:text-atlas-accent transition-all"
                title="Preview">
                <Eye className="h-3 w-3" />
              </button>
              <button onClick={() => handleDownloadSingle(name)}
                className="opacity-0 group-hover:opacity-100 text-atlas-text-dim hover:text-atlas-accent transition-all"
                title="Download">
                <Download className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {previewFile && (
        <div className="atlas-card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-atlas-text font-mono">{previewFile}</h3>
            <button onClick={() => setPreviewFile(null)} className="text-xs text-atlas-text-dim hover:text-atlas-accent">Close</button>
          </div>
          <pre className="rounded-lg bg-atlas-bg p-3 text-xs text-atlas-text-muted overflow-auto max-h-60 border border-atlas-border-subtle">
            {archive[previewFile].slice(0, 3000)}
            {archive[previewFile].length > 3000 && "\n\n... (truncated)"}
          </pre>
        </div>
      )}

      {/* Actions */}
      <button onClick={handleDownloadAll}
        className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all"
      >
        <Download className="h-4 w-4" /> Download All Files ({fileNames.length})
      </button>
    </div>
  );
}
