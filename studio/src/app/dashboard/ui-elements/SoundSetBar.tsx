"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UISoundSet } from "@/lib/sfx/ui-elements-taxonomy";
import { INTERFACE_TYPES, BRAND_STYLES } from "@/lib/sfx/ui-elements-taxonomy";

interface SoundSetBarProps {
  soundSets: UISoundSet[];
  activeSetId: string | null;
  onSelectSet: (id: string | null) => void;
  onCreateSet: (set: Omit<UISoundSet, "id" | "items" | "createdAt" | "updatedAt">) => void;
}

export function SoundSetBar({
  soundSets,
  activeSetId,
  onSelectSet,
  onCreateSet,
}: SoundSetBarProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [interfaceType, setInterfaceType] = useState("");
  const [sonicStyle, setSonicStyle] = useState("");

  const activeSet = soundSets.find((s) => s.id === activeSetId);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateSet({
      name: name.trim(),
      brandDescription: brandDescription.trim(),
      interfaceType,
      visualStyle: "",
      sonicStyle,
      defaultExclusions: ["no music", "no dialogue"],
    });
    setName("");
    setBrandDescription("");
    setInterfaceType("");
    setSonicStyle("");
    setCreating(false);
  };

  return (
    <div className="atlas-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
          Sound Set
        </span>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1 text-xs text-atlas-accent hover:text-atlas-accent-hover transition-colors"
        >
          {creating ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {creating ? "Cancel" : "New Set"}
        </button>
      </div>

      {/* Set selector */}
      {!creating && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => onSelectSet(null)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
              activeSetId === null
                ? "bg-atlas-accent-muted text-atlas-accent ring-1 ring-atlas-accent/30"
                : "bg-atlas-surface text-atlas-text-dim border border-atlas-border-subtle hover:text-atlas-text-muted"
            )}
          >
            No Set
          </button>
          {soundSets.map((set) => (
            <button
              key={set.id}
              onClick={() => onSelectSet(set.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                activeSetId === set.id
                  ? "bg-atlas-accent-muted text-atlas-accent ring-1 ring-atlas-accent/30"
                  : "bg-atlas-surface text-atlas-text-dim border border-atlas-border-subtle hover:text-atlas-text-muted"
              )}
            >
              {set.name}
              <span className="text-xs text-atlas-text-dim ml-1.5">
                {set.items.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active set info */}
      {activeSet && !creating && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-atlas-text-dim">
          {activeSet.interfaceType && (
            <span className="rounded-full bg-atlas-surface-hover px-2 py-0.5">
              {activeSet.interfaceType}
            </span>
          )}
          {activeSet.sonicStyle && (
            <span className="rounded-full bg-atlas-surface-hover px-2 py-0.5">
              {activeSet.sonicStyle}
            </span>
          )}
          {activeSet.brandDescription && (
            <span className="truncate max-w-48">{activeSet.brandDescription}</span>
          )}
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="space-y-3 animate-expand-down">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sound set name..."
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
          <input
            value={brandDescription}
            onChange={(e) => setBrandDescription(e.target.value)}
            placeholder="Brand description (e.g. Premium wellness app)..."
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-atlas-text-dim mb-0.5 block">Interface Type</label>
              <select
                value={interfaceType}
                onChange={(e) => setInterfaceType(e.target.value)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text"
              >
                <option value="">Select...</option>
                {INTERFACE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-atlas-text-dim mb-0.5 block">Sonic Style</label>
              <select
                value={sonicStyle}
                onChange={(e) => setSonicStyle(e.target.value)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text"
              >
                <option value="">Select...</option>
                {BRAND_STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full rounded-lg bg-atlas-accent px-3 py-2 text-xs font-medium text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-50"
          >
            Create Sound Set
          </button>
        </div>
      )}
    </div>
  );
}
