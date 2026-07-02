"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  GitBranch,
  Layers,
  Loader2,
  Mic,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  Wand2,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { AudioPlayer } from "@/app/dashboard/components/audio-player";
import type { TimingData } from "@/app/dashboard/components/TimingSyncPanel";

type VoiceSettings = {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
};

type DspState = {
  age: number;
  bodySize: number;
  airBreath: number;
  tension: number;
  clarity: number;
  creature: number;
  pitchShiftSt: number;
  pitchContour: number;
  microInflection: number;
  formantShiftSt: number;
  vocalSize: number;
  throatLength: number;
  throatConstriction: number;
  mouthOpen: number;
  breathMix: number;
  breathBrightness: number;
  whisperPressure: number;
  glottalRoughness: number;
  creak: number;
  nasalResonance: number;
  articulation: number;
  proximityEq: number;
  characterFx: number;
  transientClarity: number;
};

type SliderConfig = {
  key: keyof DspState;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  zeroLabel?: string;
};

type EarwormEvent = {
  id: string;
  type: string;
  status: "ready" | "pending" | "active";
  source: string;
  detail: string;
};

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.46,
  similarityBoost: 0.78,
  style: 0.28,
  speed: 0.96,
  useSpeakerBoost: true,
};

const DEFAULT_DSP: DspState = {
  age: 0.45,
  bodySize: 0.58,
  airBreath: 0.34,
  tension: 0.42,
  clarity: 0.64,
  creature: 0.08,
  pitchShiftSt: -0.8,
  pitchContour: 0.42,
  microInflection: 0.36,
  formantShiftSt: -0.55,
  vocalSize: 0.58,
  throatLength: 0.14,
  throatConstriction: 0.18,
  mouthOpen: 0.52,
  breathMix: 0.17,
  breathBrightness: 0.45,
  whisperPressure: 0.12,
  glottalRoughness: 0.18,
  creak: 0.1,
  nasalResonance: 0.2,
  articulation: 0.64,
  proximityEq: 0.18,
  characterFx: 0.04,
  transientClarity: -0.03,
};

const MACRO_CONTROLS: SliderConfig[] = [
  { key: "age", label: "Age", min: 0, max: 1, step: 0.01 },
  { key: "bodySize", label: "Body size", min: 0, max: 1, step: 0.01 },
  { key: "airBreath", label: "Air and breath", min: 0, max: 1, step: 0.01 },
  { key: "tension", label: "Tension", min: 0, max: 1, step: 0.01 },
  { key: "clarity", label: "Clarity", min: 0, max: 1, step: 0.01 },
  { key: "creature", label: "Creature", min: 0, max: 1, step: 0.01 },
];

const DSP_MODULES: Array<{ title: string; icon: LucideIcon; sliders: SliderConfig[] }> = [
  {
    title: "Pitch",
    icon: Waves,
    sliders: [
      { key: "pitchShiftSt", label: "Shift", min: -12, max: 12, step: 0.1, unit: "st", zeroLabel: "0 st" },
      { key: "pitchContour", label: "Contour", min: 0, max: 1, step: 0.01 },
      { key: "microInflection", label: "Micro inflection", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "Formant",
    icon: SlidersHorizontal,
    sliders: [
      { key: "formantShiftSt", label: "Shift", min: -6, max: 6, step: 0.1, unit: "st", zeroLabel: "0 st" },
      { key: "vocalSize", label: "Vocal size", min: 0, max: 1, step: 0.01 },
      { key: "transientClarity", label: "Transient clarity", min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    title: "Throat",
    icon: Activity,
    sliders: [
      { key: "throatLength", label: "Length", min: -1, max: 1, step: 0.01 },
      { key: "throatConstriction", label: "Constriction", min: 0, max: 1, step: 0.01 },
      { key: "mouthOpen", label: "Mouth openness", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "Breath",
    icon: Volume2,
    sliders: [
      { key: "breathMix", label: "Mix", min: 0, max: 1, step: 0.01 },
      { key: "breathBrightness", label: "Brightness", min: 0, max: 1, step: 0.01 },
      { key: "whisperPressure", label: "Whisper pressure", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "Glottal",
    icon: Radio,
    sliders: [
      { key: "glottalRoughness", label: "Roughness", min: 0, max: 1, step: 0.01 },
      { key: "creak", label: "Creak", min: 0, max: 1, step: 0.01 },
      { key: "proximityEq", label: "Proximity EQ", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "Resonance",
    icon: Layers,
    sliders: [
      { key: "nasalResonance", label: "Nasal resonance", min: 0, max: 1, step: 0.01 },
      { key: "articulation", label: "Articulation", min: 0, max: 1, step: 0.01 },
      { key: "characterFx", label: "Character FX", min: 0, max: 1, step: 0.01 },
    ],
  },
];

const VOICE_MODELS = [
  { id: "eleven_v3", label: "Eleven v3", detail: "Expressive source" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2", detail: "Language stable" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5", detail: "Fast audition" },
];

const OUTPUT_FORMATS = [
  "mp3_44100_128",
  "mp3_44100_192",
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "for",
  "from",
  "in",
  "of",
  "the",
  "to",
  "voice",
  "with",
]);

function formatSliderValue(value: number, config: SliderConfig) {
  if (value === 0 && config.zeroLabel) return config.zeroLabel;
  const precision = config.step < 0.1 ? 2 : 1;
  return `${value.toFixed(precision)}${config.unit ? ` ${config.unit}` : ""}`;
}

function titleCaseWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function deriveVoiceName(prompt: string) {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 5);

  if (!words.length) return "Untitled Voice";
  return words.map(titleCaseWord).join(" ");
}

function filenameSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "voice-design";
}

function extractTraits(prompt: string) {
  const text = prompt.toLowerCase();
  const traits = [
    { id: "breathy", label: "Breathy", targets: ["breath_mix", "whisper_pressure"], words: ["breath", "breathy", "whisper", "airy", "hushed"] },
    { id: "gravel", label: "Gravel", targets: ["glottal_roughness", "creak"], words: ["gravel", "rough", "rasp", "smoke", "detective"] },
    { id: "intimate", label: "Intimate", targets: ["proximity_eq", "mouth_open"], words: ["intimate", "close", "near", "private", "low"] },
    { id: "aged", label: "Aged", targets: ["formant_shift", "vocal_size"], words: ["old", "aged", "middle-aged", "elder", "weathered"] },
    { id: "tired", label: "Tired", targets: ["pitch_contour", "transient_clarity"], words: ["tired", "exhausted", "weary", "sleep", "drained"] },
    { id: "clear", label: "Clear", targets: ["articulation", "clarity"], words: ["clear", "precise", "broadcast", "narrator", "instruction"] },
    { id: "nonhuman", label: "Non-human", targets: ["character_fx", "formant_shift"], words: ["creature", "alien", "demon", "android", "synthetic"] },
  ];

  const matched = traits.filter((trait) => trait.words.some((word) => text.includes(word)));
  if (matched.length) return matched;

  return [
    { id: "neutral-source", label: "Neutral source", targets: ["stability", "clarity"], words: [] },
    { id: "manual-dsp", label: "Manual DSP", targets: ["macro_controls", "automation"], words: [] },
  ];
}

function derivePromptDsp(prompt: string): DspState {
  const text = prompt.toLowerCase();
  const next = { ...DEFAULT_DSP };

  if (/(exhausted|tired|weary|drained)/.test(text)) {
    next.breathMix += 0.08;
    next.pitchContour -= 0.08;
    next.transientClarity -= 0.05;
  }
  if (/(detective|gravel|rasp|rough|smoke)/.test(text)) {
    next.formantShiftSt -= 0.25;
    next.glottalRoughness += 0.14;
    next.creak += 0.08;
    next.proximityEq += 0.1;
  }
  if (/(low|deep|large|giant|chest)/.test(text)) {
    next.pitchShiftSt -= 0.5;
    next.formantShiftSt -= 0.35;
    next.throatLength += 0.1;
    next.bodySize += 0.08;
  }
  if (/(whisper|hushed|breathy|air)/.test(text)) {
    next.airBreath += 0.14;
    next.breathMix += 0.16;
    next.whisperPressure += 0.16;
  }
  if (/(alien|creature|demon|android|synthetic)/.test(text)) {
    next.creature += 0.24;
    next.characterFx += 0.22;
    next.formantShiftSt += text.includes("android") ? 0.35 : -0.2;
  }
  if (/(clear|precise|broadcast|assistant|instruction)/.test(text)) {
    next.clarity += 0.18;
    next.articulation += 0.18;
    next.transientClarity += 0.12;
  }

  return Object.fromEntries(
    Object.entries(next).map(([key, value]) => [key, Math.max(key.endsWith("St") ? -12 : -1, Math.min(key.endsWith("St") ? 12 : 1, Number(value.toFixed(2))))])
  ) as DspState;
}

function mimeForFormat(format: string) {
  if (format.startsWith("wav")) return "audio/wav";
  if (format.startsWith("pcm")) return "audio/wav";
  return "audio/mpeg";
}

function qualityWarnings(settings: VoiceSettings, dsp: DspState) {
  const warnings: string[] = [];
  if (settings.speed > 1.12 && dsp.articulation < 0.55) warnings.push("Speed needs more articulation");
  if (dsp.breathMix > 0.62 && dsp.clarity < 0.45) warnings.push("Breath may mask consonants");
  if (dsp.characterFx > 0.45 && dsp.formantShiftSt < -3) warnings.push("Extreme formant and FX stack");
  if (dsp.glottalRoughness > 0.65 && dsp.creak > 0.5) warnings.push("Roughness may obscure words");
  return warnings;
}

function buildAutomationLane(timing: TimingData | null, dsp: DspState) {
  if (!timing?.words.length) {
    return [
      { time: 0, value: Number((dsp.breathMix * 0.7).toFixed(2)), label: "pre-roll" },
      { time: 0.6, value: Number(dsp.breathMix.toFixed(2)), label: "phrase" },
      { time: 1.4, value: Number((dsp.breathMix + 0.08).toFixed(2)), label: "release" },
    ];
  }

  return timing.words.slice(0, 7).map((word, index) => ({
    time: Number(word.start.toFixed(2)),
    value: Number(Math.min(1, dsp.breathMix + (/[,.!?]$/.test(word.word) ? 0.12 : 0.02 * (index % 3))).toFixed(2)),
    label: word.word.replace(/[^a-z0-9]/gi, ""),
  }));
}

export default function VoiceDesignerPage() {
  const toast = useToast();
  const [voicePrompt, setVoicePrompt] = useState(
    "Exhausted middle-aged detective, gravelly and intimate, low voice, close to the microphone."
  );
  const [script, setScript] = useState("I heard the signal underneath the rain. It was not music yet, but it knew my name.");
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [modelId, setModelId] = useState("eleven_v3");
  const [languageCode, setLanguageCode] = useState("en");
  const [outputFormat, setOutputFormat] = useState("mp3_44100_128");
  const [seed, setSeed] = useState(271828);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [dsp, setDsp] = useState<DspState>(derivePromptDsp(voicePrompt));
  const [timingData, setTimingData] = useState<TimingData | null>(null);
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [generatedVoiceId, setGeneratedVoiceId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [activeTake, setActiveTake] = useState<"source" | "dsp-a" | "dsp-b">("source");
  const [isDesigningVoice, setIsDesigningVoice] = useState(false);
  const [isGeneratingSource, setIsGeneratingSource] = useState(false);
  const [isAligning, setIsAligning] = useState(false);
  const [renderCount, setRenderCount] = useState(0);

  const assetName = useMemo(() => deriveVoiceName(voicePrompt), [voicePrompt]);
  const slug = useMemo(() => filenameSlug(assetName), [assetName]);
  const traits = useMemo(() => extractTraits(voicePrompt), [voicePrompt]);
  const warnings = useMemo(() => qualityWarnings(voiceSettings, dsp), [voiceSettings, dsp]);
  const automationLane = useMemo(() => buildAutomationLane(timingData, dsp), [timingData, dsp]);

  const elevenlabsPayload = useMemo(() => ({
    voice_id: voiceId,
    text: script,
    model_id: modelId,
    output_format: outputFormat,
    language_code: languageCode.trim() || undefined,
    seed: Number.isFinite(seed) ? seed : undefined,
    voice_settings: {
      stability: voiceSettings.stability,
      similarity_boost: voiceSettings.similarityBoost,
      style: voiceSettings.style,
      speed: voiceSettings.speed,
      use_speaker_boost: voiceSettings.useSpeakerBoost,
    },
  }), [languageCode, modelId, outputFormat, script, seed, voiceId, voiceSettings]);

  const earwormEvents = useMemo<EarwormEvent[]>(() => [
    {
      id: "evt_prompt",
      type: "prompt.ingested",
      status: "ready",
      source: "Prompt Studio",
      detail: `${traits.map((trait) => trait.label).join(", ")} -> ${assetName}`,
    },
    {
      id: "evt_request",
      type: "generation.requested",
      status: sourceAudioUrl || generationId ? "ready" : "active",
      source: "ElevenLabs",
      detail: `${modelId} / ${voiceId || "voice_id pending"}`,
    },
    {
      id: "evt_audio",
      type: "audio.generated",
      status: sourceAudioUrl ? "ready" : "pending",
      source: "Signal chain",
      detail: generationId ? `generation ${generationId.slice(0, 8)}` : outputFormat,
    },
    {
      id: "evt_alignment",
      type: "alignment.ingested",
      status: timingData ? "ready" : "pending",
      source: "Timing",
      detail: timingData ? `${timingData.words.length} word cues` : "waiting for with-timestamps",
    },
    {
      id: "evt_analysis",
      type: "analysis.frame",
      status: sourceAudioUrl ? "active" : "pending",
      source: "Earworm",
      detail: "pitch, loudness, centroid, voiced",
    },
    {
      id: "evt_intent",
      type: "modulation.intent",
      status: "active",
      source: "DSP Designer",
      detail: `${automationLane.length} breath lane points`,
    },
    {
      id: "evt_automation",
      type: "automation.committed",
      status: renderCount > 0 ? "ready" : "pending",
      source: "Render Lab",
      detail: renderCount > 0 ? `${renderCount} DSP pass${renderCount === 1 ? "" : "es"}` : "no render pass",
    },
  ], [assetName, automationLane.length, generationId, modelId, outputFormat, renderCount, sourceAudioUrl, timingData, traits, voiceId]);

  const sidecar = useMemo(() => ({
    format: "algophony-studio-voice-design-v1",
    name: assetName,
    source_prompt: voicePrompt,
    script,
    generation_id: generationId,
    generated_voice_id: generatedVoiceId,
    elevenlabs_request: elevenlabsPayload,
    earworm_context: {
      session_id: `ew_${slug}`,
      signal_packet: {
        asset_id: generationId ?? `asset_${slug}`,
        kind: "generated_voice",
        context_refs: ["prompt.ingested", "generation.requested", "audio.generated", "alignment.ingested", "analysis.frame"],
      },
      events: earwormEvents.map((event) => ({
        id: event.id,
        type: event.type,
        status: event.status,
        source: event.source,
      })),
      automation_lanes: [
        {
          id: "breath_mix_from_context",
          target: "dsp.breath.mix",
          points: automationLane,
        },
      ],
    },
    dsp_processor_chain: dsp,
    quality_guard: {
      status: warnings.length ? "review" : "pass",
      warnings,
    },
  }), [assetName, automationLane, dsp, earwormEvents, elevenlabsPayload, generatedVoiceId, generationId, script, slug, voicePrompt, warnings]);

  const updateDsp = useCallback((key: keyof DspState, value: number) => {
    setDsp((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateVoiceSetting = useCallback((key: keyof Omit<VoiceSettings, "useSpeakerBoost">, value: number) => {
    setVoiceSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPromptPreset = useCallback(() => {
    setDsp(derivePromptDsp(voicePrompt));
    toast.info("Prompt preset applied");
  }, [toast, voicePrompt]);

  const resetDsp = useCallback(() => {
    setDsp(DEFAULT_DSP);
    toast.info("DSP reset");
  }, [toast]);

  const handleDesignVoice = useCallback(async () => {
    if (!voicePrompt.trim() || !script.trim()) return;
    setIsDesigningVoice(true);
    try {
      const response = await fetch("/api/elevenlabs/design-voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_description: voicePrompt.trim(),
          text: script.trim(),
          seed,
          guidance: 0.72,
          output_format: outputFormat,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Voice design failed");

      if (data.generatedVoiceId) {
        setGeneratedVoiceId(data.generatedVoiceId);
        setVoiceId(data.generatedVoiceId);
      }
      if (data.audioPreviewBase64) {
        setPreviewAudioUrl(`data:${mimeForFormat(outputFormat)};base64,${data.audioPreviewBase64}`);
      }
      if (typeof data.creditsRemaining === "number") {
        window.dispatchEvent(new CustomEvent("atlas:credits", { detail: { creditsRemaining: data.creditsRemaining } }));
      }
      toast.success("Voice preview designed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice design failed");
    } finally {
      setIsDesigningVoice(false);
    }
  }, [outputFormat, script, seed, toast, voicePrompt]);

  const handleGenerateSource = useCallback(async () => {
    if (!voiceId.trim() || !script.trim()) return;
    setIsGeneratingSource(true);
    try {
      const response = await fetch("/api/elevenlabs/text-to-speech-layer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...elevenlabsPayload,
          layer_role: "main",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "TTS generation failed");

      setSourceAudioUrl(data.audioUrl ?? null);
      setGenerationId(data.generationId ?? null);
      setActiveTake("source");
      if (typeof data.creditsRemaining === "number") {
        window.dispatchEvent(new CustomEvent("atlas:credits", { detail: { creditsRemaining: data.creditsRemaining } }));
      }
      if (data.audioUrl) {
        window.dispatchEvent(new CustomEvent("atlas:generation", {
          detail: {
            id: data.generationId ?? `voice-${Date.now()}`,
            url: data.audioUrl,
            title: assetName,
            longName: `${assetName} voice source`,
            filename: `${slug}.${outputFormat.startsWith("wav") ? "wav" : "mp3"}`,
            prompt: voicePrompt,
            category: "voice",
            duration: timingData?.totalDuration ?? null,
          },
        }));
      }
      toast.success("Voice source generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "TTS generation failed");
    } finally {
      setIsGeneratingSource(false);
    }
  }, [assetName, elevenlabsPayload, outputFormat, script, slug, timingData, toast, voiceId, voicePrompt]);

  const handleAttachTiming = useCallback(async () => {
    if (!voiceId.trim() || !script.trim()) return;
    setIsAligning(true);
    try {
      const response = await fetch("/api/elevenlabs/tts-with-timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(elevenlabsPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Timing request failed");

      setTimingData(data.timing);
      if (data.audioBase64 && !sourceAudioUrl) {
        setSourceAudioUrl(`data:${mimeForFormat(outputFormat)};base64,${data.audioBase64}`);
      }
      toast.success("Timing attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timing request failed");
    } finally {
      setIsAligning(false);
    }
  }, [elevenlabsPayload, outputFormat, script, sourceAudioUrl, toast, voiceId]);

  const commitDspPass = useCallback((take: "dsp-a" | "dsp-b") => {
    setActiveTake(take);
    setRenderCount((count) => count + 1);
    toast.success(take === "dsp-a" ? "DSP pass A committed" : "DSP pass B committed");
  }, [toast]);

  const downloadSidecar = useCallback(() => {
    const blob = new Blob([JSON.stringify(sidecar, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}.voice-design.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [sidecar, slug]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 pt-3 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <div className="space-y-4">
          <section className="atlas-card p-4">
            <PanelHeader icon={Mic} title="Prompt Studio" meta={assetName}>
              <button
                type="button"
                onClick={applyPromptPreset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs font-medium text-atlas-text-muted hover:border-atlas-text-dim hover:text-atlas-text"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Apply preset
              </button>
            </PanelHeader>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                <FieldLabel label="Originating prompt" value={`${voicePrompt.length} chars`} />
                <textarea
                  value={voicePrompt}
                  onChange={(event) => setVoicePrompt(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2.5 text-sm leading-relaxed text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none focus-visible:outline-none"
                  placeholder="Voice identity, delivery, body, breath, context..."
                />
                <FieldLabel label="Spoken text" value={`${script.split(/\s+/).filter(Boolean).length} words`} />
                <textarea
                  value={script}
                  onChange={(event) => setScript(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2.5 text-sm leading-relaxed text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none focus-visible:outline-none"
                  placeholder="Line, monologue, cue, narration, or dialogue fragment..."
                />
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-atlas-text">Prompt traits</span>
                    <Sparkles className="h-3.5 w-3.5 text-atlas-text-muted" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {traits.map((trait) => (
                      <span key={trait.id} className="rounded-md border border-atlas-border-subtle bg-atlas-surface px-2 py-1 text-[11px] text-atlas-text-muted">
                        {trait.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {traits.slice(0, 4).map((trait) => (
                      <div key={`${trait.id}-target`} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-atlas-text-dim">{trait.label}</span>
                        <span className="truncate font-mono text-atlas-text-muted">{trait.targets.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-atlas-text">Asset name</span>
                    <span className="rounded-md bg-atlas-surface px-2 py-1 font-mono text-[11px] text-atlas-text-muted">{slug}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-atlas-text">{assetName}</p>
                  <p className="mt-1 text-xs text-atlas-text-muted">Derived from the originating prompt.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="atlas-card p-4">
            <PanelHeader icon={Zap} title="ElevenLabs Source" meta={modelId}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDesignVoice}
                  disabled={isDesigningVoice || !voicePrompt.trim() || !script.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs font-medium text-atlas-text-muted hover:border-atlas-text-dim hover:text-atlas-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDesigningVoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Design voice
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSource}
                  disabled={isGeneratingSource || !voiceId.trim() || !script.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-atlas-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-atlas-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingSource ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Generate
                </button>
              </div>
            </PanelHeader>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <FieldLabel label="Voice ID" value={generatedVoiceId ? "designed" : "source"} />
                  <input
                    value={voiceId}
                    onChange={(event) => setVoiceId(event.target.value)}
                    className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 font-mono text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel label="Language" />
                    <input
                      value={languageCode}
                      onChange={(event) => setLanguageCode(event.target.value)}
                      className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Seed" />
                    <input
                      type="number"
                      value={seed}
                      onChange={(event) => setSeed(Number.parseInt(event.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Output" />
                  <select
                    value={outputFormat}
                    onChange={(event) => setOutputFormat(event.target.value)}
                    className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                  >
                    {OUTPUT_FORMATS.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {VOICE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setModelId(model.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left transition-colors",
                        modelId === model.id
                          ? "border-atlas-accent bg-atlas-accent-muted"
                          : "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
                      )}
                    >
                      <span className="block text-xs font-semibold text-atlas-text">{model.label}</span>
                      <span className="block text-[11px] text-atlas-text-muted">{model.detail}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <VoiceSettingSlider label="Stability" value={voiceSettings.stability} min={0} max={1} step={0.01} onChange={(value) => updateVoiceSetting("stability", value)} />
                  <VoiceSettingSlider label="Similarity" value={voiceSettings.similarityBoost} min={0} max={1} step={0.01} onChange={(value) => updateVoiceSetting("similarityBoost", value)} />
                  <VoiceSettingSlider label="Style" value={voiceSettings.style} min={0} max={1} step={0.01} onChange={(value) => updateVoiceSetting("style", value)} />
                  <VoiceSettingSlider label="Speed" value={voiceSettings.speed} min={0.7} max={1.2} step={0.01} onChange={(value) => updateVoiceSetting("speed", value)} />
                </div>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
                  <span className="text-xs font-medium text-atlas-text">Speaker boost</span>
                  <input
                    type="checkbox"
                    checked={voiceSettings.useSpeakerBoost}
                    onChange={(event) => setVoiceSettings((prev) => ({ ...prev, useSpeakerBoost: event.target.checked }))}
                    className="h-4 w-4 rounded accent-atlas-accent"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="atlas-card p-4">
            <PanelHeader icon={SlidersHorizontal} title="DSP Designer" meta={`${renderCount} committed`}>
              <button
                type="button"
                onClick={resetDsp}
                className="inline-flex items-center gap-1.5 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs font-medium text-atlas-text-muted hover:border-atlas-text-dim hover:text-atlas-text"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </PanelHeader>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-3 rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-atlas-text">Macro controls</span>
                  <Brain className="h-3.5 w-3.5 text-atlas-text-muted" />
                </div>
                {MACRO_CONTROLS.map((config) => (
                  <DspSlider key={config.key} config={config} value={dsp[config.key]} onChange={updateDsp} />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {DSP_MODULES.map(({ title, icon: Icon, sliders }) => (
                  <div key={title} className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-atlas-surface">
                        <Icon className="h-3.5 w-3.5 text-atlas-text-muted" />
                      </div>
                      <span className="text-xs font-semibold text-atlas-text">{title}</span>
                    </div>
                    <div className="space-y-3">
                      {sliders.map((config) => (
                        <DspSlider key={config.key} config={config} value={dsp[config.key]} onChange={updateDsp} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="atlas-card p-4">
            <PanelHeader icon={GitBranch} title="Persistent Listening" meta="Earworm chain">
              <button
                type="button"
                onClick={handleAttachTiming}
                disabled={isAligning || !voiceId.trim() || !script.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs font-medium text-atlas-text-muted hover:border-atlas-text-dim hover:text-atlas-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAligning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                Attach timing
              </button>
            </PanelHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChainColumn title="Signal chain" icon={Waves} items={["ElevenLabs source", "Alignment", "Analysis frames", "DSP render"]} />
              <ChainColumn title="Context chain" icon={Brain} items={["Prompt traits", "Request metadata", "Automation lanes", "Provenance"]} />
            </div>

            <div className="mt-4 space-y-2">
              {earwormEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
                  <StatusDot status={event.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-atlas-text">{event.type}</span>
                      <span className="shrink-0 text-[11px] text-atlas-text-dim">{event.source}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-atlas-text-muted">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="atlas-card p-4">
            <PanelHeader icon={Activity} title="Analysis and Automation" meta={timingData ? `${timingData.totalDuration.toFixed(2)}s` : "preflight"} />
            <div className="space-y-3">
              <FeatureMeter label="Pitch" value={Math.min(1, Math.abs(dsp.pitchShiftSt) / 12 + dsp.pitchContour * 0.35)} />
              <FeatureMeter label="Loudness" value={Math.min(1, 0.46 + dsp.proximityEq * 0.32 + dsp.tension * 0.18)} />
              <FeatureMeter label="Spectral centroid" value={Math.min(1, 0.38 + dsp.breathBrightness * 0.32 + dsp.transientClarity * 0.2)} />
              <FeatureMeter label="Voiced ratio" value={Math.max(0.08, 0.78 - dsp.whisperPressure * 0.35 - dsp.breathMix * 0.18)} />
            </div>

            <div className="mt-4 rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-atlas-text">Breath automation</span>
                <span className="font-mono text-[11px] text-atlas-text-dim">{automationLane.length} pts</span>
              </div>
              <div className="flex h-20 items-end gap-1 rounded-md bg-atlas-surface px-2 py-2">
                {automationLane.map((point, index) => (
                  <div key={`${point.time}-${point.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm bg-atlas-accent"
                      style={{ height: `${Math.max(10, point.value * 64)}px`, opacity: 0.36 + point.value * 0.5 }}
                    />
                    <span className="max-w-full truncate text-[10px] text-atlas-text-dim">{point.label || point.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="atlas-card p-4">
            <PanelHeader icon={Radio} title="Render Lab" meta={activeTake.toUpperCase()} />
            <div className="space-y-3">
              {previewAudioUrl && (
                <AudioPlayer src={previewAudioUrl} title="Voice design preview" downloadName={`${slug}.preview.mp3`} compact />
              )}
              <AudioPlayer src={sourceAudioUrl} title={sourceAudioUrl ? `${assetName} source` : "Source slot"} downloadName={`${slug}.source.mp3`} compact />

              <div className="grid grid-cols-3 gap-2">
                <RenderTakeButton label="Source" active={activeTake === "source"} ready={Boolean(sourceAudioUrl)} onClick={() => setActiveTake("source")} />
                <RenderTakeButton label="DSP A" active={activeTake === "dsp-a"} ready={renderCount > 0} onClick={() => commitDspPass("dsp-a")} />
                <RenderTakeButton label="DSP B" active={activeTake === "dsp-b"} ready={renderCount > 1} onClick={() => commitDspPass("dsp-b")} />
              </div>
            </div>
          </section>

          <section className="atlas-card p-4">
            <PanelHeader icon={ShieldCheck} title="Algophony Studio Voice Functions" meta={warnings.length ? "review" : "pass"} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FunctionTile icon={Sparkles} label="Trait extractor" value={`${traits.length} traits`} />
              <FunctionTile icon={Clock} label="Timing lane" value={timingData ? "aligned" : "pending"} />
              <FunctionTile icon={ShieldCheck} label="Intelligibility guard" value={warnings.length ? `${warnings.length} warnings` : "clear"} />
              <FunctionTile icon={FileJson} label="JSON sidecar" value="ready" />
            </div>
            {warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-atlas-warning/25 bg-atlas-warning/5 px-3 py-2">
                {warnings.map((warning) => (
                  <p key={warning} className="text-xs text-atlas-warning">{warning}</p>
                ))}
              </div>
            )}
          </section>

          <section className="atlas-card p-4">
            <PanelHeader icon={FileJson} title="Export Sidecar" meta={`${slug}.json`}>
              <button
                type="button"
                onClick={downloadSidecar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-atlas-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-atlas-accent-hover"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </PanelHeader>
            <pre className="max-h-72 overflow-auto rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3 text-[11px] leading-relaxed text-atlas-text-muted">
              {JSON.stringify(sidecar, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: LucideIcon;
  title: string;
  meta?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-atlas-border-subtle bg-atlas-bg">
          <Icon className="h-4 w-4 text-atlas-text-muted" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-atlas-text">{title}</h2>
          {meta && <p className="truncate text-xs text-atlas-text-muted">{meta}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label className="text-xs font-medium text-atlas-text-muted">{label}</label>
      {value && <span className="text-[11px] text-atlas-text-dim">{value}</span>}
    </div>
  );
}

function VoiceSettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-atlas-text-muted">{label}</span>
        <span className="font-mono text-[11px] text-atlas-text-dim">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className="atlas-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

function DspSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (key: keyof DspState, value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-atlas-text-muted">{config.label}</span>
        <span className="font-mono text-[11px] text-atlas-text-dim">{formatSliderValue(value, config)}</span>
      </div>
      <input
        type="range"
        className="atlas-slider"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(event) => onChange(config.key, Number(event.currentTarget.value))}
      />
    </div>
  );
}

function ChainColumn({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  return (
    <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-atlas-text-muted" />
        <span className="text-xs font-semibold text-atlas-text">{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-xs text-atlas-text-muted">
            <div className="h-1.5 w-1.5 rounded-full bg-atlas-accent" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: EarwormEvent["status"] }) {
  return (
    <span
      className={cn(
        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
        status === "ready" && "bg-atlas-success",
        status === "active" && "bg-atlas-warning",
        status === "pending" && "bg-atlas-text-dim"
      )}
    />
  );
}

function FeatureMeter({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-atlas-text-muted">{label}</span>
        <span className="font-mono text-[11px] text-atlas-text-dim">{Math.round(clamped * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-atlas-surface-hover">
        <div className="h-full rounded-full bg-atlas-accent" style={{ width: `${clamped * 100}%` }} />
      </div>
    </div>
  );
}

function RenderTakeButton({
  label,
  active,
  ready,
  onClick,
}: {
  label: string;
  active: boolean;
  ready: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition-colors",
        active ? "border-atlas-accent bg-atlas-accent-muted" : "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
      )}
    >
      <span className="block text-xs font-semibold text-atlas-text">{label}</span>
      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-atlas-text-muted">
        {ready ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
        {ready ? "ready" : "commit"}
      </span>
    </button>
  );
}

function FunctionTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-3">
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-3.5 w-3.5 text-atlas-text-muted" />
        <span className="rounded-md bg-atlas-surface px-2 py-0.5 font-mono text-[10px] text-atlas-text-dim">{value}</span>
      </div>
      <p className="mt-2 text-xs font-medium text-atlas-text">{label}</p>
    </div>
  );
}
