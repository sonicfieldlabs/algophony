"use client";

import { Database, ChevronDown } from "lucide-react";
import {
  type ExportSourceType, type ExportScope,
  EXPORT_SOURCE_LABELS, EXPORT_SCOPE_LABELS,
} from "@/lib/sfx/export-taxonomy";

interface ExportSourceSelectorProps {
  source: ExportSourceType;
  scope: ExportScope;
  projectId: string;
  onSourceChange: (s: ExportSourceType) => void;
  onScopeChange: (s: ExportScope) => void;
  onProjectChange: (id: string) => void;
}

const SOURCE_KEYS = Object.keys(EXPORT_SOURCE_LABELS) as ExportSourceType[];
const SCOPE_KEYS = Object.keys(EXPORT_SCOPE_LABELS) as ExportScope[];

export function ExportSourceSelector({
  source, scope, projectId,
  onSourceChange, onScopeChange, onProjectChange,
}: ExportSourceSelectorProps) {
  return (
    <div className="atlas-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-atlas-accent" />
        <h3 className="text-sm font-semibold text-atlas-text">Export Source</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Source type */}
        <div>
          <label className="text-xs text-atlas-text-dim mb-1 block">Source Type</label>
          <div className="relative">
            <select
              value={source}
              onChange={(e) => onSourceChange(e.target.value as ExportSourceType)}
              className="w-full appearance-none rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text pr-8 focus:border-atlas-accent focus:outline-none"
            >
              {SOURCE_KEYS.map((k) => (
                <option key={k} value={k}>{EXPORT_SOURCE_LABELS[k]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-atlas-text-dim pointer-events-none" />
          </div>
        </div>

        {/* Scope */}
        <div>
          <label className="text-xs text-atlas-text-dim mb-1 block">Scope</label>
          <div className="relative">
            <select
              value={scope}
              onChange={(e) => onScopeChange(e.target.value as ExportScope)}
              className="w-full appearance-none rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text pr-8 focus:border-atlas-accent focus:outline-none"
            >
              {SCOPE_KEYS.map((k) => (
                <option key={k} value={k}>{EXPORT_SCOPE_LABELS[k]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-atlas-text-dim pointer-events-none" />
          </div>
        </div>

        {/* Project selector — shown when source involves a project */}
        {(source === "single_project" || source === "selected_projects") && (
          <div>
            <label className="text-xs text-atlas-text-dim mb-1 block">Project ID</label>
            <input
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
              placeholder="Enter project ID..."
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
