"use client";

import { useState, useMemo } from "react";
import { Database, Download, Eye, ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  METADATA_FIELDS, METADATA_EXPORT_FORMATS,
  exportMetadata,
  extractMetadataRow,
  type MetadataField, type MetadataExportFormat,
} from "@/lib/sfx/metadata-export";

interface MetadataExporterProps {
  generations: Record<string, unknown>[];
}

const FORMAT_ICONS: Record<MetadataExportFormat, string> = {
  csv: "📊",
  json: "{ }",
  bwf: "📻",
  ixml: "🏷️",
  soundminer: "🔊",
  ucs: "📁",
  game_manifest: "🎮",
  daw_cue_sheet: "🎵",
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function MetadataExporter({ generations }: MetadataExporterProps) {
  const [format, setFormat] = useState<MetadataExportFormat>("csv");
  const [selectedFields, setSelectedFields] = useState<Set<MetadataField>>(
    new Set(METADATA_EXPORT_FORMATS[0].fields)
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  const formatDef = METADATA_EXPORT_FORMATS.find((f) => f.id === format)!;

  // Preview data
  const previewRows = useMemo(
    () => generations.slice(0, 5).map(extractMetadataRow),
    [generations]
  );

  const previewContent = useMemo(() => {
    if (!showPreview) return "";
    const result = exportMetadata(generations.slice(0, 10), format, [...selectedFields]);
    return result.content.slice(0, 3000);
  }, [generations, format, selectedFields, showPreview]);

  const handleExport = () => {
    const result = exportMetadata(generations, format, [...selectedFields]);
    downloadFile(result.content, result.filename, result.mimeType);
  };

  const toggleField = (field: MetadataField) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  };

  const selectFormatDefaults = (fmt: MetadataExportFormat) => {
    setFormat(fmt);
    const def = METADATA_EXPORT_FORMATS.find((f) => f.id === fmt);
    if (def) setSelectedFields(new Set(def.fields));
  };

  // Field groups for organized display
  const FIELD_GROUPS = [
    { label: "Identity", fields: ["filename", "generation_id", "request_id", "prompt_card_id", "project_id"] as MetadataField[] },
    { label: "Content", fields: ["description", "prompt", "category", "subcategory", "material", "action", "space", "mood"] as MetadataField[] },
    { label: "Structure", fields: ["project", "scene", "cue", "take", "variation", "layer_role"] as MetadataField[] },
    { label: "Technical", fields: ["duration", "loopable", "output_format", "model", "prompt_influence"] as MetadataField[] },
    { label: "Status", fields: ["usage_status", "user_verdict", "generation_date", "credit_cost", "character_cost"] as MetadataField[] },
  ];

  return (
    <div className="space-y-4">
      {/* Format selector */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Metadata Export</h3>
          <span className="text-xs text-atlas-text-dim ml-auto">{generations.length} assets</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METADATA_EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => selectFormatDefaults(fmt.id)}
              className={cn(
                "flex flex-col items-start rounded-xl p-3 text-left transition-all border",
                format === fmt.id
                  ? "border-atlas-accent bg-atlas-accent/5"
                  : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{FORMAT_ICONS[fmt.id]}</span>
                <span className={cn("text-xs font-semibold", format === fmt.id ? "text-atlas-accent" : "text-atlas-text")}>{fmt.label}</span>
              </div>
              <p className="text-xs text-atlas-text-dim leading-tight">{fmt.description}</p>
              <span className="mt-1.5 text-xs text-atlas-text-dim rounded bg-atlas-surface-hover px-1 py-0.5">
                .{fmt.extension}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Field selector */}
      <div className="atlas-card overflow-hidden">
        <button
          onClick={() => setShowFieldSelector(!showFieldSelector)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-atlas-surface-hover/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-atlas-text">Fields</span>
            <span className="text-xs text-atlas-text-dim">{selectedFields.size}/{METADATA_FIELDS.length} selected</span>
          </div>
          {showFieldSelector ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-dim" />}
        </button>

        {showFieldSelector && (
          <div className="border-t border-atlas-border-subtle px-4 py-3 space-y-3">
            {/* Quick actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFields(new Set(METADATA_FIELDS))}
                className="text-xs text-atlas-accent hover:underline"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedFields(new Set())}
                className="text-xs text-atlas-text-dim hover:text-atlas-text"
              >
                Clear All
              </button>
              <button
                onClick={() => setSelectedFields(new Set(formatDef.fields))}
                className="text-xs text-atlas-text-dim hover:text-atlas-text"
              >
                Format Default
              </button>
            </div>

            {FIELD_GROUPS.map((group) => (
              <div key={group.label}>
                <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">{group.label}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {group.fields.map((field) => (
                    <button
                      key={field}
                      onClick={() => toggleField(field)}
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all border",
                        selectedFields.has(field)
                          ? "bg-atlas-accent/10 border-atlas-accent/30 text-atlas-accent"
                          : "bg-atlas-surface border-atlas-border-subtle text-atlas-text-muted hover:text-atlas-text"
                      )}
                    >
                      {selectedFields.has(field) && <Check className="h-2.5 w-2.5" />}
                      {field.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="atlas-card overflow-hidden">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-atlas-surface-hover/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-atlas-accent" />
              <span className="text-xs font-semibold text-atlas-text">Preview</span>
            </div>
            {showPreview ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-dim" />}
          </button>

          {showPreview && (
            <div className="border-t border-atlas-border-subtle p-4">
              {/* Table preview for CSV-like formats */}
              {(format === "csv" || format === "bwf" || format === "ucs" || format === "daw_cue_sheet" || format === "soundminer") && (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-atlas-border-subtle">
                        {[...selectedFields].slice(0, 8).map((field) => (
                          <th key={field} className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-atlas-text-dim whitespace-nowrap">
                            {field.replace(/_/g, " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-atlas-border-subtle/50">
                          {[...selectedFields].slice(0, 8).map((field) => (
                            <td key={field} className="px-2 py-1.5 text-xs text-atlas-text-muted max-w-[200px] truncate">
                              {row[field] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedFields.size > 8 && (
                    <p className="text-xs text-atlas-text-dim mt-2">+{selectedFields.size - 8} more fields</p>
                  )}
                </div>
              )}

              {/* Raw preview for structured formats */}
              {(format === "json" || format === "ixml" || format === "game_manifest") && previewContent && (
                <pre className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-3 text-xs text-atlas-text-muted overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                  {previewContent}
                  {previewContent.length >= 3000 && "\n\n... (truncated)"}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={generations.length === 0 || selectedFields.size === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-3 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all hover:shadow-lg hover:shadow-atlas-accent/20 disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Export {generations.length} assets as {formatDef.label} (.{formatDef.extension})
      </button>
    </div>
  );
}
