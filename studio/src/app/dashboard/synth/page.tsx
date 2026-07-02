"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Play, Pause, Trash2, RotateCcw, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";

/* ── Synth layer types ─────────────────────────── */
const LAYER_TYPES = [
  { id: "sub", label: "Sub / Rumble", hue: 260, description: "Deep rumbles, low-end pressure" },
  { id: "drone", label: "Drone / Pad", hue: 200, description: "Atmospheric pads, tonal beds" },
  { id: "tone", label: "Tone / Signal", hue: 50, description: "Clean tones, beeps, hums" },
  { id: "texture", label: "Texture / Grain", hue: 30, description: "Granular noise, analog warmth" },
  { id: "impact", label: "Impact / Hit", hue: 0, description: "Booms, thuds, cinematic hits" },
  { id: "sweep", label: "Sweep / Rise", hue: 160, description: "Risers, whooshes, tension builds" },
  { id: "pulse", label: "Pulse / Rhythm", hue: 120, description: "Mechanical loops, engine cycles" },
  { id: "harmonic", label: "Harmonic / Tonal", hue: 300, description: "Bell tones, resonant overtones" },
  { id: "glitch", label: "Glitch / Digital", hue: 180, description: "Digital artifacts, codec errors" },
  { id: "organic", label: "Organic / Found", hue: 80, description: "Processed field recordings" },
];

const DURATION_PRESETS = [
  { ms: 3000, label: "3s" },
  { ms: 5000, label: "5s" },
  { ms: 10000, label: "10s" },
  { ms: 20000, label: "20s" },
  { ms: 30000, label: "30s" },
  { ms: 60000, label: "1m" },
];

/* ── Prompt scaffolds for each layer type ─────── */
const PROMPT_SCAFFOLDS: Record<string, string> = {
  sub: "Deep sub-bass rumble, slowly evolving low-frequency pressure wave. Purely instrumental, no melody — only weight and vibration.",
  drone: "Dark ambient drone pad, sustained and slowly modulating. Atmospheric texture with subtle harmonic movement, no rhythm, no beat.",
  tone: "Clean electronic tone, pure sine-like quality. Steady pitch, minimal modulation. Sound design element, not musical.",
  texture: "Granular noise texture, slowly evolving analog grain. Tape-saturated warmth with gentle spectral movement. No rhythm, no melody.",
  impact: "Cinematic low-end impact hit with sub-bass tail. Single percussive event with long reverb decay. Purely sound design.",
  sweep: "Ascending frequency sweep, building tension. Filtered noise riser with increasing energy. Sound design element for transitions.",
  pulse: "Mechanical rhythmic pulse, industrial and repetitive. Engine-like cycle with metallic overtones. Purely rhythmic, no melody.",
  harmonic: "Resonant harmonic overtone stack, bell-like sustain. Slowly decaying tonal cluster with pure acoustic quality. Not musical — tonal exploration.",
  glitch: "Digital glitch texture, bit-crushed artifacts and codec errors. Stuttering electronic fragments with unpredictable modulation.",
  organic: "Processed field recording through granular synthesis. Natural source material transformed into evolving textural pad. Ambient and non-musical.",
};

interface SynthLayer {
  id: string;
  type: string;
  prompt: string;
  durationMs: number;
  status: "idle" | "generating" | "done" | "error";
  audioUrl: string | null;
  error?: string;
  creditCost?: number;
}

function SynthPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, []);
  return (
    <>
      <audio ref={audioRef} src={url} preload="none" />
      <button onClick={() => {
          if (!audioRef.current) return;
          if (playing) {
            audioRef.current.pause();
          } else {
            void audioRef.current.play();
          }
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors shrink-0">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>
    </>
  );
}

export default function SynthPage() {
  const toast = useToast();

  // Current builder state
  const [selectedType, setSelectedType] = useState("drone");
  const [prompt, setPrompt] = useState(PROMPT_SCAFFOLDS["drone"]);
  const [durationMs, setDurationMs] = useState(10000);
  const [generating, setGenerating] = useState(false);

  // Layer rack
  const [layers, setLayers] = useState<SynthLayer[]>([]);

  // When type changes, update prompt scaffold
  const handleTypeChange = useCallback((typeId: string) => {
    setSelectedType(typeId);
    setPrompt(PROMPT_SCAFFOLDS[typeId] || "");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    const layerId = `synth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newLayer: SynthLayer = {
      id: layerId,
      type: selectedType,
      prompt: prompt.slice(0, 80),
      durationMs,
      status: "generating",
      audioUrl: null,
    };
    setLayers((prev) => [...prev, newLayer]);

    try {
      const res = await fetch("/api/elevenlabs/music-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          duration_ms: durationMs,
          instrumental: true,
          output_format: "mp3_44100_128",
          layerType: selectedType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, status: "error" as const, error: data.error } : l));
        toast.error(data.error || "Generation failed");
      } else {
        setLayers((prev) => prev.map((l) => l.id === layerId ? {
          ...l, status: "done" as const, audioUrl: data.audioUrl, creditCost: data.durationMs ? Math.round(data.durationMs / 1000) : undefined,
        } : l));
        toast.success(`${LAYER_TYPES.find((t) => t.id === selectedType)?.label || "Layer"} generated`);
      }
    } catch {
      setLayers((prev) => prev.map((l) => l.id === layerId ? { ...l, status: "error" as const, error: "Network error" } : l));
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  }, [prompt, durationMs, selectedType, toast]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <div className="p-4 pt-2 max-w-7xl mx-auto animate-fade-in">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Left: Layer type + prompt ═══ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Layer type selector */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-2 block">Layer Type</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {LAYER_TYPES.map((type) => {
                const isActive = selectedType === type.id;
                const color = `hsl(${type.hue}, 55%, 50%)`;
                const bgColor = `hsla(${type.hue}, 45%, 40%, 0.12)`;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleTypeChange(type.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-2 text-left transition-all duration-200 group",
                      isActive ? "ring-1 shadow-sm" : "border border-atlas-border-subtle hover:border-atlas-border"
                    )}
                    style={{
                      backgroundColor: isActive ? bgColor : "var(--color-atlas-surface)",
                      ...(isActive ? { borderColor: `hsla(${type.hue}, 50%, 50%, 0.35)`, ringColor: `hsla(${type.hue}, 50%, 50%, 0.35)`, boxShadow: `0 0 10px ${bgColor}` } : {}),
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



          {/* Tips */}
          <div className="atlas-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5">
              <Sparkles className="h-3 w-3 inline mr-1" />Prompting Tips
            </h4>
            <ul className="text-xs text-atlas-text-dim space-y-0.5 leading-relaxed">
              <li>• Always include <strong>&quot;purely instrumental&quot;</strong> or <strong>&quot;no melody, no beat&quot;</strong> to avoid musical output</li>
              <li>• Reference <strong>synth techniques</strong>: granular, subtractive, FM, wavetable, additive</li>
              <li>• Specify <strong>frequency range</strong>: &quot;sub-bass 20-60Hz&quot;, &quot;mid-range 300-2kHz&quot;, &quot;high harmonics above 8kHz&quot;</li>
              <li>• Use <strong>movement descriptors</strong>: &quot;slowly evolving&quot;, &quot;pulsing&quot;, &quot;static&quot;, &quot;decaying&quot;, &quot;building&quot;</li>
              <li>• Reference <strong>materials</strong>: &quot;metallic resonance&quot;, &quot;glass-like harmonics&quot;, &quot;wooden thud&quot;</li>
              <li>• Add <strong>processing hints</strong>: &quot;heavily reverbed&quot;, &quot;distorted&quot;, &quot;filtered&quot;, &quot;bit-crushed&quot;</li>
            </ul>
          </div>

          {/* Generated layers rack */}
          {layers.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Generated Layers</span>
              {layers.map((layer) => {
                const info = LAYER_TYPES.find((t) => t.id === layer.type);
                const color = info ? `hsl(${info.hue}, 55%, 50%)` : "var(--color-atlas-text-muted)";
                return (
                  <div
                    key={layer.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                      layer.status === "error" ? "border-atlas-danger/30 bg-red-50 [data-theme=dark]:bg-atlas-danger/5" : "border-atlas-border bg-atlas-surface"
                    )}
                  >
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium shrink-0" style={{ color }}>{info?.label || layer.type}</span>
                    <span className="text-xs text-atlas-text-dim truncate flex-1">{layer.prompt}</span>
                    <span className="text-xs text-atlas-text-dim shrink-0">{(layer.durationMs / 1000).toFixed(0)}s</span>
                    {layer.status === "generating" && <Loader2 className="h-3.5 w-3.5 animate-spin text-atlas-accent shrink-0" />}
                    {layer.status === "error" && <span className="text-xs text-atlas-danger shrink-0">error</span>}
                    {layer.status === "done" && layer.audioUrl && <SynthPlayer url={layer.audioUrl} />}
                    <button onClick={() => removeLayer(layer.id)} className="p-0.5 text-atlas-text-dim hover:text-atlas-danger transition-colors shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Controls + Generate — matches /generate sidebar shape. */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">

          <div className="atlas-card p-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
              placeholder="Describe the sound layer you want to generate..."
              data-no-transition
            />
            <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
              <span className={cn("tabular-nums", prompt.length > 4100 ? "text-atlas-danger font-medium" : "")}>
                {prompt.length} / 4100 chars
              </span>
              <button
                onClick={() => setPrompt(PROMPT_SCAFFOLDS[selectedType] || "")}
                className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
                title="Reset to scaffold"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
              generating || !prompt.trim()
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
            )}
          >
            {generating ? (
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
                <Sparkles className="h-4 w-4" /> Generate Layer
              </span>
            )}
          </button>

          {/* Controls */}
          <div className="atlas-card p-3 space-y-3">
            {/* Duration */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">Duration</span>
              <div className="grid grid-cols-3 gap-1">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d.ms}
                    onClick={() => setDurationMs(d.ms)}
                    className={cn(
                      "rounded-lg py-2 text-xs font-medium transition-colors",
                      durationMs === d.ms ? "bg-atlas-accent text-white" : "bg-atlas-surface text-atlas-text-dim border border-atlas-border-subtle hover:text-atlas-text-muted"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick scaffolds */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">Quick Scaffolds</span>
              <div className="space-y-1">
                {[
                  "Spaceship engine idle — deep rumbling hum with mechanical vibration and metallic resonance",
                  "Underwater ambience — muffled low-frequency pressure with distant whale-like tonal movement",
                  "Alien environment — otherworldly atonal pad with dissonant harmonics, slowly evolving",
                  "Electrical hum — 60Hz buzz with harmonic overtones, transformer room ambience",
                  "Wind tunnel drone — broadband noise shaped into tonal whoosh, stereo movement",
                ].map((scaffold) => (
                  <button
                    key={scaffold}
                    onClick={() => setPrompt(scaffold + ". Purely instrumental, no melody, no beat. Sound design element.")}
                    className="w-full text-left rounded-lg border border-atlas-border-subtle px-3 py-2 text-xs text-atlas-text-dim hover:text-atlas-text-muted hover:border-atlas-border transition-colors leading-relaxed"
                  >
                    {scaffold}
                  </button>
                ))}
              </div>
            </div>

            {/* Info card */}
            <div className="flex items-start gap-1.5 text-xs text-atlas-warning">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>Music generation costs credits based on duration. Longer layers cost more.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
