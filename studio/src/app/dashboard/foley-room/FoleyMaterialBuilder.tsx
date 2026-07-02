"use client";

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaterialSettings } from "@/lib/sfx/foley-taxonomy";
import { SURFACES, SURFACE_CONDITIONS, WETNESS_LEVELS, FRICTION_LEVELS } from "@/lib/sfx/foley-taxonomy";

interface FoleyMaterialBuilderProps {
  material: MaterialSettings;
  onChange: (m: MaterialSettings) => void;
}

function ChipRow<T extends string>({ label, values, selected, onSelect }: {
  label: string; values: readonly T[]; selected: T; onSelect: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-atlas-text-dim uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button key={v} onClick={() => onSelect(v)} className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium border transition-all capitalize",
            selected === v
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
          )}>
            {v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FoleyMaterialBuilder({ material, onChange }: FoleyMaterialBuilderProps) {
  const update = (patch: Partial<MaterialSettings>) => onChange({ ...material, ...patch });

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Layers className="h-3 w-3" />
        Material & Surface
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        <ChipRow label="Surface" values={SURFACES} selected={material.surface} onSelect={(v) => update({ surface: v })} />
        <ChipRow label="Condition" values={SURFACE_CONDITIONS} selected={material.surfaceCondition} onSelect={(v) => update({ surfaceCondition: v })} />
        <ChipRow label="Wetness" values={WETNESS_LEVELS} selected={material.wetness} onSelect={(v) => update({ wetness: v })} />
        <ChipRow label="Friction" values={FRICTION_LEVELS} selected={material.friction} onSelect={(v) => update({ friction: v })} />
      </div>
    </div>
  );
}
