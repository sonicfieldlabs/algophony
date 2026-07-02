"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";
import { FADER_DEFINITIONS, type FaderDefinition } from "@/lib/sfx/ui-elements-prompt";

interface UIFaderBankProps {
  faders: Record<string, number>;
  onChange: (id: string, value: number) => void;
}

function FaderGroup({
  title,
  defs,
  faders,
  onChange,
  defaultOpen,
}: {
  title: string;
  defs: FaderDefinition[];
  faders: Record<string, number>;
  onChange: (id: string, value: number) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-2"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="space-y-3 animate-expand-down">
          {defs.map((def) => (
            <AtlasSlider
              key={def.id}
              label={def.label}
              value={faders[def.id] ?? def.defaultValue}
              onChange={(v) => onChange(def.id, v)}
              min={def.min}
              max={def.max}
              step={def.step}
              lowLabel={def.lowLabel}
              highLabel={def.highLabel}
              displayValue={
                def.id === "duration"
                  ? `${(faders[def.id] ?? def.defaultValue).toFixed(1)}s`
                  : (faders[def.id] ?? def.defaultValue).toFixed(2)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function UIFaderBank({ faders, onChange }: UIFaderBankProps) {
  const essential = FADER_DEFINITIONS.filter((f) => f.group === "essential");
  const advanced = FADER_DEFINITIONS.filter((f) => f.group === "advanced");

  return (
    <div className="space-y-5">
      <FaderGroup
        title="Sonic Controls"
        defs={essential}
        faders={faders}
        onChange={onChange}
        defaultOpen={true}
      />
      <FaderGroup
        title="Advanced"
        defs={advanced}
        faders={faders}
        onChange={onChange}
        defaultOpen={false}
      />
    </div>
  );
}
