"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Car, Bike, Truck, Bus, Plane, PlaneTakeoff, Rocket, Ship, Bot, Gamepad2,
  Zap, Flame, Cog, CircuitBoard, Waves, Anchor, Fan, Orbit, Hexagon, Shield, CircleDot, Container,
  Loader2, Play, Pause, Download, Send, Dices, Layers, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { useSfxAudio } from "@/lib/hooks/use-sfx-audio";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";
import {
  VEHICLE_CLASS_DEFS, VEHICLE_GROUPS, ENGINE_FAMILIES, ENGINE_FAMILY_LABELS,
  VEHICLE_SIZES, VEHICLE_CONDITIONS, PERSPECTIVES, ENVIRONMENTS, VEHICLE_REALISMS,
  ARTICULATION_LABELS, BRAKE_POINTS, TIRE_FOCUSES, VELOCITY_LAYERS, VELOCITY_LAYER_LABELS,
  articulationsFor, getVehicleClassDef, defaultVehicleConfig,
  isBrakeArticulation, isTireArticulation,
} from "@/lib/sfx/vehicle-taxonomy";
import type {
  VehicleConfig, VehicleClass, VehicleItem,
  VelocityLayerPlan, BrakePoint, TireFocus, VelocityLayer,
} from "@/lib/sfx/vehicle-taxonomy";
import {
  buildVehiclePrompt, buildVelocityLayerPlan, buildTirePass, buildBrakePass,
  estimateVehicleCost,
} from "@/lib/sfx/vehicle-prompt";
import { fetchSfxWithRetry } from "@/lib/sfx/generate-with-retry";

const ICONS: Record<string, React.ElementType> = {
  Car, Bike, Truck, Bus, Plane, PlaneTakeoff, Rocket, Ship, Bot, Gamepad2,
  Zap, Flame, Cog, CircuitBoard, Waves, Anchor, Fan, Orbit, Hexagon, Shield, CircleDot, Container,
};

// ── Page ─────────────────────────────────────────────────────

export default function VehiclePage() {
  const toast = useToast();
  const [config, setConfig] = useState<VehicleConfig>(defaultVehicleConfig());
  const [group, setGroup] = useState<typeof VEHICLE_GROUPS[number]["id"]>("ground");
  const [customOverride, setCustomOverride] = useState("");
  const [duration, setDuration] = useState(2);
  const [promptInfluence, setPromptInfluence] = useState(0.5);
  const [results, setResults] = useState<VehicleItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeVelocitySet, setIncludeVelocitySet] = useState(false);
  const [selectedLayers, setSelectedLayers] = useState<VelocityLayer[]>(["idle", "low", "mid", "high"]);
  const [includeTirePass, setIncludeTirePass] = useState(false);
  const [includeBrakePass, setIncludeBrakePass] = useState(false);

  const allowedArticulations = useMemo(
    () => articulationsFor(config.vehicleClass),
    [config.vehicleClass]
  );

  const visibleClasses = VEHICLE_CLASS_DEFS.filter((d) => d.group === group);

  const composedPrompt = useMemo(() => {
    if (customOverride.trim()) return customOverride.trim();
    return buildVehiclePrompt(config);
  }, [config, customOverride]);

  const velocityPlan = useMemo<VelocityLayerPlan[]>(() => {
    if (!includeVelocitySet) return [];
    const all = buildVelocityLayerPlan(config);
    return all.filter((p) => selectedLayers.includes(p.layer));
  }, [config, includeVelocitySet, selectedLayers]);

  const tirePass = useMemo(
    () => includeTirePass ? buildTirePass(config) : [],
    [includeTirePass, config]
  );

  const brakePass = useMemo(
    () => includeBrakePass ? buildBrakePass(config) : [],
    [includeBrakePass, config]
  );

  const totalCost = estimateVehicleCost(1 + velocityPlan.length + tirePass.length + brakePass.length);

  // Helpers
  const update = useCallback((patch: Partial<VehicleConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const switchClass = useCallback((cls: VehicleClass) => {
    const def = getVehicleClassDef(cls);
    const articulations = articulationsFor(cls);
    setConfig((prev) => ({
      ...prev,
      vehicleClass: cls,
      engineFamily: def.defaultEngine,
      articulation: articulations.includes(prev.articulation) ? prev.articulation : articulations[0],
    }));
  }, []);

  const sfxFetch = useCallback((text: string) => fetchSfxWithRetry({
    text,
    duration_seconds: duration,
    loop: false,
    prompt_influence: promptInfluence,
    model_id: "eleven_text_to_sound_v2",
    output_format: "mp3_44100_128",
  }), [duration, promptInfluence]);

  const generateOne = useCallback(async (
    item: VehicleItem
  ): Promise<VehicleItem> => {
    try {
      const res = await sfxFetch(item.composedPrompt);
      const data = await res.json();
      if (res.ok && data.audioUrl) {
        return { ...item, status: "generated", audioUrl: data.audioUrl, generationId: data.generationId };
      }
      return { ...item, status: "failed", errorMessage: data.error };
    } catch {
      return { ...item, status: "failed", errorMessage: "Network error" };
    }
  }, [sfxFetch]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    // Build the queue
    const baseId = `vehicle-${Date.now()}`;
    const queue: VehicleItem[] = [
      {
        id: `${baseId}-main`,
        config,
        articulation: config.articulation,
        composedPrompt,
        takeNumber: results.length + 1,
        status: "queued",
        filename: `${config.vehicleClass}_${config.articulation}`,
      },
      ...velocityPlan.map<VehicleItem>((plan) => ({
        id: `${baseId}-${plan.layer}`,
        config,
        articulation: "cruise",
        velocityLayer: plan.layer,
        composedPrompt: plan.prompt,
        takeNumber: results.length + 1,
        status: "queued",
        filename: plan.filename,
      })),
      ...tirePass.map<VehicleItem>((plan) => ({
        id: `${baseId}-tire-${plan.focus}`,
        config: { ...config, tireFocus: plan.focus },
        articulation: plan.articulation,
        composedPrompt: plan.prompt,
        takeNumber: results.length + 1,
        status: "queued",
        filename: plan.filename,
      })),
      ...brakePass.map<VehicleItem>((plan) => ({
        id: `${baseId}-brake-${plan.point}`,
        config: { ...config, brakePoint: plan.point },
        articulation: plan.articulation,
        composedPrompt: plan.prompt,
        takeNumber: results.length + 1,
        status: "queued",
        filename: plan.filename,
      })),
    ];

    setResults((prev) => [...queue, ...prev]);

    let failures = 0;
    for (const item of queue) {
      setResults((prev) => prev.map((r) => r.id === item.id ? { ...r, status: "generating" } : r));
      const updated = await generateOne(item);
      if (updated.status === "failed") failures++;
      setResults((prev) => prev.map((r) => r.id === item.id ? updated : r));
    }

    if (failures > 0) {
      toast.error(`Vehicle generation finished with ${failures} failure${failures > 1 ? "s" : ""}`);
    } else {
      toast.success("Vehicle generation complete");
    }
    setIsGenerating(false);
  }, [config, composedPrompt, velocityPlan, tirePass, brakePass, results.length, generateOne, toast]);

  // Playback (shared hook, auto-pauses on unmount)
  const { playingKey, play } = useSfxAudio();

  const articulationIsBrake = isBrakeArticulation(config.articulation);
  const articulationIsTire = isTireArticulation(config.articulation);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 pt-2 animate-fade-in">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Vehicle class — icon-led grid, group toggle on the right. */}
          <div className="atlas-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
                <Rocket className="h-3 w-3" /> Vehicle Class
              </span>
              <div className="flex rounded-lg overflow-hidden border border-atlas-border">
                {VEHICLE_GROUPS.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => setGroup(g.id)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-medium transition-colors",
                      i > 0 && "border-l border-atlas-border",
                      group === g.id
                        ? "bg-atlas-accent text-white"
                        : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {visibleClasses.map((c) => {
                const Icon = ICONS[c.icon] ?? Car;
                const active = config.vehicleClass === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => switchClass(c.id)}
                    title={c.label}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border py-2 px-1 transition-all",
                      active
                        ? "border-atlas-accent bg-atlas-accent-muted"
                        : "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
                    )}
                  >
                    <Icon
                      className="h-6 w-6 shrink-0"
                      strokeWidth={1.5}
                      style={{ color: active ? `hsl(${c.hue}, 55%, 50%)` : undefined }}
                    />
                    <span className={cn("text-[11px] font-medium leading-tight w-full text-center", active ? "text-atlas-accent" : "text-atlas-text-muted")}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Engine + base attributes */}
          <div className="atlas-card p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Engine & Body</span>
            <ChipRow label="Engine Family" values={ENGINE_FAMILIES} selected={config.engineFamily} onSelect={(v) => update({ engineFamily: v })} labelMap={ENGINE_FAMILY_LABELS} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChipRow label="Size" values={VEHICLE_SIZES} selected={config.size} onSelect={(v) => update({ size: v })} />
              <ChipRow label="Condition" values={VEHICLE_CONDITIONS} selected={config.condition} onSelect={(v) => update({ condition: v })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChipRow label="Perspective" values={PERSPECTIVES} selected={config.perspective} onSelect={(v) => update({ perspective: v })} />
              <ChipRow label="Environment" values={ENVIRONMENTS} selected={config.environment} onSelect={(v) => update({ environment: v })} />
            </div>
            <ChipRow label="Realism" values={VEHICLE_REALISMS} selected={config.realism} onSelect={(v) => update({ realism: v })} />
          </div>

          {/* Articulation */}
          <div className="atlas-card p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Articulation
            </span>
            <div className="flex flex-wrap gap-1">
              {allowedArticulations.map((a) => (
                <button
                  key={a}
                  onClick={() => update({ articulation: a })}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs border transition-all",
                    config.articulation === a
                      ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                      : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
                  )}
                >
                  {ARTICULATION_LABELS[a]}
                </button>
              ))}
            </div>

            {articulationIsBrake && (
              <ChipRow<BrakePoint>
                label="Brake-system focus"
                values={BRAKE_POINTS}
                selected={config.brakePoint ?? "pad_squeal"}
                onSelect={(v) => update({ brakePoint: v })}
              />
            )}
            {articulationIsTire && (
              <ChipRow<TireFocus>
                label="Tire focus"
                values={TIRE_FOCUSES}
                selected={config.tireFocus ?? "squeal_friction"}
                onSelect={(v) => update({ tireFocus: v })}
              />
            )}

            <DescriptorsInput
              values={config.descriptors}
              onChange={(descriptors) => update({ descriptors })}
            />
            <p className="text-[10px] text-atlas-text-dim">Press Enter to add a chip — commas inside a descriptor are preserved.</p>
          </div>

          {/* Velocity layer set (game audio) */}
          <div className="atlas-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
                <Layers className="h-3 w-3" /> Velocity-Layer Set
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={includeVelocitySet}
                  onChange={(e) => setIncludeVelocitySet(e.target.checked)}
                  className="accent-atlas-accent"
                />
                <span className="text-xs text-atlas-text">{includeVelocitySet ? "Active" : "Off"}</span>
              </label>
            </div>
            {includeVelocitySet && (
              <>
                <p className="text-xs text-atlas-text-dim">
                  Generates a set of loopable, steady-state engine stems at multiple RPM bands — ready for
                  RTPC-style crossfading in game audio middleware.
                </p>
                <div className="flex flex-wrap gap-1">
                  {VELOCITY_LAYERS.map((l) => {
                    const active = selectedLayers.includes(l);
                    return (
                      <button
                        key={l}
                        onClick={() => setSelectedLayers((prev) => active ? prev.filter((x) => x !== l) : [...prev, l])}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs border transition-all",
                          active
                            ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                            : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
                        )}
                      >
                        {VELOCITY_LAYER_LABELS[l]}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-2 max-h-40 overflow-y-auto space-y-1">
                  {selectedLayers.length === 0 && (
                    <span className="text-xs text-atlas-text-dim">Select at least one layer.</span>
                  )}
                  {selectedLayers.map((l) => (
                    <div key={l} className="text-[10px] font-mono text-atlas-text-dim truncate">
                      <span className="text-atlas-accent uppercase mr-2">{l}</span>
                      {config.vehicleClass}_{config.engineFamily}_{l}.mp3
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bundle workflows — Tire close-up + Full brake-system passes */}
          <div className="atlas-card p-4 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
              <Layers className="h-3 w-3" /> Bundle Workflows
            </span>

            <BundleToggle
              title="Tire close-up pass"
              description="Generates one coordinated stem per tire focus (rolling, squeal, gravel, wet, snow, burnout, drift, deflated, gravel spray)."
              count={tirePass.length}
              fallbackCount={9}
              enabled={includeTirePass}
              disabled={isGenerating}
              onToggle={setIncludeTirePass}
              plan={tirePass.map((p) => ({ key: p.focus, filename: p.filename }))}
            />

            <BundleToggle
              title="Full brake-system pass"
              description="Generates one stem per brake-system point (pad squeal, disc grind, drum groan, regen whine, abs pulsing, handbrake lever, release hiss)."
              count={brakePass.length}
              fallbackCount={7}
              enabled={includeBrakePass}
              disabled={isGenerating}
              onToggle={setIncludeBrakePass}
              plan={brakePass.map((p) => ({ key: p.point, filename: p.filename }))}
            />
          </div>
        </div>

        {/* Right column — same layout as /generate sidebar. */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          <div className="atlas-card p-4">
            <textarea
              value={customOverride || composedPrompt}
              onChange={(e) => setCustomOverride(e.target.value)}
              rows={5}
              placeholder="Describe the vehicle sound you want to generate..."
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
              data-no-transition
            />
            <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
              <span className={cn("tabular-nums", (customOverride || composedPrompt).length > 450 ? "text-atlas-danger font-medium" : "")}>
                {(customOverride || composedPrompt).length} chars
              </span>
              {customOverride && (
                <button onClick={() => setCustomOverride("")} className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors" title="Reset to auto-composed">
                  ↺
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (includeVelocitySet && selectedLayers.length === 0)}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
              isGenerating || (includeVelocitySet && selectedLayers.length === 0)
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
            )}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <span className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="waveform-bar" />
                  ))}
                </span>
                Generating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Play className="h-4 w-4" /> Generate {totalCost > 1 ? `(${totalCost} stems)` : ""} · {totalCost}cr
              </span>
            )}
          </button>

          <div className="atlas-card p-3 space-y-3">
            <AtlasSlider
              label="Duration" value={duration} onChange={setDuration}
              min={0.5} max={20} step={0.5}
              displayValue={`${duration}s`} lowLabel="0.5s" highLabel="20s"
            />
            <AtlasSlider
              label="Prompt Influence" value={promptInfluence} onChange={setPromptInfluence}
              min={0} max={1} step={0.05}
              displayValue={promptInfluence.toFixed(2)}
              lowLabel="Creative" highLabel="Precise"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="atlas-card p-4 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
            Results · {results.filter((r) => r.status === "generated").length}
          </span>
          {results.map((r) => (
            <div key={r.id} className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 transition-all",
              r.status === "generated" ? "border-atlas-success/20 bg-atlas-success/5" :
              r.status === "failed" ? "border-atlas-danger/20 bg-atlas-danger/5" :
              "border-atlas-border-subtle"
            )}>
              {r.audioUrl && (
                <button onClick={() => play(`result:${r.id}`, r.audioUrl)} className="shrink-0">
                  {playingKey === `result:${r.id}` ? <Pause className="h-4 w-4 text-atlas-accent" /> : <Play className="h-4 w-4 text-atlas-text-dim hover:text-atlas-accent" />}
                </button>
              )}
              {r.status === "generating" && <Loader2 className="h-4 w-4 text-atlas-accent animate-spin shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-atlas-text">{getVehicleClassDef(r.config.vehicleClass).label}</span>
                  <span className="text-xs text-atlas-text-dim px-1 py-0.5 rounded bg-atlas-surface">
                    {r.velocityLayer ? VELOCITY_LAYER_LABELS[r.velocityLayer] : ARTICULATION_LABELS[r.articulation]}
                  </span>
                </div>
                <p className="text-xs text-atlas-text-dim truncate font-mono">
                  {r.filename ? `${r.filename}.mp3 · ` : ""}{r.composedPrompt.slice(0, 80)}…
                </p>
              </div>
              {r.status === "generated" && r.audioUrl && (
                <div className="flex gap-1 shrink-0">
                  <SendButtons prompt={r.composedPrompt} audioUrl={r.audioUrl} />
                  <a href={r.audioUrl} download={r.filename ? `${r.filename}.mp3` : undefined} className="text-atlas-text-dim hover:text-atlas-accent p-0.5">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reusable bits ────────────────────────────────────────────

function ChipRow<T extends string>({
  label, values, selected, onSelect, labelMap,
}: {
  label: string;
  values: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-atlas-text-dim">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onSelect(v)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs border transition-all capitalize",
              selected === v
                ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
            )}
          >
            {labelMap?.[v] ?? v.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

function BundleToggle({
  title, description, count, fallbackCount, enabled, disabled, onToggle, plan,
}: {
  title: string;
  description: string;
  count: number;
  fallbackCount: number;
  enabled: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  plan: { key: string; filename: string }[];
}) {
  return (
    <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-atlas-text">{title}</span>
            <span className="text-[10px] text-atlas-text-dim tabular-nums">
              {enabled ? count : fallbackCount} stems
            </span>
          </div>
          <p className="text-[11px] text-atlas-text-dim leading-relaxed">{description}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)}
            disabled={disabled}
            className="accent-atlas-accent"
          />
          <span className="text-xs text-atlas-text">{enabled ? "On" : "Off"}</span>
        </label>
      </div>
      {enabled && plan.length > 0 && (
        <div className="rounded-lg border border-atlas-border-subtle bg-atlas-surface p-2 max-h-32 overflow-y-auto space-y-0.5">
          {plan.map((p) => (
            <div key={p.key} className="text-[10px] font-mono text-atlas-text-dim truncate">
              <span className="text-atlas-accent uppercase mr-2">{p.key.replace(/_/g, " ")}</span>
              {p.filename}.mp3
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DescriptorsInput({
  values, onChange,
}: { values: string[]; onChange: (next: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (values.includes(v)) { setInput(""); return; }
    onChange([...values, v]);
    setInput("");
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div className="space-y-1">
      <span className="text-xs text-atlas-text-dim">Free-text descriptors</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => remove(v)}
            className="rounded-full bg-atlas-accent-muted text-atlas-accent text-xs px-2 py-0.5 hover:bg-atlas-accent-muted/80"
            title="Remove descriptor"
          >
            {v} ×
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          placeholder="add descriptor — e.g. dry sump rumble"
          className="flex-1 rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
        />
        <button
          onClick={add}
          className="rounded-lg border border-atlas-border-subtle px-2 text-xs text-atlas-text-dim hover:text-atlas-accent"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SendButtons({ prompt, audioUrl }: { prompt: string; audioUrl?: string }) {
  const send = (target: "stacker" | "variation-lab") => {
    const key = target === "stacker" ? "algophony-studio-stacker-import" : "algophony-studio-variation-import";
    localStorage.setItem(key, JSON.stringify({ module: "vehicle", promptText: prompt, audioUrl }));
    window.open(`/dashboard/${target}`, "_blank");
  };
  return (
    <>
      <button onClick={() => send("stacker")} title="Send to Stacker" className="text-atlas-text-dim hover:text-atlas-accent p-0.5">
        <Send className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => send("variation-lab")} title="Send to Variation Lab" className="text-atlas-text-dim hover:text-atlas-accent p-0.5">
        <Dices className="h-3.5 w-3.5" />
      </button>
    </>
  );
}
