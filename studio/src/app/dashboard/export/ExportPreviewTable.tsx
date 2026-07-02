"use client";

import { Table } from "lucide-react";

interface ExportPreviewTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  maxPreview?: number;
}

export function ExportPreviewTable({ columns, rows, totalCount, maxPreview = 10 }: ExportPreviewTableProps) {
  const preview = rows.slice(0, maxPreview);

  return (
    <div className="atlas-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Preview</h3>
        </div>
        <span className="text-xs text-atlas-text-dim">
          {totalCount} row{totalCount !== 1 ? "s" : ""}
          {totalCount > maxPreview && ` (showing first ${maxPreview})`}
        </span>
      </div>

      {preview.length === 0 ? (
        <div className="text-center py-6 text-xs text-atlas-text-muted">
          No data matches current filters
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full text-xs">
            <thead className="bg-atlas-surface">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-atlas-text-dim font-medium whitespace-nowrap border-b border-atlas-border-subtle">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-atlas-border-subtle last:border-0 hover:bg-atlas-surface-hover/50">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 text-atlas-text-muted max-w-[200px] truncate whitespace-nowrap">
                      {String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
