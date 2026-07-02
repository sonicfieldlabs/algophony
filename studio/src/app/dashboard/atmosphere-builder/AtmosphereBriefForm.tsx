"use client";

import { useState } from "react";
import { MapPin, Clock, Cloud, Heart, BookOpen, Sparkles, ChevronDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AtmosphereBrief,
  TIMES_OF_DAY,
  WEATHER_OPTIONS,
  PRESENCE_LEVELS,
  REALISM_LEVELS,
  DENSITY_LEVELS,
  DRAMATIC_AXES,
} from "@/lib/sfx/atmosphere-taxonomy";

/* ── Extracted static components (must live outside render) ── */

function InputLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="h-3 w-3 text-atlas-text-dim" />
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</span>
    </div>
  );
}

function PillSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-medium capitalize transition-all border",
            value === opt
              ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
              : "border-atlas-border-subtle bg-atlas-surface text-atlas-text-dim hover:border-atlas-border"
          )}
        >
          {opt.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}

/* ── Main form ───────────────────────────────────────────────── */

interface AtmosphereBriefFormProps {
  brief: AtmosphereBrief;
  onChange: (brief: AtmosphereBrief) => void;
  onDecompose: () => void;
  isDecomposing?: boolean;
}

export function AtmosphereBriefForm({
  brief,
  onChange,
  onDecompose,
  isDecomposing,
}: AtmosphereBriefFormProps) {
  const [showDramatic, setShowDramatic] = useState(false);
  const [newAvoid, setNewAvoid] = useState("");

  const update = (field: keyof AtmosphereBrief, value: unknown) => {
    onChange({ ...brief, [field]: value });
  };

  const addAvoidedSound = () => {
    if (newAvoid.trim() && !brief.avoidedSounds.includes(newAvoid.trim())) {
      update("avoidedSounds", [...brief.avoidedSounds, newAvoid.trim()]);
      setNewAvoid("");
    }
  };

  const removeAvoidedSound = (s: string) => {
    update("avoidedSounds", brief.avoidedSounds.filter((a) => a !== s));
  };

  return (
    <div className="atlas-card p-4 space-y-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
        Atmosphere Brief
      </span>

      {/* Row 1 — Title + Scene */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <InputLabel icon={Sparkles} label="Title" />
          <input
            value={brief.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Humid Hidden Forest, Neon Rainfall..."
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>
        <div>
          <InputLabel icon={MapPin} label="Scene / Place" />
          <input
            value={brief.scene}
            onChange={(e) => update("scene", e.target.value)}
            placeholder="Tropical forest, abandoned warehouse, busy market..."
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>
      </div>

      {/* Row 2 — Location + Time + Weather */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <InputLabel icon={MapPin} label="Location" />
          <input
            value={brief.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Dense jungle, city rooftop..."
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>
        <div>
          <InputLabel icon={Clock} label="Time of Day" />
          <PillSelector options={TIMES_OF_DAY} value={brief.timeOfDay} onChange={(v) => update("timeOfDay", v)} />
        </div>
        <div>
          <InputLabel icon={Cloud} label="Weather" />
          <PillSelector options={WEATHER_OPTIONS} value={brief.weather as typeof WEATHER_OPTIONS[number]} onChange={(v) => update("weather", v)} />
        </div>
      </div>

      {/* Row 3 — Emotion + Narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <InputLabel icon={Heart} label="Emotional Tone" />
          <input
            value={brief.emotionalTone}
            onChange={(e) => update("emotionalTone", e.target.value)}
            placeholder="Tense but beautiful, serene, unsettling..."
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>
        <div>
          <InputLabel icon={BookOpen} label="Narrative Function" />
          <input
            value={brief.narrativeFunction}
            onChange={(e) => update("narrativeFunction", e.target.value)}
            placeholder="Hidden presence, slow dread, nostalgic calm..."
            className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>
      </div>

      {/* Row 4 — Realism + Density */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <InputLabel icon={Sparkles} label="Realism Level" />
          <PillSelector options={REALISM_LEVELS} value={brief.realismLevel} onChange={(v) => update("realismLevel", v)} />
        </div>
        <div>
          <InputLabel icon={Sparkles} label="Density" />
          <PillSelector options={DENSITY_LEVELS} value={brief.density} onChange={(v) => update("density", v)} />
        </div>
      </div>

      {/* Row 5 — Presence Levels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["humanPresence", "animalPresence", "machinePresence", "syntheticPresence"] as const).map((field) => (
          <div key={field}>
            <InputLabel icon={Sparkles} label={field.replace("Presence", "").replace(/([A-Z])/g, " $1").trim()} />
            <PillSelector
              options={PRESENCE_LEVELS}
              value={brief[field]}
              onChange={(v) => update(field, v)}
            />
          </div>
        ))}
      </div>

      {/* Row 6 — Avoided Sounds */}
      <div>
        <InputLabel icon={X} label="Avoided Sounds" />
        <div className="flex gap-2 mb-1">
          <input
            value={newAvoid}
            onChange={(e) => setNewAvoid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAvoidedSound()}
            placeholder="music, cartoon jungle, loud cicadas..."
            className="flex-1 rounded-xl border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
          <button
            onClick={addAvoidedSound}
            className="rounded-xl border border-atlas-border px-2 py-1 text-atlas-text-dim hover:border-atlas-accent hover:text-atlas-accent transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {brief.avoidedSounds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {brief.avoidedSounds.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs text-red-600 [data-theme=dark]:border-red-900/30 [data-theme=dark]:bg-red-950/20 [data-theme=dark]:text-red-400"
              >
                {s}
                <button onClick={() => removeAvoidedSound(s)} className="hover:text-red-800">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dramatic Axes (collapsible) */}
      <div>
        <button
          onClick={() => setShowDramatic(!showDramatic)}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-atlas-text-dim"
        >
          Dramatic Axes
          <ChevronDown className={cn("h-3 w-3 transition-transform", showDramatic && "rotate-180")} />
        </button>
        {showDramatic && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2 animate-expand-down">
            {DRAMATIC_AXES.map((axis) => (
              <div key={axis.id} className="flex items-center gap-2">
                <span className="text-xs text-atlas-text-dim w-14 shrink-0 text-right">{axis.lowLabel}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={brief.dramaticValues[axis.id] ?? axis.defaultValue}
                  onChange={(e) => {
                    const newValues = { ...brief.dramaticValues, [axis.id]: parseFloat(e.target.value) };
                    update("dramaticValues", newValues);
                  }}
                  className="flex-1 h-1 accent-atlas-accent"
                />
                <span className="text-xs text-atlas-text-dim w-14 shrink-0">{axis.highLabel}</span>
                <span className="text-xs text-atlas-text-dim tabular-nums w-6">
                  {(brief.dramaticValues[axis.id] ?? axis.defaultValue).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decompose Button */}
      <button
        onClick={onDecompose}
        disabled={isDecomposing || (!brief.scene && !brief.location)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-atlas-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-atlas-accent-hover hover:shadow-md hover:shadow-atlas-accent/20 disabled:opacity-50 active:scale-[0.99]"
      >
        <Sparkles className="h-4 w-4" />
        Decompose Atmosphere
      </button>
    </div>
  );
}
