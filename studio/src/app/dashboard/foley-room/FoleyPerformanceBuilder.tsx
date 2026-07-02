"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PerformerSettings, CategoryFields,
  FootstepFields, ClothFields, DoorFields,
} from "@/lib/sfx/foley-taxonomy";
import {
  PERFORMER_WEIGHTS, GESTURE_SPEEDS, CONTACT_FORCES,
  MOVEMENT_INTENTIONS, SYNC_LOOSENESS, REALISM_LEVELS, REALISM_LABELS,
  SHOE_TYPES, SHOE_TYPE_LABELS, STEP_TYPES, STEP_TYPE_LABELS, FOOT_SIDES,
  CLOTH_TYPES, CLOTH_TYPE_LABELS, FABRIC_WEIGHTS,
} from "@/lib/sfx/foley-taxonomy";

interface FoleyPerformanceBuilderProps {
  performer: PerformerSettings;
  categoryFields: CategoryFields;
  onPerformerChange: (p: PerformerSettings) => void;
  onCategoryFieldsChange: (f: CategoryFields) => void;
}

function ChipRow<T extends string>({ label, values, selected, onSelect, labelMap }: {
  label: string; values: readonly T[]; selected: T;
  onSelect: (v: T) => void; labelMap?: Record<T, string>;
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
            {labelMap?.[v] ?? v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FoleyPerformanceBuilder({
  performer, categoryFields, onPerformerChange, onCategoryFieldsChange,
}: FoleyPerformanceBuilderProps) {
  const updatePerf = (patch: Partial<PerformerSettings>) => onPerformerChange({ ...performer, ...patch });

  const updateFootstep = (patch: Partial<FootstepFields>) => {
    if (categoryFields.category !== "footsteps") return;
    onCategoryFieldsChange({ category: "footsteps", fields: { ...categoryFields.fields as FootstepFields, ...patch } });
  };
  const updateCloth = (patch: Partial<ClothFields>) => {
    if (categoryFields.category !== "cloth") return;
    onCategoryFieldsChange({ category: "cloth", fields: { ...categoryFields.fields as ClothFields, ...patch } });
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <User className="h-3 w-3" />
        Performance
      </span>

      {/* Grid layout for shared controls — 2 cols on wider screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        <ChipRow label="Weight" values={PERFORMER_WEIGHTS} selected={performer.weight} onSelect={(v) => updatePerf({ weight: v })} />
        <ChipRow label="Speed" values={GESTURE_SPEEDS} selected={performer.gestureSpeed} onSelect={(v) => updatePerf({ gestureSpeed: v })} />
        <ChipRow label="Force" values={CONTACT_FORCES} selected={performer.contactForce} onSelect={(v) => updatePerf({ contactForce: v })} />
        <ChipRow label="Intention" values={MOVEMENT_INTENTIONS} selected={performer.movementIntention} onSelect={(v) => updatePerf({ movementIntention: v })} />
        <ChipRow label="Sync" values={SYNC_LOOSENESS} selected={performer.syncLooseness} onSelect={(v) => updatePerf({ syncLooseness: v })} />
        <ChipRow label="Realism" values={REALISM_LEVELS} selected={performer.realism} onSelect={(v) => updatePerf({ realism: v })} labelMap={REALISM_LABELS} />
      </div>

      {/* Category-specific controls */}
      {categoryFields.category === "footsteps" && (
        <div className="border-t border-atlas-border-subtle pt-3 space-y-2.5">
          <span className="text-xs text-atlas-accent font-semibold uppercase tracking-wide">Footstep Controls</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            <ChipRow label="Shoe" values={SHOE_TYPES} selected={(categoryFields.fields as FootstepFields).shoeType} onSelect={(v) => updateFootstep({ shoeType: v })} labelMap={SHOE_TYPE_LABELS} />
            <ChipRow label="Step" values={STEP_TYPES} selected={(categoryFields.fields as FootstepFields).stepType} onSelect={(v) => updateFootstep({ stepType: v })} labelMap={STEP_TYPE_LABELS} />
            <ChipRow label="Foot" values={FOOT_SIDES} selected={(categoryFields.fields as FootstepFields).footSide} onSelect={(v) => updateFootstep({ footSide: v })} />
            <ChipRow label="Stride" values={["short", "normal", "long"] as const} selected={(categoryFields.fields as FootstepFields).strideLength} onSelect={(v) => updateFootstep({ strideLength: v })} />
          </div>
        </div>
      )}

      {categoryFields.category === "cloth" && (
        <div className="border-t border-atlas-border-subtle pt-3 space-y-2.5">
          <span className="text-xs text-atlas-accent font-semibold uppercase tracking-wide">Cloth Controls</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            <ChipRow label="Type" values={CLOTH_TYPES} selected={(categoryFields.fields as ClothFields).clothType} onSelect={(v) => updateCloth({ clothType: v })} labelMap={CLOTH_TYPE_LABELS} />
            <ChipRow label="Fabric" values={FABRIC_WEIGHTS} selected={(categoryFields.fields as ClothFields).fabricWeight} onSelect={(v) => updateCloth({ fabricWeight: v })} />
            <ChipRow label="Moisture" values={["dry", "wet"] as const} selected={(categoryFields.fields as ClothFields).dryWet} onSelect={(v) => updateCloth({ dryWet: v })} />
            <ChipRow label="Fit" values={["tight", "normal", "loose"] as const} selected={(categoryFields.fields as ClothFields).tightLoose} onSelect={(v) => updateCloth({ tightLoose: v })} />
          </div>
        </div>
      )}

      {categoryFields.category === "doors" && (
        <div className="border-t border-atlas-border-subtle pt-3 space-y-2.5">
          <span className="text-xs text-atlas-accent font-semibold uppercase tracking-wide">Door Controls</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            <ChipRow label="Material" values={["wood", "metal", "glass", "plastic"] as const} selected={(categoryFields.fields as DoorFields).doorMaterial} onSelect={(v) => onCategoryFieldsChange({ category: "doors", fields: { ...(categoryFields.fields as DoorFields), doorMaterial: v } })} />
            <ChipRow label="Part" values={["handle", "hinge", "latch", "lock", "frame", "full_door"] as const} selected={(categoryFields.fields as DoorFields).component} onSelect={(v) => onCategoryFieldsChange({ category: "doors", fields: { ...(categoryFields.fields as DoorFields), component: v } })} />
          </div>
        </div>
      )}
    </div>
  );
}
