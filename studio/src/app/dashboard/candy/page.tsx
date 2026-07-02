"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Wind, Scissors, Radio, Hammer, Activity, Palette, Waves, Loader2,
  Play, Pause, Download, Send, Dices, Layers, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { useSfxAudio } from "@/lib/hooks/use-sfx-audio";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";
import {
  MISC_TAB_DEFS,
  PUSH_TYPES, PUSH_TYPE_LABELS, PUSH_MEDIUMS, PUSH_DIRECTIONS, PUSH_SPEEDS, PUSH_TAILS,
  ARTIFACT_TYPES, ARTIFACT_TYPE_LABELS, ARTIFACT_DENSITIES, ARTIFACT_PITCHES,
  NOISE_FLAVORS, NOISE_FLAVOR_LABELS, NOISE_USAGES, NOISE_DISTORTIONS, NOISE_BANDWIDTHS,
  NOISE_ENGINES, NOISE_ENGINE_LABELS, NOISE_ENGINE_HINTS,
  IMPACT_FAMILIES, IMPACT_FAMILY_LABELS, IMPACT_SIZES, COLLISION_TARGETS, IMPACT_SITUATIONS, IMPACT_TAILS,
  IMPACT_FAMILY_MATERIALS,
  REALISMS, MISC_DISTANCES,
  defaultPushSettings, defaultArtifactSettings, defaultNoiseSettings, defaultImpactSettings,
  PULSE_USE_CASES, PULSE_MOTION_TYPES, PULSE_MOTION_TYPE_LABELS,
  PULSE_TEMPO_IMPRESSIONS, PULSE_DENSITIES, PULSE_REGULARITIES,
  PULSE_MATERIALS, PULSE_SPECTRAL_WEIGHTS, PULSE_SPECTRAL_WEIGHT_LABELS, PULSE_EMOTIONS,
  defaultPulseSettings,
  TIMBRE_MATERIALS, TIMBRE_MATERIAL_LABELS, TIMBRE_COLORS, TIMBRE_GESTURES,
  TIMBRE_TEXTURES, TIMBRE_MOVEMENTS, TIMBRE_MOVEMENT_LABELS,
  TIMBRE_DENSITIES, TIMBRE_FUNCTIONS, TIMBRE_FUNCTION_LABELS,
  defaultTimbreSettings,
  TEXTURE_LAYER_TYPES, TEXTURE_PROMPT_SCAFFOLDS, TEXTURE_QUICK_SCAFFOLDS,
  defaultTextureSettings,
} from "@/lib/sfx/candy-taxonomy";
import type {
  MiscTab, PushSettings, ArtifactSettings, NoiseSettings, ImpactSettings,
  MiscItem, ImpactBandLayer,
  PulseSettings, TimbreSettings, TextureSettings,
} from "@/lib/sfx/candy-taxonomy";
import {
  buildPushPrompt, buildArtifactPrompt, buildNoisePrompt,
  buildNoiseMusicPrompt,
  buildImpactPrompt, buildImpactBandPrompts, estimateMiscCost,
  buildPulsePrompt, buildTimbrePrompt, checkMusicGuardrails,
} from "@/lib/sfx/candy-prompt";
import { fetchSfxWithRetry } from "@/lib/sfx/generate-with-retry";

const TAB_ICONS = { Wind, Scissors, Radio, Hammer, Activity, Palette, Waves } as const;

/** Is this tab a music-material tab (uses Music API)? */
const isMusicTab = (t: MiscTab) => t === "pulse" || t === "timbre" || t === "texture";

// ── Small UI primitives ──────────────────────────────────────

function Chip<T extends string>({
  value, selected, onSelect, children,
}: { value: T; selected: T; onSelect: (v: T) => void; children: React.ReactNode }) {
  const active = selected === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium border transition-all capitalize",
        active
          ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
          : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
      )}
    >
      {children}
    </button>
  );
}

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
          <Chip key={v} value={v} selected={selected} onSelect={onSelect}>
            {labelMap?.[v] ?? v.replace(/_/g, " ")}
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function MiscPage() {
  const toast = useToast();
  const [tab, setTab] = useState<MiscTab>("push");

  // Per-tab state
  const [push, setPush] = useState<PushSettings>(defaultPushSettings());
  const [artifact, setArtifact] = useState<ArtifactSettings>(defaultArtifactSettings());
  const [noise, setNoise] = useState<NoiseSettings>(defaultNoiseSettings());
  const [impact, setImpact] = useState<ImpactSettings>(defaultImpactSettings());
  const [pulse, setPulse] = useState<PulseSettings>(defaultPulseSettings());
  const [timbre, setTimbre] = useState<TimbreSettings>(defaultTimbreSettings());
  const [texture, setTexture] = useState<TextureSettings>(defaultTextureSettings());

  const [customOverride, setCustomOverride] = useState("");
  const [duration, setDuration] = useState(2);
  const [promptInfluence, setPromptInfluence] = useState(0.45);

  const [results, setResults] = useState<MiscItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Composed prompt for the active tab.
  const composedPrompt = useMemo(() => {
    if (customOverride.trim()) return customOverride.trim();
    switch (tab) {
      case "push":      return buildPushPrompt(push);
      case "artifacts": return buildArtifactPrompt(artifact);
      case "noise":
        return noise.engine === "music" ? buildNoiseMusicPrompt(noise) : buildNoisePrompt(noise);
      case "impact":    return buildImpactPrompt(impact);
      case "pulse":     return buildPulsePrompt(pulse);
      case "timbre":    return buildTimbrePrompt(timbre);
      case "texture":   return texture.prompt;
    }
  }, [tab, customOverride, push, artifact, noise, impact, pulse, timbre, texture]);

  // Guardrails for music tabs — checks the composed prompt for commercial-music patterns
  const guardrailWarnings = useMemo(
    () => isMusicTab(tab) ? checkMusicGuardrails(customOverride || composedPrompt) : [],
    [tab, customOverride, composedPrompt]
  );

  const bandPlan = useMemo(
    () => tab === "impact" ? buildImpactBandPrompts(impact) : [],
    [tab, impact]
  );

  const totalCost = estimateMiscCost(1, tab === "impact" && impact.layeredDesign ? bandPlan.length : 0);

  // Generation — single call with one Retry-After-aware retry on 429.
  const sfxFetch = useCallback((text: string) => fetchSfxWithRetry({
    text,
    duration_seconds: duration,
    loop: false,
    prompt_influence: promptInfluence,
    model_id: "eleven_text_to_sound_v2",
    output_format: "mp3_44100_128",
  }), [duration, promptInfluence]);

  /** Routes the main generation request based on tab + (for noise) engine choice. */
  const generateMain = useCallback(async (prompt: string): Promise<Response> => {
    // Music-material tabs → music-compose endpoint
    if (isMusicTab(tab)) {
      const durationMs = tab === "pulse" ? pulse.durationMs : tab === "texture" ? texture.durationMs : timbre.durationMs;
      const layerType = tab === "pulse" ? "motion_layer" : "texture_layer";
      return fetch("/api/elevenlabs/music-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          duration_ms: durationMs,
          instrumental: true,
          output_format: "mp3_44100_128",
          layerType,
        }),
      });
    }
    // Noise with music engine
    if (tab === "noise" && noise.engine === "music") {
      return fetch("/api/elevenlabs/music-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          duration_ms: noise.musicDurationMs,
          instrumental: true,
          output_format: "mp3_44100_128",
        }),
      });
    }
    return sfxFetch(prompt);
  }, [tab, noise.engine, noise.musicDurationMs, pulse.durationMs, timbre.durationMs, texture.durationMs, sfxFetch]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const itemId = `misc-${Date.now()}`;
    const takeNumber = results.length + 1;
    const baseSlug = `${tab}_take${String(takeNumber).padStart(2, "0")}`;
    const newItem: MiscItem = {
      id: itemId, tab, composedPrompt,
      takeNumber,
      status: "generating",
      filename: `${baseSlug}.mp3`,
      bandLayers: tab === "impact" && impact.layeredDesign
        ? bandPlan.map((b) => ({
            band: b.band,
            prompt: b.prompt,
            status: "queued",
            filename: `${baseSlug}_band-${b.band}.mp3`,
          }))
        : undefined,
    };
    setResults((prev) => [newItem, ...prev]);

    // Main generation
    try {
      const res = await generateMain(composedPrompt);
      const data = await res.json();
      if (res.ok && data.audioUrl) {
        setResults((prev) => prev.map((r) =>
          r.id === itemId
            ? { ...r, status: "generated" as const, audioUrl: data.audioUrl, generationId: data.generationId }
            : r));
      } else {
        setResults((prev) => prev.map((r) =>
          r.id === itemId ? { ...r, status: "failed" as const, errorMessage: data.error } : r));
        toast.error(data.error || "Generation failed");
        setIsGenerating(false);
        return;
      }
    } catch {
      setResults((prev) => prev.map((r) =>
        r.id === itemId ? { ...r, status: "failed" as const, errorMessage: "Network error" } : r));
      toast.error("Network error");
      setIsGenerating(false);
      return;
    }

    // Band layers (impact only)
    let bandFailures = 0;
    if (tab === "impact" && impact.layeredDesign && bandPlan.length > 0) {
      for (const band of bandPlan) {
        setResults((prev) => prev.map((r) =>
          r.id === itemId && r.bandLayers
            ? { ...r, bandLayers: r.bandLayers.map((b) => b.band === band.band ? { ...b, status: "generating" } : b) }
            : r));
        let bandFailed = false;
        try {
          const res = await sfxFetch(band.prompt);
          const data = await res.json();
          const ok = res.ok && !!data.audioUrl;
          if (!ok) bandFailed = true;
          setResults((prev) => prev.map((r) => {
            if (r.id !== itemId || !r.bandLayers) return r;
            return {
              ...r,
              bandLayers: r.bandLayers.map((b) => b.band === band.band
                ? (ok
                    ? { ...b, status: "generated", audioUrl: data.audioUrl }
                    : { ...b, status: "failed" })
                : b),
            };
          }));
        } catch {
          bandFailed = true;
          setResults((prev) => prev.map((r) => {
            if (r.id !== itemId || !r.bandLayers) return r;
            return {
              ...r,
              bandLayers: r.bandLayers.map((b) => b.band === band.band ? { ...b, status: "failed" } : b),
            };
          }));
        }
        if (bandFailed) bandFailures++;
      }
    }

    if (bandFailures > 0) {
      toast.error(`Generated with ${bandFailures} band failure${bandFailures > 1 ? "s" : ""}`);
    } else {
      toast.success("Generated");
    }
    setIsGenerating(false);
  }, [tab, composedPrompt, impact, bandPlan, results.length, sfxFetch, generateMain, toast]);

  // Audio playback (shared hook, auto-pauses on unmount)
  const { playingKey, play } = useSfxAudio();

  return (
    <div className="p-4 pt-2 max-w-7xl mx-auto animate-fade-in">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Compact tab bar — underline style, lives inside the content column
              so the sidebar can start flush at the top of the page. */}
          <div className="flex gap-1 border-b border-atlas-border">
            {MISC_TAB_DEFS.map((t) => {
              const Icon = TAB_ICONS[t.icon as keyof typeof TAB_ICONS] ?? Wind;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors -mb-px",
                    active
                      ? "border-b-2 border-atlas-accent text-atlas-text"
                      : "text-atlas-text-muted hover:text-atlas-text"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "push" && <PushTab settings={push} onChange={setPush} />}
          {tab === "artifacts" && <ArtifactsTab settings={artifact} onChange={setArtifact} />}
          {tab === "noise" && <NoiseTab settings={noise} onChange={setNoise} />}
          {tab === "impact" && <ImpactTab settings={impact} onChange={setImpact} disabled={isGenerating} />}
          {tab === "pulse" && <PulseTab settings={pulse} onChange={setPulse} />}
          {tab === "timbre" && <TimbreTab settings={timbre} onChange={setTimbre} />}
          {tab === "texture" && <TextureTab settings={texture} onChange={setTexture} />}
        </div>

        {/* Right column: prompt + generate — matches /generate sidebar. */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          <div className="atlas-card p-4">
            <textarea
              value={customOverride || composedPrompt}
              onChange={(e) => setCustomOverride(e.target.value)}
              rows={5}
              placeholder="Describe the sound you want to generate..."
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
              data-no-transition
            />
            <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
              <span className={cn("tabular-nums", (customOverride || composedPrompt || "").length > 450 ? "text-atlas-danger font-medium" : "")}>
                {(customOverride || composedPrompt || "").length} chars
              </span>
              {customOverride && (
                <button
                  onClick={() => setCustomOverride("")}
                  className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
                  title="Reset to auto-composed"
                >
                  ↺
                </button>
              )}
            </div>

            {/* Music guardrail warnings */}
            {guardrailWarnings.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Content guidance
                </div>
                {guardrailWarnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-400/80 leading-snug">{w}</p>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
              isGenerating
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
                <Play className="h-4 w-4" /> Generate · {totalCost}cr
              </span>
            )}
          </button>

          <div className="atlas-card p-3 space-y-3">
            {isMusicTab(tab) ? (
              /* Music tabs get a longer duration slider (3s–120s) and no prompt-influence */
              <AtlasSlider
                label="Duration"
                value={(tab === "pulse" ? pulse.durationMs : tab === "texture" ? texture.durationMs : timbre.durationMs) / 1000}
                onChange={(v) => {
                  const ms = Math.round(v * 1000);
                  if (tab === "pulse") setPulse((s) => ({ ...s, durationMs: ms }));
                  else if (tab === "texture") setTexture((s) => ({ ...s, durationMs: ms }));
                  else setTimbre((s) => ({ ...s, durationMs: ms }));
                }}
                min={3} max={120} step={1}
                displayValue={`${Math.round((tab === "pulse" ? pulse.durationMs : tab === "texture" ? texture.durationMs : timbre.durationMs) / 1000)}s`}
                lowLabel="3s" highLabel="120s"
              />
            ) : (
              /* SFX tabs get duration + prompt influence */
              <>
                <AtlasSlider
                  label="Duration"
                  value={duration} onChange={setDuration}
                  min={0.5} max={10} step={0.5}
                  displayValue={`${duration}s`}
                  lowLabel="0.5s" highLabel="10s"
                />
                <AtlasSlider
                  label="Prompt Influence"
                  value={promptInfluence} onChange={setPromptInfluence}
                  min={0} max={1} step={0.05}
                  displayValue={`${Math.round(promptInfluence * 100)}%`}
                  lowLabel="creative" highLabel="strict"
                />
              </>
            )}

            {tab === "impact" && impact.layeredDesign && bandPlan.length > 0 && (
              <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-2 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
                  <Layers className="h-3 w-3" /> 3-band design active · {bandPlan.length} extra layers
                </span>
                {bandPlan.map((b) => (
                  <div key={b.band} className="text-[10px] font-mono text-atlas-text-dim truncate">
                    <span className="text-atlas-accent uppercase">{b.band}</span> · {b.prompt.slice(0, 64)}…
                  </div>
                ))}
              </div>
            )}
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
              "rounded-xl border px-3 py-2 transition-all",
              r.status === "generated" ? "border-atlas-success/20 bg-atlas-success/5" :
              r.status === "failed" ? "border-atlas-danger/20 bg-atlas-danger/5" :
              "border-atlas-border-subtle"
            )}>
              <div className="flex items-center gap-2">
                {r.audioUrl && (
                  <button onClick={() => play(`result:${r.id}`, r.audioUrl)} className="shrink-0">
                    {playingKey === `result:${r.id}` ? <Pause className="h-4 w-4 text-atlas-accent" /> : <Play className="h-4 w-4 text-atlas-text-dim hover:text-atlas-accent" />}
                  </button>
                )}
                {r.status === "generating" && <Loader2 className="h-4 w-4 text-atlas-accent animate-spin shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-atlas-text capitalize">{r.tab} · Take {r.takeNumber}</span>
                  </div>
                  <p className="text-xs text-atlas-text-dim truncate font-mono">{r.composedPrompt.slice(0, 100)}…</p>
                </div>
                {r.status === "generated" && r.audioUrl && (
                  <a href={r.audioUrl} download={r.filename} className="text-atlas-text-dim hover:text-atlas-accent p-0.5">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                {r.status === "generated" && (
                  <SendButtons prompt={r.composedPrompt} audioUrl={r.audioUrl} />
                )}
              </div>

              {/* Band layers */}
              {r.bandLayers && r.bandLayers.length > 0 && (
                <div className="mt-2 ml-6 space-y-1 border-l border-atlas-border-subtle pl-3">
                  {r.bandLayers.map((b) => (
                    <div key={b.band} className="flex items-center gap-2 text-xs">
                      {b.audioUrl ? (
                        <button onClick={() => play(`band:${r.id}:${b.band}`, b.audioUrl)} className="shrink-0">
                          {playingKey === `band:${r.id}:${b.band}` ? <Pause className="h-3 w-3 text-atlas-accent" /> : <Play className="h-3 w-3 text-atlas-text-dim hover:text-atlas-accent" />}
                        </button>
                      ) : b.status === "generating" ? (
                        <Loader2 className="h-3 w-3 text-atlas-accent animate-spin shrink-0" />
                      ) : (
                        <div className="h-3 w-3 shrink-0" />
                      )}
                      <span className="uppercase text-[10px] font-semibold w-8 text-atlas-accent">{b.band}</span>
                      <span className="flex-1 truncate text-atlas-text-dim font-mono">{b.prompt.slice(0, 60)}…</span>
                      {b.audioUrl && <a href={b.audioUrl} download={b.filename} className="text-atlas-text-dim hover:text-atlas-accent"><Download className="h-3 w-3" /></a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SendButtons({ prompt, audioUrl }: { prompt: string; audioUrl?: string }) {
  const send = (target: "stacker" | "variation-lab") => {
    const key = target === "stacker" ? "algophony-studio-stacker-import" : "algophony-studio-variation-import";
    localStorage.setItem(key, JSON.stringify({ module: "misc", promptText: prompt, audioUrl }));
    window.open(`/dashboard/${target}`, "_blank");
  };
  return (
    <div className="flex gap-1 shrink-0">
      <button onClick={() => send("stacker")} title="Send to Stacker" className="text-atlas-text-dim hover:text-atlas-accent p-0.5">
        <Send className="h-3 w-3" />
      </button>
      <button onClick={() => send("variation-lab")} title="Send to Variation Lab" className="text-atlas-text-dim hover:text-atlas-accent p-0.5">
        <Dices className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Tab bodies ───────────────────────────────────────────────

function PushTab({ settings, onChange }: { settings: PushSettings; onChange: (s: PushSettings) => void }) {
  const u = (patch: Partial<PushSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="atlas-card p-4 space-y-4">
      <ChipRow label="Whoosh Type" values={PUSH_TYPES} selected={settings.pushType} onSelect={(v) => u({ pushType: v })} labelMap={PUSH_TYPE_LABELS} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipRow label="Medium" values={PUSH_MEDIUMS} selected={settings.medium} onSelect={(v) => u({ medium: v })} />
        <ChipRow label="Direction" values={PUSH_DIRECTIONS} selected={settings.direction} onSelect={(v) => u({ direction: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipRow label="Speed" values={PUSH_SPEEDS} selected={settings.speed} onSelect={(v) => u({ speed: v })} />
        <ChipRow label="Tail" values={PUSH_TAILS} selected={settings.tail} onSelect={(v) => u({ tail: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AtlasSlider
          label="Pitch Sweep" value={settings.pitchSweep} onChange={(v) => u({ pitchSweep: v })}
          min={-1} max={1} step={0.05}
          displayValue={settings.pitchSweep > 0 ? `+${settings.pitchSweep.toFixed(2)}` : settings.pitchSweep.toFixed(2)}
          lowLabel="down" highLabel="up"
        />
        <AtlasSlider
          label="Intensity" value={settings.intensity} onChange={(v) => u({ intensity: v })}
          min={0} max={1} step={0.05}
          displayValue={`${Math.round(settings.intensity * 100)}%`}
          lowLabel="subtle" highLabel="intense"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={settings.doppler} onChange={(e) => u({ doppler: e.target.checked })} className="accent-atlas-accent" />
          <span className="text-xs text-atlas-text">Doppler bend</span>
        </label>
        <ChipRow label="Realism" values={REALISMS} selected={settings.realism} onSelect={(v) => u({ realism: v })} />
      </div>
    </div>
  );
}

function ArtifactsTab({ settings, onChange }: { settings: ArtifactSettings; onChange: (s: ArtifactSettings) => void }) {
  const u = (patch: Partial<ArtifactSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="atlas-card p-4 space-y-4">
      <ChipRow label="Artifact Type" values={ARTIFACT_TYPES} selected={settings.artifactType} onSelect={(v) => u({ artifactType: v })} labelMap={ARTIFACT_TYPE_LABELS} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipRow label="Density" values={ARTIFACT_DENSITIES} selected={settings.density} onSelect={(v) => u({ density: v })} />
        <ChipRow label="Pitch Band" values={ARTIFACT_PITCHES} selected={settings.pitch} onSelect={(v) => u({ pitch: v })} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <AtlasSlider
          label="Events/sec" value={settings.speed} onChange={(v) => u({ speed: v })}
          min={1} max={20} step={1}
          displayValue={`${settings.speed}/s`}
          lowLabel="sparse" highLabel="dense"
        />
        <AtlasSlider
          label="Jitter" value={settings.jitter} onChange={(v) => u({ jitter: v })}
          min={0} max={1} step={0.05}
          displayValue={`${Math.round(settings.jitter * 100)}%`}
          lowLabel="tight" highLabel="loose"
        />
        <AtlasSlider
          label="Bit Crush" value={settings.bitCrush} onChange={(v) => u({ bitCrush: v })}
          min={0} max={1} step={0.05}
          displayValue={`${Math.round(settings.bitCrush * 100)}%`}
          lowLabel="clean" highLabel="crushed"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AtlasSlider
          label="Dry/Wet" value={settings.dryWet} onChange={(v) => u({ dryWet: v })}
          min={0} max={1} step={0.05}
          displayValue={`${Math.round(settings.dryWet * 100)}%`}
          lowLabel="dry" highLabel="wet"
        />
        <div className="space-y-1">
          <span className="text-xs text-atlas-text-dim">Source material</span>
          <input
            value={settings.source}
            onChange={(e) => u({ source: e.target.value })}
            placeholder="e.g. modem, vinyl, broken cassette"
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
        </div>
      </div>
      <ChipRow label="Realism" values={REALISMS} selected={settings.realism} onSelect={(v) => u({ realism: v })} />
    </div>
  );
}

function NoiseTab({ settings, onChange }: { settings: NoiseSettings; onChange: (s: NoiseSettings) => void }) {
  const u = (patch: Partial<NoiseSettings>) => onChange({ ...settings, ...patch });
  const [tagInput, setTagInput] = useState("");

  /** When the flavor changes, also bump the recommended engine. */
  const setFlavor = (f: typeof settings.flavor) => {
    u({ flavor: f, engine: NOISE_ENGINE_HINTS[f] });
  };

  return (
    <div className="atlas-card p-4 space-y-4">
      <ChipRow label="Noise Flavor" values={NOISE_FLAVORS} selected={settings.flavor} onSelect={setFlavor} labelMap={NOISE_FLAVOR_LABELS} />

      {/* Engine selector — routes to SFX / Voice Design / Music endpoints */}
      <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-atlas-text">Engine</span>
          <span className="text-[10px] text-atlas-text-dim">
            recommended: {NOISE_ENGINE_LABELS[NOISE_ENGINE_HINTS[settings.flavor]].split(" (")[0]}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {NOISE_ENGINES.map((e) => (
            <button
              key={e}
              onClick={() => u({ engine: e })}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all",
                settings.engine === e
                  ? "border-atlas-accent bg-atlas-accent text-white"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:border-atlas-border"
              )}
            >
              {NOISE_ENGINE_LABELS[e]}
            </button>
          ))}
        </div>
        {settings.engine === "music" && (
          <div className="space-y-1 pt-1">
            <span className="text-[11px] text-atlas-text-dim">Bed duration · {(settings.musicDurationMs / 1000).toFixed(0)}s</span>
            <input
              type="range" min={3000} max={60000} step={1000}
              value={settings.musicDurationMs}
              onChange={(e) => u({ musicDurationMs: Number(e.target.value) })}
              className="w-full accent-atlas-accent"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipRow label="Usage" values={NOISE_USAGES} selected={settings.usage} onSelect={(v) => u({ usage: v })} />
        <ChipRow label="Distortion" values={NOISE_DISTORTIONS} selected={settings.distortion} onSelect={(v) => u({ distortion: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipRow label="Bandwidth" values={NOISE_BANDWIDTHS} selected={settings.bandwidth} onSelect={(v) => u({ bandwidth: v })} />
        <ChipRow label="Motion" values={["static", "swelling", "pulsing", "scanning", "erratic"] as const} selected={settings.motion} onSelect={(v) => u({ motion: v })} />
      </div>
      <AtlasSlider
        label="Intensity" value={settings.intensity} onChange={(v) => u({ intensity: v })}
        min={0} max={1} step={0.05}
        displayValue={`${Math.round(settings.intensity * 100)}%`}
        lowLabel="subtle" highLabel="overwhelming"
      />

      <div className="space-y-2">
        <span className="text-xs text-atlas-text-dim">Tags (prompt-extender chips)</span>
        <div className="flex flex-wrap gap-1">
          {settings.tags.map((t) => (
            <button
              key={t}
              onClick={() => u({ tags: settings.tags.filter((x) => x !== t) })}
              className="rounded-full bg-atlas-accent-muted text-atlas-accent text-xs px-2 py-0.5 hover:bg-atlas-accent-muted/80"
              title="Remove tag"
            >
              {t} ×
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                u({ tags: [...settings.tags, tagInput.trim()] });
                setTagInput("");
              }
            }}
            placeholder="add tag: e.g. broken signal, alien data, dying speaker"
            className="flex-1 rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
          <button
            onClick={() => {
              if (!tagInput.trim()) return;
              u({ tags: [...settings.tags, tagInput.trim()] });
              setTagInput("");
            }}
            className="rounded-lg border border-atlas-border-subtle px-2 text-xs text-atlas-text-dim hover:text-atlas-accent"
          >
            +
          </button>
        </div>
      </div>

      <ChipRow label="Realism" values={REALISMS} selected={settings.realism} onSelect={(v) => u({ realism: v })} />
    </div>
  );
}

function ImpactTab({ settings, onChange, disabled = false }: { settings: ImpactSettings; onChange: (s: ImpactSettings) => void; disabled?: boolean }) {
  const u = (patch: Partial<ImpactSettings>) => onChange({ ...settings, ...patch });

  const setFamily = (f: typeof settings.family) => {
    u({ family: f, material: IMPACT_FAMILY_MATERIALS[f] });
  };

  const setBand = (idx: number, patch: Partial<ImpactBandLayer>) => {
    u({ bands: settings.bands.map((b, i) => i === idx ? { ...b, ...patch } : b) });
  };

  return (
    <div className="space-y-4">
      <div className="atlas-card p-4 space-y-4">
        <ChipRow label="Family" values={IMPACT_FAMILIES} selected={settings.family} onSelect={setFamily} labelMap={IMPACT_FAMILY_LABELS} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Size" values={IMPACT_SIZES} selected={settings.size} onSelect={(v) => u({ size: v })} />
          <ChipRow label="Situation" values={IMPACT_SITUATIONS} selected={settings.situation} onSelect={(v) => u({ situation: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Target Surface" values={COLLISION_TARGETS} selected={settings.target} onSelect={(v) => u({ target: v })} />
          <ChipRow label="Tail" values={IMPACT_TAILS} selected={settings.tail} onSelect={(v) => u({ tail: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-atlas-text-dim">Primary material</span>
            <input
              value={settings.material}
              onChange={(e) => u({ material: e.target.value })}
              placeholder="e.g. wet watermelon flesh, basalt boulder"
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
            />
          </div>
          <ChipRow label="Distance" values={MISC_DISTANCES} selected={settings.distance} onSelect={(v) => u({ distance: v })} />
        </div>
        <ChipRow label="Realism" values={REALISMS} selected={settings.realism} onSelect={(v) => u({ realism: v })} />
      </div>

      {/* 3-band design */}
      <div className={cn("atlas-card p-4 space-y-3", disabled && "opacity-60 pointer-events-none")} aria-disabled={disabled}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
            <Layers className="h-3 w-3" /> 3-Band Layered Design
            {disabled && <span className="ml-2 text-[10px] text-atlas-text-dim normal-case">· locked during generation</span>}
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={settings.layeredDesign}
              onChange={(e) => u({ layeredDesign: e.target.checked })}
              disabled={disabled}
              className="accent-atlas-accent"
            />
            <span className="text-xs text-atlas-text">{settings.layeredDesign ? "Generating 3 stems" : "Single bounce only"}</span>
          </label>
        </div>
        {settings.layeredDesign && (
          <div className="space-y-2">
            {settings.bands.map((b, i) => {
              const hue = b.band === "low" ? 0 : b.band === "mid" ? 50 : 200;
              return (
                <div key={b.band} className="rounded-xl border border-atlas-border-subtle bg-atlas-bg p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox" checked={b.enabled}
                      onChange={(e) => setBand(i, { enabled: e.target.checked })}
                      disabled={disabled}
                      className="accent-atlas-accent"
                    />
                    <span
                      className="text-xs font-semibold uppercase rounded-md px-2 py-0.5"
                      style={{ backgroundColor: `hsla(${hue}, 50%, 50%, 0.15)`, color: `hsl(${hue}, 55%, 55%)` }}
                    >
                      {b.band}
                    </span>
                    <input
                      value={b.material}
                      onChange={(e) => setBand(i, { material: e.target.value })}
                      placeholder="material for this band"
                      className="flex-1 rounded-lg border border-atlas-border bg-atlas-surface px-2 py-1 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
                    />
                  </div>
                  <AtlasSlider
                    label="Weight" value={b.weight} onChange={(v) => setBand(i, { weight: v })}
                    min={0} max={1} step={0.05}
                    displayValue={`${Math.round(b.weight * 100)}%`}
                    lowLabel="supporting" highLabel="dominant"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pulse Tab ────────────────────────────────────────────────

function PulseTab({ settings, onChange }: { settings: PulseSettings; onChange: (s: PulseSettings) => void }) {
  const u = (patch: Partial<PulseSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="space-y-4">
      {/* Framing note */}
      <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
        <p className="text-[11px] text-atlas-text-muted leading-relaxed">
          <span className="text-atlas-accent font-semibold">Sound-design material</span> — generates motion-oriented instrumental layers: rhythm, stutter, propulsion, tension. Not a song or beat generator.
        </p>
      </div>

      <div className="atlas-card p-4 space-y-4">
        <ChipRow label="Use Case" values={PULSE_USE_CASES} selected={settings.useCase} onSelect={(v) => u({ useCase: v })} />
        <ChipRow label="Motion Type" values={PULSE_MOTION_TYPES} selected={settings.motionType} onSelect={(v) => u({ motionType: v })} labelMap={PULSE_MOTION_TYPE_LABELS} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Tempo Impression" values={PULSE_TEMPO_IMPRESSIONS} selected={settings.tempoImpression} onSelect={(v) => u({ tempoImpression: v })} />
          <ChipRow label="Density" values={PULSE_DENSITIES} selected={settings.density} onSelect={(v) => u({ density: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Regularity" values={PULSE_REGULARITIES} selected={settings.regularity} onSelect={(v) => u({ regularity: v })} />
          <ChipRow label="Material" values={PULSE_MATERIALS} selected={settings.material} onSelect={(v) => u({ material: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Spectral Weight" values={PULSE_SPECTRAL_WEIGHTS} selected={settings.spectralWeight} onSelect={(v) => u({ spectralWeight: v })} labelMap={PULSE_SPECTRAL_WEIGHT_LABELS} />
          <ChipRow label="Emotion" values={PULSE_EMOTIONS} selected={settings.emotion} onSelect={(v) => u({ emotion: v })} />
        </div>

        <div className="space-y-1">
          <span className="text-xs text-atlas-text-dim">Avoid (negative prompt)</span>
          <input
            value={settings.avoidText}
            onChange={(e) => u({ avoidText: e.target.value })}
            placeholder="e.g. no distortion, no reverb, avoid sub bass"
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Timbre Tab ───────────────────────────────────────────────

function TimbreTab({ settings, onChange }: { settings: TimbreSettings; onChange: (s: TimbreSettings) => void }) {
  const u = (patch: Partial<TimbreSettings>) => onChange({ ...settings, ...patch });
  return (
    <div className="space-y-4">
      {/* Framing note */}
      <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
        <p className="text-[11px] text-atlas-text-muted leading-relaxed">
          <span className="text-atlas-accent font-semibold">Sound-design material</span> — generates texture and sound-matter layers based on material, timbre, gesture, density, and movement. Not a song generator.
        </p>
      </div>

      <div className="atlas-card p-4 space-y-4">
        <ChipRow label="Material" values={TIMBRE_MATERIALS} selected={settings.material} onSelect={(v) => u({ material: v })} labelMap={TIMBRE_MATERIAL_LABELS} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Timbre Color" values={TIMBRE_COLORS} selected={settings.timbre} onSelect={(v) => u({ timbre: v })} />
          <ChipRow label="Gesture" values={TIMBRE_GESTURES} selected={settings.gesture} onSelect={(v) => u({ gesture: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Texture" values={TIMBRE_TEXTURES} selected={settings.texture} onSelect={(v) => u({ texture: v })} />
          <ChipRow label="Movement" values={TIMBRE_MOVEMENTS} selected={settings.movement} onSelect={(v) => u({ movement: v })} labelMap={TIMBRE_MOVEMENT_LABELS} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChipRow label="Density" values={TIMBRE_DENSITIES} selected={settings.density} onSelect={(v) => u({ density: v })} />
          <ChipRow label="Function" values={TIMBRE_FUNCTIONS} selected={settings.function} onSelect={(v) => u({ function: v })} labelMap={TIMBRE_FUNCTION_LABELS} />
        </div>

        <div className="space-y-1">
          <span className="text-xs text-atlas-text-dim">Avoid (negative prompt)</span>
          <input
            value={settings.avoidText}
            onChange={(e) => u({ avoidText: e.target.value })}
            placeholder="e.g. no percussion, avoid harsh frequencies, no distortion"
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Texture Tab ──────────────────────────────────────────────

function TextureTab({ settings, onChange }: { settings: TextureSettings; onChange: (s: TextureSettings) => void }) {
  return (
    <div className="space-y-4">
      {/* Layer type selector */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-2 block">Layer Type</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {TEXTURE_LAYER_TYPES.map((type) => {
            const isActive = settings.layerType === type.id;
            const color = `hsl(${type.hue}, 55%, 50%)`;
            const bgColor = `hsla(${type.hue}, 45%, 40%, 0.12)`;
            return (
              <button
                key={type.id}
                onClick={() => onChange({ ...settings, layerType: type.id, prompt: TEXTURE_PROMPT_SCAFFOLDS[type.id] || settings.prompt })}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-left transition-all duration-200 group",
                  isActive ? "ring-1 shadow-sm" : "border border-atlas-border-subtle hover:border-atlas-border"
                )}
                style={{
                  backgroundColor: isActive ? bgColor : "var(--color-atlas-surface)",
                  ...(isActive ? { borderColor: `hsla(${type.hue}, 50%, 50%, 0.35)`, boxShadow: `0 0 10px ${bgColor}` } : {}),
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? color : "var(--color-atlas-text-dim)" }} />
                  <span className="text-xs font-medium" style={{ color: isActive ? color : "var(--color-atlas-text-muted)" }}>{type.label}</span>
                </div>
                <p className="text-xs text-atlas-text-dim leading-tight line-clamp-2">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt textarea */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">Prompt</span>
        <textarea
          value={settings.prompt}
          onChange={(e) => onChange({ ...settings, prompt: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
          placeholder="Describe the sound layer you want to generate..."
        />
        <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1">
          <span className={cn("tabular-nums", settings.prompt.length > 4100 ? "text-atlas-danger font-medium" : "")}>
            {settings.prompt.length} / 4100
          </span>
          <button
            onClick={() => onChange({ ...settings, prompt: TEXTURE_PROMPT_SCAFFOLDS[settings.layerType] || "" })}
            className="text-atlas-text-dim hover:text-atlas-text transition-colors text-xs"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Quick scaffolds */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">Quick Scaffolds</span>
        <div className="space-y-1">
          {TEXTURE_QUICK_SCAFFOLDS.map((scaffold) => (
            <button
              key={scaffold}
              onClick={() => onChange({ ...settings, prompt: scaffold + ". Purely instrumental, no melody, no beat. Sound design element." })}
              className="w-full text-left rounded-lg border border-atlas-border-subtle px-3 py-2 text-xs text-atlas-text-dim hover:text-atlas-text-muted hover:border-atlas-border transition-colors leading-relaxed"
            >
              {scaffold}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
