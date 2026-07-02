"use client";

import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreservationSettings, PreservationStrength, LockableAttribute } from "@/lib/sfx/variation-taxonomy";
import { LOCKABLE_ATTRIBUTES, LOCKABLE_ATTRIBUTE_LABELS, PRESERVATION_STRENGTHS } from "@/lib/sfx/variation-taxonomy";

interface PreservationLockPanelProps {
  preservation: PreservationSettings;
  onChange: (preservation: PreservationSettings) => void;
}

const STRENGTH_DESCRIPTIONS: Record<PreservationStrength, string> = {
  loose: "Wide variation, new adjectives, category drift allowed",
  medium: "Core source/action/material preserved, secondary details mutate",
  strict: "Subtle micro-variations only: timing, intensity, texture, transient",
};

export function PreservationLockPanel({ preservation, onChange }: PreservationLockPanelProps) {
  const toggleLock = (attr: LockableAttribute) => {
    const locked = preservation.locked.includes(attr)
      ? preservation.locked.filter((a) => a !== attr)
      : [...preservation.locked, attr];
    onChange({ ...preservation, locked });
  };

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Lock className="h-3 w-3" />
        Preservation Settings
      </span>

      {/* Strength selector */}
      <div className="space-y-1.5">
        <span className="text-xs text-atlas-text-dim">Preservation Strength</span>
        <div className="flex gap-1">
          {PRESERVATION_STRENGTHS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...preservation, strength: s })}
              className={cn(
                "flex-1 rounded-xl py-1.5 text-xs font-medium transition-all border capitalize",
                preservation.strength === s
                  ? "bg-atlas-accent-muted border-atlas-accent text-atlas-accent"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[8px] text-atlas-text-dim/70">{STRENGTH_DESCRIPTIONS[preservation.strength]}</p>
      </div>

      {/* Attribute lock grid */}
      <div className="space-y-1.5">
        <span className="text-xs text-atlas-text-dim">Locked Attributes ({preservation.locked.length}/{LOCKABLE_ATTRIBUTES.length})</span>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
          {LOCKABLE_ATTRIBUTES.map((attr) => {
            const isLocked = preservation.locked.includes(attr);
            return (
              <button
                key={attr}
                onClick={() => toggleLock(attr)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all border",
                  isLocked
                    ? "bg-atlas-accent-muted/50 border-atlas-accent/40 text-atlas-accent"
                    : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border hover:text-atlas-text-muted"
                )}
              >
                {isLocked ? (
                  <Lock className="h-2.5 w-2.5 shrink-0" />
                ) : (
                  <Unlock className="h-2.5 w-2.5 shrink-0 opacity-40" />
                )}
                <span className="truncate">{LOCKABLE_ATTRIBUTE_LABELS[attr]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange({ ...preservation, locked: [...LOCKABLE_ATTRIBUTES] })}
          className="rounded-lg border border-atlas-border-subtle px-2 py-1 text-[8px] text-atlas-text-dim hover:text-atlas-accent transition-colors"
        >
          Lock All
        </button>
        <button
          onClick={() => onChange({ ...preservation, locked: ["category", "modelId", "outputFormat", "exclusions"] })}
          className="rounded-lg border border-atlas-border-subtle px-2 py-1 text-[8px] text-atlas-text-dim hover:text-atlas-accent transition-colors"
        >
          Minimal
        </button>
        <button
          onClick={() => onChange({ ...preservation, locked: [] })}
          className="rounded-lg border border-atlas-border-subtle px-2 py-1 text-[8px] text-atlas-text-dim hover:text-atlas-accent transition-colors"
        >
          Unlock All
        </button>
      </div>
    </div>
  );
}
