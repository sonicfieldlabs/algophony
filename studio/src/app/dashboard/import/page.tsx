"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, ArrowRight, Loader2, Film, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineImportPanel } from "./TimelineImportPanel";
import { SystemTemplatePicker } from "./SystemTemplatePicker";
import Papa from "papaparse";
import { suggestMappings, mapRowsToCards, MAPPABLE_FIELDS } from "@/lib/sfx/metadata-map";
import { composePrompt } from "@/lib/sfx/compose-prompt";
import type { SfxPromptAttributes } from "@/lib/sfx/prompt-schema";
import type { FieldMapping, CsvRow } from "@/lib/sfx/metadata-map";

export default function ImportPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [previewCards, setPreviewCards] = useState<Array<Partial<SfxPromptAttributes>>>([]);
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [importTab, setImportTab] = useState<"csv" | "timeline" | "templates">("csv");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB cap — anything larger is almost certainly an accident.
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setMessage(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    // 2000-row cap — protects underpowered devices from OOM on big libraries.
    const MAX_ROWS = 2000;

    setMessage(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          setMessage("No headers detected. Is this a valid CSV with a header row?");
          return;
        }
        let rows = results.data;
        if (rows.length === 0) {
          setMessage("CSV parsed but contains no data rows.");
          return;
        }
        let truncated = false;
        if (rows.length > MAX_ROWS) {
          rows = rows.slice(0, MAX_ROWS);
          truncated = true;
        }
        const parseErrors = results.errors ?? [];
        if (parseErrors.length > 0) {
          console.warn("[CSV] non-fatal parse warnings:", parseErrors.slice(0, 5));
        }
        setCsvHeaders(headers);
        setCsvRows(rows);
        setMapping(suggestMappings(headers));
        setStep("map");
        if (truncated) {
          setMessage(`Loaded first ${MAX_ROWS} rows (file had more).`);
        } else if (parseErrors.length > 0) {
          setMessage(`Loaded ${rows.length} rows with ${parseErrors.length} parse warning(s).`);
        }
      },
      error: (err) => {
        console.error("[CSV] parse failed:", err);
        setMessage(`Couldn't parse CSV: ${err.message}`);
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  };

  const handlePreview = () => {
    const cards = mapRowsToCards(csvRows, mapping);
    setPreviewCards(cards);
    setStep("preview");
  };

  const handleCommit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const rows = previewCards.map((card) => ({
        filename: "",
        description: composePrompt({
          category: card.category || "Foley",
          loop: card.loop ?? false,
          promptInfluence: card.promptInfluence ?? 0.3,
          modelId: "eleven_text_to_sound_v2",
          exclusions: card.exclusions ?? [],
          ...card,
        }),
        category: card.category || "Foley",
        subcategory: card.subcategory || "",
        action: card.action || "",
        material: card.material || "",
        surface: card.surface || "",
        environment: card.environment || "",
        perspective: card.perspective || "",
      }));

      const res = await fetch("/api/metadata/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          rows,
          headers: csvHeaders,
          fileName: "metadata-import.csv",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMessage(data.message || "Import saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Tab Switcher */}
      <div className="mb-6 flex gap-1 rounded-lg bg-atlas-surface-hover/50 p-1">
        <button
          onClick={() => setImportTab("csv")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
            importTab === "csv"
              ? "bg-atlas-surface text-atlas-accent shadow-xs"
              : "text-atlas-text-muted hover:text-atlas-text"
          )}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Metadata CSV
        </button>
        <button
          onClick={() => setImportTab("timeline")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
            importTab === "timeline"
              ? "bg-atlas-surface text-atlas-accent shadow-xs"
              : "text-atlas-text-muted hover:text-atlas-text"
          )}
        >
          <Film className="h-4 w-4" />
          Timeline / Spotting
        </button>
        <button
          onClick={() => setImportTab("templates")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
            importTab === "templates"
              ? "bg-atlas-surface text-atlas-accent shadow-xs"
              : "text-atlas-text-muted hover:text-atlas-text"
          )}
        >
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </button>
      </div>

      {/* Timeline Tab */}
      {importTab === "timeline" && (
        <TimelineImportPanel hasFullImportAccess={true} />
      )}

      {/* Templates Tab */}
      {importTab === "templates" && (
        <SystemTemplatePicker onApply={(payload, template) => {
          // Store template payload for Stacker to pick up
          if (typeof window !== "undefined") {
            localStorage.setItem("algophony-studio-template-import", JSON.stringify(payload));
          }
          setMessage(`Template "${template.name}" applied! Go to Stacker to see your prompt cards.`);
        }} />
      )}

      {/* CSV Tab */}
      {importTab === "csv" && (
        <>

      {message && (
        <div className="mb-4 rounded-lg border border-atlas-border-subtle bg-atlas-surface px-4 py-2 text-sm text-atlas-text-muted">
          {message}
        </div>
      )}

      {/* Steps indicator */}
      <div className="mb-6 flex items-center gap-4 text-sm">
        {["Upload", "Map Fields", "Preview"].map((label, i) => {
          const stepIdx = ["upload", "map", "preview"].indexOf(step);
          return (
            <div
              key={label}
              className={`flex items-center gap-2 ${
                i <= stepIdx ? "text-atlas-accent" : "text-atlas-text-dim"
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i <= stepIdx ? "bg-atlas-accent text-white" : "bg-atlas-surface text-atlas-text-dim"
              }`}>
                {i + 1}
              </span>
              {label}
              {i < 2 && <ArrowRight className="h-3 w-3 text-atlas-text-dim" />}
            </div>
          );
        })}
      </div>

      {step === "upload" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-atlas-border bg-atlas-surface p-16">
          <FileSpreadsheet className="mb-4 h-10 w-10 text-atlas-text-dim" />
          <p className="mb-4 text-sm text-atlas-text-muted">
            Drop a CSV file or click to upload
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover"
          >
            <Upload className="h-4 w-4" />
            Choose CSV File
          </button>
        </div>
      )}

      {step === "map" && (
        <div>
          <p className="mb-4 text-sm text-atlas-text-muted">
            {csvRows.length} rows found. Map CSV columns to Algophony Studio fields.
          </p>
          <div className="mb-6 overflow-hidden rounded-xl border border-atlas-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-atlas-border bg-atlas-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
                    CSV Column
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
                    Maps To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
                    Sample Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atlas-border-subtle">
                {csvHeaders.map((header) => (
                  <tr key={header} className="bg-atlas-bg">
                    <td className="px-4 py-3 font-mono text-xs text-atlas-text">
                      {header}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping[header] || "skip"}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [header]: e.target.value as typeof mapping[string] }))
                        }
                        className="rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                      >
                        <option value="skip">Skip</option>
                        {MAPPABLE_FIELDS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-atlas-text-dim">
                      {csvRows[0]?.[header]?.substring(0, 50) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover"
          >
            Preview Mapped Cards
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "preview" && (
        <div>
          <p className="mb-4 text-sm text-atlas-text-muted">
            {previewCards.length} cards ready
          </p>
          <div className="mb-6 space-y-2">
            {previewCards.slice(0, 10).map((card, i) => {
              const fullCard: SfxPromptAttributes = {
                category: card.category || "Foley",
                loop: card.loop ?? false,
                promptInfluence: card.promptInfluence ?? 0.3,
                modelId: "eleven_text_to_sound_v2",
                exclusions: card.exclusions ?? [],
                ...card,
              };
              return (
                <div key={i} className="rounded-lg border border-atlas-border bg-atlas-surface p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-md bg-atlas-bg px-2 py-0.5 text-xs text-atlas-text-dim">
                      {fullCard.category}
                    </span>
                    {fullCard.sourceObject && (
                      <span className="text-sm text-atlas-text">{fullCard.sourceObject}</span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-atlas-text-muted">
                    {composePrompt(fullCard)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("map")}
              className="rounded-lg border border-atlas-border px-4 py-2.5 text-sm font-medium text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text"
            >
              Back to Mapping
            </button>
            <button
              onClick={handleCommit}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {saving ? "Saving..." : "Save All Cards"}
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
