"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ExportTab, type ExportSourceType, type ExportScope,
  type ExportFilter, type ExportDataFormat,
  EXPORT_TABS, defaultExportFilter,
} from "@/lib/sfx/export-taxonomy";
import {
  buildCsvFromRows, buildJsonExport, buildMarkdownTable,
  buildYamlExport, buildPromptDatabaseExport, buildSoundMetadataExport,
  buildUsageReport, applyExportFilters,
  PROMPT_DB_COLUMNS, SOUND_METADATA_COLUMNS, USAGE_REPORT_COLUMNS,
} from "@/lib/sfx/export-builders";
import { ExportSourceSelector } from "./ExportSourceSelector";
import { ExportFilterPanel } from "./ExportFilterPanel";
import { ExportFormatSelector } from "./ExportFormatSelector";
import { ExportPreviewTable } from "./ExportPreviewTable";
import { CueSheetExporter } from "./CueSheetExporter";
import { AgentMarkdownExporter } from "./AgentMarkdownExporter";
import { DawHandoffExporter } from "./DawHandoffExporter";
import { GameAudioExporter } from "./GameAudioExporter";
import { PackExporter } from "./PackExporter";
import { BackupExporter } from "./BackupExporter";
import { ExportJobHistory } from "./ExportJobHistory";
import { QaCheckerPanel } from "./QaCheckerPanel";
import { MetadataExporter } from "./MetadataExporter";
import { SoundBriefGenerator } from "./SoundBriefGenerator";

/* ── Helpers ─────────────────────────────────────────────────── */

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Page ────────────────────────────────────────────────────── */

export default function ExportCenterPage() {
  const [activeTab, setActiveTab] = useState<ExportTab>("prompt_database");
  const [source, setSource] = useState<ExportSourceType>("full_workspace");
  const [scope, setScope] = useState<ExportScope>("all");
  const [projectId, setProjectId] = useState("");
  const [filter, setFilter] = useState<ExportFilter>(defaultExportFilter());
  const [format, setFormat] = useState<ExportDataFormat>("csv");

  // Data — fetched from API
  const [cards, setCards] = useState<Record<string, unknown>[]>([]);
  const [generations, setGenerations] = useState<Record<string, unknown>[]>([]);
  const [usageEvents, setUsageEvents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [qaEnabled, setQaEnabled] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [cardsRes, gensRes, usageRes] = await Promise.allSettled([
          fetch("/api/cards").then((r) => r.json()),
          fetch("/api/generations").then((r) => r.json()),
          fetch("/api/usage").then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (cardsRes.status === "fulfilled") setCards(cardsRes.value.cards ?? cardsRes.value.results ?? []);
        if (gensRes.status === "fulfilled") setGenerations(gensRes.value.generations ?? gensRes.value.rows ?? gensRes.value.results ?? []);
        if (usageRes.status === "fulfilled") setUsageEvents(usageRes.value.events ?? usageRes.value.results ?? []);
      } catch {
        // Errors are non-fatal for the export page
      }
      setLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Build rows based on active tab
  const { rows, columns } = useMemo(() => {
    switch (activeTab) {
      case "prompt_database": {
        const raw = buildPromptDatabaseExport(cards);
        return { rows: applyExportFilters(raw, filter), columns: PROMPT_DB_COLUMNS };
      }
      case "metadata": {
        const raw = buildSoundMetadataExport(generations);
        return { rows: applyExportFilters(raw, filter), columns: SOUND_METADATA_COLUMNS };
      }
      case "usage_reports": {
        const raw = buildUsageReport(usageEvents);
        return { rows: applyExportFilters(raw, filter), columns: USAGE_REPORT_COLUMNS };
      }
      default:
        return { rows: [] as Record<string, unknown>[], columns: [] as string[] };
    }
  }, [activeTab, cards, generations, usageEvents, filter]);

  // Export handler for basic tabs
  const handleBasicExport = useCallback(() => {
    if (rows.length === 0) return;

    const tabLabel = EXPORT_TABS.find((t) => t.id === activeTab)?.label ?? "export";
    const ts = new Date().toISOString().slice(0, 10);
    let content: string;
    let ext: string;
    let mime: string;

    switch (format) {
      case "csv":
        content = buildCsvFromRows(rows, columns);
        ext = "csv"; mime = "text/csv"; break;
      case "json":
        content = buildJsonExport({ type: activeTab, exported_at: new Date().toISOString(), data: rows });
        ext = "json"; mime = "application/json"; break;
      case "markdown":
        content = `# ${tabLabel}\n\nExported: ${ts}\n\n${buildMarkdownTable(rows, columns)}`;
        ext = "md"; mime = "text/markdown"; break;
      case "yaml":
        content = buildYamlExport({ type: activeTab, data: rows });
        ext = "yaml"; mime = "text/yaml"; break;
      default:
        content = buildCsvFromRows(rows, columns);
        ext = "txt"; mime = "text/plain";
    }

    downloadFile(content, `algophony_studio_${activeTab}_${ts}.${ext}`, mime);
  }, [rows, columns, format, activeTab]);

  // Tab-specific content
  const isBasicTab = ["prompt_database", "metadata", "usage_reports"].includes(activeTab);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 rounded-xl border border-atlas-border-subtle bg-atlas-surface-hover/50 p-1">
        {EXPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
              activeTab === tab.id
                ? "bg-atlas-surface text-atlas-accent shadow-xs"
                : "text-atlas-text-muted hover:text-atlas-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <span key={i} className="waveform-bar" />)}</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Shared panels for basic tabs */}
          {isBasicTab && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ExportSourceSelector
                  source={source} scope={scope} projectId={projectId}
                  onSourceChange={setSource} onScopeChange={setScope} onProjectChange={setProjectId}
                />
                <ExportFormatSelector format={format} onChange={setFormat} />
              </div>

              <ExportFilterPanel filter={filter} onChange={setFilter} />
              <ExportPreviewTable columns={columns} rows={rows} totalCount={rows.length} />

              <button onClick={handleBasicExport} disabled={rows.length === 0}
                className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Export {rows.length} rows ({format.toUpperCase()})
              </button>
            </div>
          )}

          {/* Cue Sheet */}
          {activeTab === "cue_sheet" && (
            <div className="space-y-4">
              <ExportFilterPanel filter={filter} onChange={setFilter} />
              <ExportFormatSelector format={format} onChange={setFormat} available={["csv", "json", "markdown"]} />
              <CueSheetExporter cards={applyExportFilters(cards, filter)} format={format} />
            </div>
          )}

          {/* Agent / Markdown */}
          {activeTab === "agent_markdown" && (
            <AgentMarkdownExporter cards={cards} generations={generations} usageEvents={usageEvents} />
          )}

          {/* DAW Handoff */}
          {activeTab === "daw_handoff" && (
            <DawHandoffExporter cards={cards} generations={generations} />
          )}

          {/* Game Audio */}
          {activeTab === "game_audio" && (
            <GameAudioExporter cards={cards} generations={generations} />
          )}

          {/* Packs */}
          {activeTab === "packs" && (
            <PackExporter cards={cards} generations={generations} />
          )}

          {/* Backup */}
          {activeTab === "backup" && (
            <BackupExporter cards={cards} generations={generations} usageEvents={usageEvents} />
          )}

          {/* History */}
          {activeTab === "history" && (
            <ExportJobHistory />
          )}

          {/* Pro Metadata */}
          {activeTab === "pro_metadata" && (
            <MetadataExporter generations={generations} />
          )}

          {/* Sound Brief */}
          {activeTab === "brief" && (
            <SoundBriefGenerator />
          )}

          {/* QA */}
          {activeTab === "qa" && (
            <QaCheckerPanel generations={generations} enabled={qaEnabled} onToggle={setQaEnabled} />
          )}

          {/* QA gate on all export tabs (optional) */}
          {isBasicTab && qaEnabled && (
            <div className="mt-4">
              <QaCheckerPanel generations={generations} enabled={qaEnabled} onToggle={setQaEnabled} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
