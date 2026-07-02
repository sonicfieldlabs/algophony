"use client";

import { useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ExportFilter,
  STATUS_OPTIONS, CATEGORY_OPTIONS, VERDICT_OPTIONS,
} from "@/lib/sfx/export-taxonomy";

interface ExportFilterPanelProps {
  filter: ExportFilter;
  onChange: (f: ExportFilter) => void;
}

function PillGroup({ options, selected, onToggle, hue = 200 }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; hue?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} onClick={() => onToggle(opt)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-all capitalize",
              active
                ? "text-white"
                : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
            )}
            style={active ? { backgroundColor: `hsl(${hue}, 50%, 45%)` } : {}}
          >
            {opt.replace(/_/g, " ")}
          </button>
        );
      })}
    </div>
  );
}

export function ExportFilterPanel({ filter, onChange }: ExportFilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleArr = (key: keyof ExportFilter, val: string) => {
    const arr = filter[key] as string[];
    onChange({
      ...filter,
      [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
    });
  };

  return (
    <div className="atlas-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Filters</h3>
          {(filter.categories.length > 0 || filter.statuses.length > 0 || filter.verdicts.length > 0) && (
            <span className="rounded-full bg-atlas-accent-muted px-2 py-0.5 text-xs text-atlas-accent font-medium">
              {filter.categories.length + filter.statuses.length + filter.verdicts.length} active
            </span>
          )}
        </div>
        <button onClick={() => onChange({
          ...filter, categories: [], statuses: [], verdicts: [],
          durationMin: null, durationMax: null, dateFrom: null, dateTo: null,
        })} className="text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors">
          Clear all
        </button>
      </div>

      <div className="space-y-3">
        {/* Categories */}
        <div>
          <label className="text-xs text-atlas-text-dim mb-1.5 block">Categories</label>
          <PillGroup options={CATEGORY_OPTIONS} selected={filter.categories} onToggle={(v) => toggleArr("categories", v)} hue={200} />
        </div>

        {/* Statuses */}
        <div>
          <label className="text-xs text-atlas-text-dim mb-1.5 block">Status</label>
          <PillGroup options={STATUS_OPTIONS} selected={filter.statuses} onToggle={(v) => toggleArr("statuses", v)} hue={160} />
        </div>

        {/* Verdict */}
        <div>
          <label className="text-xs text-atlas-text-dim mb-1.5 block">Verdict</label>
          <PillGroup options={VERDICT_OPTIONS} selected={filter.verdicts} onToggle={(v) => toggleArr("verdicts", v)} hue={30} />
        </div>

        {/* Loop */}
        <div>
          <label className="text-xs text-atlas-text-dim mb-1.5 block">Loop</label>
          <div className="flex gap-1.5">
            {(["all", "loop", "non_loop"] as const).map((opt) => (
              <button key={opt} onClick={() => onChange({ ...filter, loop: opt })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all capitalize",
                  filter.loop === opt ? "bg-atlas-accent text-white" : "bg-atlas-surface-hover text-atlas-text-muted"
                )}
              >
                {opt.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Advanced Filters
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
            <div>
              <label className="text-xs text-atlas-text-dim mb-1 block">Duration Min (s)</label>
              <input type="number" value={filter.durationMin ?? ""} onChange={(e) => onChange({ ...filter, durationMin: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-atlas-text-dim mb-1 block">Duration Max (s)</label>
              <input type="number" value={filter.durationMax ?? ""} onChange={(e) => onChange({ ...filter, durationMax: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none" placeholder="30" />
            </div>
            <div>
              <label className="text-xs text-atlas-text-dim mb-1 block">From Date</label>
              <input type="date" value={filter.dateFrom ?? ""} onChange={(e) => onChange({ ...filter, dateFrom: e.target.value || null })}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-atlas-text-dim mb-1 block">To Date</label>
              <input type="date" value={filter.dateTo ?? ""} onChange={(e) => onChange({ ...filter, dateTo: e.target.value || null })}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
