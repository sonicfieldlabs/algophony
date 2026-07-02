"use client";

import { useState, useMemo } from "react";
import { HardDrive, Download, FolderTree, Terminal, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DawHandoffConfig, defaultDawConfig } from "@/lib/sfx/export-taxonomy";
import { NamingConventionBuilder } from "./NamingConventionBuilder";
import {
  DAW_PRESETS, DAW_PRESET_DEFS,
  type DawPreset, type FolderNode,
  buildDawHandoffPackage, generateTrackSuggestions,
} from "@/lib/daw/daw-handoff-builder";

interface DawHandoffExporterProps {
  cards: Record<string, unknown>[];
  generations: Record<string, unknown>[];
}

const DAW_ICONS: Record<DawPreset, string> = {
  reaper: "🎚️",
  pro_tools: "🎛️",
  ableton: "🔲",
  resolve: "🎬",
  premiere: "🎞️",
  generic: "📁",
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function DawHandoffExporter({ cards, generations }: DawHandoffExporterProps) {
  const [dawPreset, setDawPreset] = useState<DawPreset>("reaper");
  const [config, setConfig] = useState<DawHandoffConfig>(defaultDawConfig());
  const [projectName, setProjectName] = useState("Algophony_Studio_Project");
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const presetDef = DAW_PRESET_DEFS[dawPreset];
  const trackSuggestions = useMemo(() => generateTrackSuggestions(cards), [cards]);
  const audioCount = generations.filter((g) => g.audio_storage_path).length;

  // Build package on demand (memoized for preview)
  const packageManifest = useMemo(
    () => buildDawHandoffPackage(cards, generations, dawPreset, config),
    [cards, generations, dawPreset, config]
  );

  const toggles: Array<{ key: keyof DawHandoffConfig; label: string }> = [
    { key: "includeAudio", label: "Include audio files" },
    { key: "includePrompts", label: "Include prompt cards" },
    { key: "includeCueSheet", label: "Include cue sheet" },
    { key: "includeUsageReport", label: "Include usage report" },
    { key: "includeRejected", label: "Include rejected sounds" },
    { key: "includeFavoritesOnly", label: "Favorites only" },
    { key: "folderByCategory", label: "Organize by category" },
    { key: "normalizeFilenames", label: "Normalize filenames" },
    { key: "generateNotes", label: "Generate notes/brief" },
  ];

  const handleExportFile = (filename: string) => {
    const content = packageManifest.files[filename];
    if (!content) return;
    const ext = filename.split(".").pop() ?? "txt";
    const mimeMap: Record<string, string> = {
      json: "application/json",
      csv: "text/csv",
      lua: "text/x-lua",
      txt: "text/plain",
      edl: "text/plain",
      md: "text/markdown",
    };
    downloadFile(content, `${projectName}_${filename}`, mimeMap[ext] ?? "text/plain");
  };

  const handleExportAll = () => {
    // Export the manifest as the main package descriptor
    downloadFile(
      JSON.stringify(packageManifest, null, 2),
      `${projectName}_DAW_Package.json`,
      "application/json"
    );
  };

  // Folder tree renderer
  function renderFolderTree(nodes: FolderNode[], depth = 0): React.ReactNode {
    return nodes.map((node, i) => {
      const isLast = i === nodes.length - 1;
      const prefix = depth > 0 ? (isLast ? "└─ " : "├─ ") : "";
      const isFile = node.type === "file";
      const hasExport = isFile && packageManifest.files[node.name.replace(/\/$/, "")] !== undefined;

      return (
        <div key={`${depth}-${node.name}`}>
          <div
            className={cn(
              "flex items-center gap-1.5 py-0.5 group",
              isFile && hasExport && "cursor-pointer hover:text-atlas-accent"
            )}
            style={{ paddingLeft: `${depth * 16 + 4}px` }}
            onClick={() => {
              if (isFile && hasExport) {
                const key = node.name.replace(/\/$/, "");
                setPreviewFile(previewFile === key ? null : key);
              }
            }}
          >
            <span className="text-atlas-text-dim select-none">{prefix}</span>
            <span className={cn(
              "text-xs",
              isFile ? "text-atlas-text-muted" : "text-atlas-text font-medium"
            )}>
              {node.name}
            </span>
            {node.dynamic && (
              <span className="text-xs text-atlas-accent">(auto)</span>
            )}
            {isFile && hasExport && (
              <button
                onClick={(e) => { e.stopPropagation(); handleExportFile(node.name); }}
                className="opacity-0 group-hover:opacity-100 text-xs text-atlas-accent ml-auto"
              >
                ↓
              </button>
            )}
          </div>
          {node.children && renderFolderTree(node.children, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* DAW Preset Selector */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">DAW Bridge</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {DAW_PRESETS.map((preset) => {
            const def = DAW_PRESET_DEFS[preset];
            return (
              <button
                key={preset}
                onClick={() => setDawPreset(preset)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-all border",
                  dawPreset === preset
                    ? "border-atlas-accent bg-atlas-accent/5 text-atlas-accent"
                    : "border-atlas-border-subtle bg-atlas-surface text-atlas-text-muted hover:border-atlas-border"
                )}
              >
                <span className="text-lg">{DAW_ICONS[preset]}</span>
                <span>{def.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-atlas-text-dim">{presetDef.description}</p>

        <div className="mt-3">
          <label className="text-xs text-atlas-text-dim mb-1 block">Project Name</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Folder Structure */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Package Structure</h3>
          <span className="text-xs text-atlas-text-dim ml-auto">Click files to preview</span>
        </div>
        <div className="font-mono text-xs text-atlas-text-muted space-y-0.5">
          <div className="text-atlas-text font-semibold">{projectName}_Export/</div>
          {renderFolderTree(presetDef.folderStructure, 1)}
        </div>

        {/* File preview */}
        {previewFile && packageManifest.files[previewFile] && (
          <div className="mt-3 border-t border-atlas-border-subtle pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-atlas-text">{previewFile}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportFile(previewFile)}
                  className="text-xs text-atlas-accent hover:underline"
                >
                  Download
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-xs text-atlas-text-dim hover:text-atlas-text"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-3 text-xs text-atlas-text-muted overflow-auto max-h-64 font-mono whitespace-pre-wrap">
              {packageManifest.files[previewFile].slice(0, 3000)}
              {packageManifest.files[previewFile].length > 3000 && "\n\n... (truncated)"}
            </pre>
          </div>
        )}
      </div>

      {/* Track Suggestions (Reaper / Pro Tools) */}
      {(dawPreset === "reaper" || dawPreset === "pro_tools") && trackSuggestions.length > 0 && (
        <div className="atlas-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Music className="h-4 w-4 text-atlas-accent" />
            <h3 className="text-sm font-semibold text-atlas-text">Track Suggestions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trackSuggestions.map((track) => (
              <div
                key={track.name}
                className="flex items-center gap-3 rounded-lg border border-atlas-border-subtle p-2.5 hover:bg-atlas-surface-hover/30 transition-colors"
              >
                <div
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ background: track.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-atlas-text font-mono">{track.name}</span>
                  <div className="flex gap-2 mt-0.5 text-xs text-atlas-text-dim">
                    <span>{track.itemCount} items</span>
                    <span>→ {track.bus}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ReaScript notice */}
      {dawPreset === "reaper" && (
        <div className="atlas-card p-4 border-atlas-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-atlas-accent" />
            <h3 className="text-sm font-semibold text-atlas-text">ReaScript Integration</h3>
          </div>
          <p className="text-xs text-atlas-text-muted leading-relaxed">
            The export includes a <code className="text-atlas-accent bg-atlas-accent/5 px-1 rounded">reaper_import.lua</code> script.
            Place the export folder and run it in REAPER via <strong>Extensions → ReaScript → Run</strong>.
            It will auto-create tracks by category, place items at timecoded positions, add markers, and name regions.
          </p>
        </div>
      )}

      {/* Options */}
      <div className="atlas-card p-4">
        <h3 className="text-sm font-semibold text-atlas-text mb-3">Options</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {toggles.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs text-atlas-text-muted cursor-pointer hover:text-atlas-text transition-colors">
              <input
                type="checkbox"
                checked={Boolean(config[key])}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                className="rounded border-atlas-border accent-atlas-accent h-3.5 w-3.5"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Naming */}
      <NamingConventionBuilder
        template={config.namingTemplate}
        onChange={(t) => setConfig({ ...config, namingTemplate: t })}
      />

      {/* Summary + Export */}
      <div className="atlas-card p-4 flex items-center justify-between">
        <div className="text-xs text-atlas-text-muted space-y-0.5">
          <div><span className="font-medium text-atlas-text">{audioCount}</span> audio files</div>
          <div><span className="font-medium text-atlas-text">{cards.length}</span> prompt cards</div>
          <div><span className="font-medium text-atlas-text">{Object.keys(packageManifest.files).length}</span> metadata files</div>
          <div>
            <span className="font-medium text-atlas-text">{presetDef.specialFiles.length}</span>
            {" "}DAW-specific files
            {presetDef.specialFiles.length > 0 && (
              <span className="text-atlas-text-dim"> ({presetDef.specialFiles.join(", ")})</span>
            )}
          </div>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all hover:shadow-lg hover:shadow-atlas-accent/20"
        >
          <Download className="h-4 w-4" /> Export {presetDef.label} Package
        </button>
      </div>
    </div>
  );
}
