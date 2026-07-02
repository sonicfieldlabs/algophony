"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AxisDomain } from "@/lib/sfx/variation-taxonomy";
import { VARIATION_AXES, AXIS_DOMAINS, AXIS_DOMAIN_LABELS } from "@/lib/sfx/variation-taxonomy";
import { useState } from "react";

interface VariationAxesPanelProps {
  selectedAxes: string[];
  onChange: (axes: string[]) => void;
}

export function VariationAxesPanel({ selectedAxes, onChange }: VariationAxesPanelProps) {
  const [activeDomain, setActiveDomain] = useState<AxisDomain>("general");

  const domainAxes = VARIATION_AXES.filter((a) => a.domain === activeDomain);

  const toggleAxis = (axisId: string) => {
    onChange(
      selectedAxes.includes(axisId)
        ? selectedAxes.filter((a) => a !== axisId)
        : [...selectedAxes, axisId]
    );
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <SlidersHorizontal className="h-3 w-3" />
          Variation Axes
        </span>
        <span className="text-xs text-atlas-accent tabular-nums">{selectedAxes.length} selected</span>
      </div>

      {/* Domain tabs */}
      <div className="flex gap-1">
        {AXIS_DOMAINS.map((d) => {
          const count = VARIATION_AXES.filter((a) => a.domain === d && selectedAxes.includes(a.id)).length;
          return (
            <button
              key={d}
              onClick={() => setActiveDomain(d)}
              className={cn(
                "flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition-all border",
                activeDomain === d
                  ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
              )}
            >
              {AXIS_DOMAIN_LABELS[d]}
              {count > 0 && (
                <span className="rounded-full bg-atlas-accent/20 px-1 text-[7px] tabular-nums text-atlas-accent">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Axes chips */}
      <div className="flex flex-wrap gap-1.5">
        {domainAxes.map((axis) => {
          const isSelected = selectedAxes.includes(axis.id);
          return (
            <button
              key={axis.id}
              onClick={() => toggleAxis(axis.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all border",
                isSelected
                  ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border hover:text-atlas-text-muted"
              )}
            >
              {axis.label}
            </button>
          );
        })}
      </div>

      {/* Quick select */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange([...new Set([...selectedAxes, ...domainAxes.map((a) => a.id)])])}
          className="rounded-lg border border-atlas-border-subtle px-2 py-0.5 text-[8px] text-atlas-text-dim hover:text-atlas-accent transition-colors"
        >
          All {AXIS_DOMAIN_LABELS[activeDomain]}
        </button>
        <button
          onClick={() => onChange(selectedAxes.filter((a) => !domainAxes.some((da) => da.id === a)))}
          className="rounded-lg border border-atlas-border-subtle px-2 py-0.5 text-[8px] text-atlas-text-dim hover:text-atlas-accent transition-colors"
        >
          Clear {AXIS_DOMAIN_LABELS[activeDomain]}
        </button>
      </div>
    </div>
  );
}
