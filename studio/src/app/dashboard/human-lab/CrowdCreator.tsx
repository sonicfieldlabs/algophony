"use client";

import { Users, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CrowdSettings } from "@/lib/sfx/human-taxonomy";
import {
  CROWD_SIZES, CROWD_SIZE_LABELS, CROWD_LANGUAGES,
  INTELLIGIBILITIES, CROWD_EMOTIONS, CROWD_LOCATIONS,
  CROWD_MOVEMENTS, CROWD_DENSITIES, CROWD_MODES,
} from "@/lib/sfx/human-taxonomy";
import type { ChantPlanItem, HybridCrowdLayer } from "@/lib/sfx/human-prompt";

interface CrowdCreatorProps {
  settings: CrowdSettings;
  onChange: (s: CrowdSettings) => void;
  chantPlan: ChantPlanItem[];
  hybridPlan: HybridCrowdLayer[];
}

function ChipRow<T extends string>({ label, values, selected, onSelect, labelMap }: {
  label: string; values: readonly T[]; selected: T; onSelect: (v: T) => void; labelMap?: Record<T, string>;
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
            {labelMap?.[v] ?? v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CrowdCreator({ settings, onChange, chantPlan, hybridPlan }: CrowdCreatorProps) {
  const update = (patch: Partial<CrowdSettings>) => onChange({ ...settings, ...patch });
  const [showPlan, setShowPlan] = useState(false);

  return (
    <div className="atlas-card p-4 space-y-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Users className="h-3 w-3" />
        Crowd Creator
      </span>

      {/* Crowd mode tabs */}
      <div className="flex gap-1">
        {CROWD_MODES.map((m) => (
          <button key={m} onClick={() => update({ crowdMode: m })} className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all capitalize",
            settings.crowdMode === m
              ? "border-atlas-accent bg-atlas-accent text-white"
              : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
          )}>
            {m === "bed" ? "🎙 Crowd Bed" : m === "chant" ? "📣 Chant Builder" : "🔀 Hybrid"}
          </button>
        ))}
      </div>

      {/* Crowd type */}
      <div className="space-y-1">
        <span className="text-xs text-atlas-text-dim">Crowd Type</span>
        <input
          value={settings.crowdType}
          onChange={(e) => update({ crowdType: e.target.value })}
          placeholder="busy street, stadium, market…"
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
        />
      </div>

      {/* Core crowd controls */}
      <ChipRow label="Crowd Size" values={CROWD_SIZES} selected={settings.crowdSize} onSelect={(v) => update({ crowdSize: v })} labelMap={CROWD_SIZE_LABELS} />
      <ChipRow label="Emotion" values={CROWD_EMOTIONS} selected={settings.crowdEmotion} onSelect={(v) => update({ crowdEmotion: v })} />
      <ChipRow label="Location" values={CROWD_LOCATIONS} selected={settings.location} onSelect={(v) => update({ location: v })} />
      <ChipRow label="Language" values={CROWD_LANGUAGES} selected={settings.language} onSelect={(v) => update({ language: v })} />
      <ChipRow label="Intelligibility" values={INTELLIGIBILITIES} selected={settings.intelligibility} onSelect={(v) => update({ intelligibility: v })} />
      <ChipRow label="Movement" values={CROWD_MOVEMENTS} selected={settings.movement} onSelect={(v) => update({ movement: v })} />
      <ChipRow label="Density" values={CROWD_DENSITIES} selected={settings.density} onSelect={(v) => update({ density: v })} />

      {/* Loopable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={settings.loopable} onChange={(e) => update({ loopable: e.target.checked })} className="rounded accent-atlas-accent" />
        <span className="text-xs text-atlas-text">Loopable</span>
      </label>

      {/* Chant-specific controls */}
      {(settings.crowdMode === "chant" || settings.crowdMode === "hybrid") && (
        <div className="border-t border-atlas-border-subtle pt-2 space-y-2">
          <span className="text-xs text-atlas-accent font-semibold">Chant Settings</span>
          <div className="space-y-1">
            <span className="text-xs text-atlas-text-dim">Chant Phrase</span>
            <input
              value={settings.chantPhrase}
              onChange={(e) => update({ chantPhrase: e.target.value })}
              placeholder="e.g. Vamos, Ole, Hey Hey…"
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-atlas-text-dim">Chant Layers</span>
            <input
              type="number" value={settings.chantLayerCount}
              onChange={(e) => update({ chantLayerCount: Math.max(1, Math.min(8, parseInt(e.target.value) || 3)) })}
              min={1} max={8}
              className="w-20 rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text tabular-nums focus:border-atlas-accent focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Plan preview */}
      {(settings.crowdMode === "chant" && chantPlan.length > 0) || (settings.crowdMode === "hybrid" && hybridPlan.length > 0) ? (
        <>
          <button onClick={() => setShowPlan(!showPlan)} className="flex w-full items-center justify-between text-xs text-atlas-text-dim">
            <span>Preview Plan ({settings.crowdMode === "chant" ? chantPlan.length : hybridPlan.length} layers)</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", showPlan && "rotate-180")} />
          </button>

          {showPlan && (
            <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1 rounded-xl border border-atlas-border-subtle bg-atlas-bg p-2">
              {settings.crowdMode === "chant" && chantPlan.map((item) => (
                <div key={item.index} className="flex items-center gap-2 text-xs font-mono text-atlas-text-dim">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    item.role === "leader" ? "bg-blue-400" : item.role === "response" ? "bg-green-400" : "bg-orange-400"
                  )} />
                  <span className="text-atlas-text">{item.filename}</span>
                  <span className="text-xs opacity-50 capitalize">{item.role}</span>
                </div>
              ))}
              {settings.crowdMode === "hybrid" && hybridPlan.map((layer) => (
                <div key={layer.index} className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span className="text-atlas-text font-medium">{layer.layerName}</span>
                    <span className="text-xs text-atlas-text-dim capitalize">{layer.engineMode}</span>
                  </div>
                  <p className="text-xs text-atlas-text-dim/60 pl-3.5 font-mono italic">{layer.dawNote}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
