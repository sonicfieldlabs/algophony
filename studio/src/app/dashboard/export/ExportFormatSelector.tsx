"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ExportDataFormat, EXPORT_FORMAT_LABELS } from "@/lib/sfx/export-taxonomy";

interface ExportFormatSelectorProps {
  format: ExportDataFormat;
  onChange: (f: ExportDataFormat) => void;
  available?: ExportDataFormat[];
}

const ALL_FORMATS: ExportDataFormat[] = ["csv", "json", "markdown", "yaml", "txt"];

const FORMAT_ICONS: Record<ExportDataFormat, { hue: number }> = {
  csv: { hue: 160 },
  json: { hue: 40 },
  markdown: { hue: 240 },
  yaml: { hue: 280 },
  txt: { hue: 0 },
};

export function ExportFormatSelector({ format, onChange, available = ALL_FORMATS }: ExportFormatSelectorProps) {
  return (
    <div className="atlas-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-atlas-accent" />
        <h3 className="text-sm font-semibold text-atlas-text">Export Format</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {available.map((f) => {
          const { hue } = FORMAT_ICONS[f];
          const active = format === f;
          return (
            <button key={f} onClick={() => onChange(f)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-medium transition-all border",
                active
                  ? "border-atlas-accent/40 text-white"
                  : "border-atlas-border text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
              )}
              style={active ? { backgroundColor: `hsl(${hue}, 50%, 45%)` } : {}}
            >
              {EXPORT_FORMAT_LABELS[f]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
