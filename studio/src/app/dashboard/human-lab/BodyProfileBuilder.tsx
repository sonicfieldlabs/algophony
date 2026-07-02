"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BodyProfile } from "@/lib/sfx/human-taxonomy";
import {
  AGE_IMPRESSIONS, BODY_SIZES, GENDER_PRESENTATIONS,
  ENERGY_LEVELS, PHYSICAL_CONDITIONS, BREATH_STATES,
} from "@/lib/sfx/human-taxonomy";

interface BodyProfileBuilderProps {
  profile: BodyProfile;
  onChange: (p: BodyProfile) => void;
}

function ChipRow<T extends string>({ label, values, selected, onSelect }: {
  label: string; values: readonly T[]; selected: T; onSelect: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-atlas-text-dim">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button key={v} onClick={() => onSelect(v)} className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-medium border transition-all capitalize",
            selected === v
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
          )}>
            {v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BodyProfileBuilder({ profile, onChange }: BodyProfileBuilderProps) {
  const update = (patch: Partial<BodyProfile>) => onChange({ ...profile, ...patch });

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <User className="h-3 w-3" />
        Body / Character Profile
      </span>

      <ChipRow label="Age Impression" values={AGE_IMPRESSIONS} selected={profile.ageImpression} onSelect={(v) => update({ ageImpression: v })} />
      <ChipRow label="Body Size" values={BODY_SIZES} selected={profile.bodySize} onSelect={(v) => update({ bodySize: v })} />
      <ChipRow label="Gender Presentation" values={GENDER_PRESENTATIONS} selected={profile.genderPresentation} onSelect={(v) => update({ genderPresentation: v })} />
      <ChipRow label="Energy Level" values={ENERGY_LEVELS} selected={profile.energyLevel} onSelect={(v) => update({ energyLevel: v })} />
      <ChipRow label="Physical Condition" values={PHYSICAL_CONDITIONS} selected={profile.physicalCondition} onSelect={(v) => update({ physicalCondition: v })} />
      <ChipRow label="Breath State" values={BREATH_STATES} selected={profile.breathState} onSelect={(v) => update({ breathState: v })} />
    </div>
  );
}
