"use client";

import { useState, useMemo, useCallback } from "react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  FileAudio,
  Save,
  Wand2,
  X,
  Plus,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SFX_CATEGORIES, getCategoryDefinition } from "@/lib/sfx/taxonomy";
import { composePrompt } from "@/lib/sfx/compose-prompt";
import { criticize, type CriticReport } from "@/lib/sfx/critic";
import { DEFAULT_EXCLUSIONS } from "@/lib/sfx/taxonomy";
import type { SfxPromptAttributes } from "@/lib/sfx/prompt-schema";

const PERSPECTIVES = [
  "close-mic", "overhead", "distant", "room mic", "contact mic",
  "stereo pair", "binaural", "shotgun mic",
];

const DISTANCES = ["intimate", "close", "medium", "far", "very distant"];

const MOTIONS = [
  "steady", "accelerating", "decelerating", "irregular", "constant",
  "pulsing", "sweeping", "stuttering",
];

const RHYTHMS = [
  "regular", "irregular", "syncopated", "staccato", "legato",
  "random", "mechanical", "organic",
];

const DENSITIES = ["sparse", "moderate", "dense", "layered", "single"];

const TEXTURES = [
  "smooth", "grainy", "rough", "sharp", "soft", "gritty",
  "silky", "metallic", "woody", "crystalline",
];

const MOODS = [
  "tense", "eerie", "calm", "aggressive", "harsh", "soft",
  "hollow", "metallic", "organic", "industrial", "natural",
  "chaotic", "crisp", "warm", "cold", "raw", "gritty",
];

const REALISM_LEVELS = [
  "hyper-realistic", "realistic", "stylized", "cinematic",
  "lo-fi", "processed", "synthetic", "organic recording",
];

const DEFAULT_ATTRS: SfxPromptAttributes = {
  category: "Foley",
  loop: false,
  promptInfluence: 0.3,
  modelId: "eleven_text_to_sound_v2",
  exclusions: ["no music", "no dialogue"],
};

export default function CardEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardId = params.id;
  const isNew = cardId === "new";

  const getInitialAttrs = () => {
    const nextAttrs: SfxPromptAttributes = { ...DEFAULT_ATTRS };
    const get = (key: string) => searchParams.get(key) || undefined;
    nextAttrs.category = get("category") ?? nextAttrs.category;
    nextAttrs.sourceObject = get("sourceObject");
    nextAttrs.action = get("action");
    nextAttrs.material = get("material");
    nextAttrs.surface = get("surface");
    nextAttrs.environment = get("environment");
    nextAttrs.perspective = get("perspective");
    const duration = get("duration");
    nextAttrs.durationSeconds = duration ? Number(duration) : undefined;
    nextAttrs.loop = searchParams.get("loop") === "true";
    return nextAttrs;
  };

  const [attrs, setAttrs] = useState<SfxPromptAttributes>(() =>
    isNew ? getInitialAttrs() : DEFAULT_ATTRS
  );
  const [title, setTitle] = useState(
    () => searchParams.get("title") ?? "Untitled SFX Prompt"
  );
  const [newExclusion, setNewExclusion] = useState("");
  const [criticReport, setCriticReport] = useState<CriticReport | null>(null);
  const [lastGenerationWasMock, setLastGenerationWasMock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const categoryDef = useMemo(
    () => getCategoryDefinition(attrs.category),
    [attrs.category]
  );

  const composedPrompt = useMemo(() => composePrompt(attrs), [attrs]);

  useAbortableFetch(async (signal) => {
    if (isNew) return;

    try {
      const res = await fetch(`/api/cards/${cardId}`, { signal });
      if (!res.ok) {
        if (!signal.aborted) setStatusMessage("Could not load this prompt card.");
        return;
      }
      const { card } = await res.json();
      if (signal.aborted) return;
      setTitle(card.title ?? "Untitled SFX Prompt");
      setAttrs({
        category: card.category ?? "Foley",
        subcategory: card.subcategory ?? undefined,
        sourceObject: card.source_object ?? undefined,
        action: card.action ?? undefined,
        material: card.material ?? undefined,
        surface: card.surface ?? undefined,
        environment: card.environment ?? undefined,
        acousticSpace: card.acoustic_space ?? undefined,
        perspective: card.perspective ?? undefined,
        distance: card.distance ?? undefined,
        motion: card.motion ?? undefined,
        rhythm: card.rhythm ?? undefined,
        density: card.density ?? undefined,
        texture: card.texture ?? undefined,
        mood: card.mood ?? undefined,
        realismLevel: card.realism_level ?? undefined,
        durationSeconds: card.duration_seconds ?? undefined,
        loop: card.loop ?? false,
        promptInfluence: card.prompt_influence ?? 0.3,
        modelId: "eleven_text_to_sound_v2",
        outputFormat: card.output_format ?? undefined,
        exclusions: card.exclusions ?? [],
        useCase: card.use_case ?? undefined,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[cards/[id]] load failed:", err);
      if (!signal.aborted) setStatusMessage("Could not load this prompt card.");
    }
  }, [cardId, isNew]);

  const updateAttr = useCallback(
    <K extends keyof SfxPromptAttributes>(key: K, value: SfxPromptAttributes[K]) => {
      setAttrs((prev) => ({ ...prev, [key]: value }));
      setCriticReport(null);
    },
    []
  );

  const runCritic = () => setCriticReport(criticize(attrs));

  const saveCard = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(isNew ? "/api/cards" : `/api/cards/${cardId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, attributes: attrs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save card");
      setStatusMessage("Prompt card saved.");
      if (isNew && data.card?.id) {
        router.replace(`/dashboard/cards/${data.card.id}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const generateSfx = async () => {
    setGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/elevenlabs/generate-sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptCardId: isNew ? undefined : cardId,
          text: composedPrompt,
          duration_seconds: attrs.durationSeconds ?? null,
          loop: attrs.loop,
          prompt_influence: attrs.promptInfluence,
          model_id: attrs.modelId,
          output_format: attrs.outputFormat,
          exclusion_constraints: attrs.exclusions ?? ["no music", "no dialogue"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setLastGenerationWasMock(Boolean(data.isMock));
      setStatusMessage(
        `Generated sound. Credits remaining: ${data.creditsRemaining}`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const applyFixes = () => {
    if (!criticReport) return;
    // Parse improved prompt isn't directly mappable back, but apply known fixes
    const issues = criticReport.issues;
    const updates: Partial<SfxPromptAttributes> = {};

    for (const issue of issues) {
      if (issue.field === "perspective" && !attrs.perspective) {
        updates.perspective = "close-mic";
      }
      if (issue.field === "exclusions" && attrs.exclusions.length === 0) {
        updates.exclusions = ["no music", "no dialogue"];
      }
      if (issue.field === "sourceObject" && !attrs.sourceObject) {
        updates.sourceObject = attrs.subcategory || attrs.category.toLowerCase();
      }
    }

    setAttrs((prev) => ({ ...prev, ...updates }));
    setCriticReport(null);
  };

  const addExclusion = () => {
    const tag = newExclusion.trim();
    if (tag && !attrs.exclusions.includes(tag)) {
      updateAttr("exclusions", [...attrs.exclusions, tag]);
      setNewExclusion("");
    }
  };

  const removeExclusion = (tag: string) => {
    updateAttr("exclusions", attrs.exclusions.filter((e) => e !== tag));
  };

  return (
    <div className="flex h-full">
      {/* Main editor */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-atlas-text">
              Prompt Card Editor
            </h1>
            <p className="text-sm text-atlas-text-muted">
              Fine-tune attributes and compose your ElevenLabs prompt.
            </p>
          </div>
          <button
            onClick={saveCard}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-atlas-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Card"}
          </button>
        </div>

        <label className="mb-6 block">
          <span className="mb-1 block text-xs text-atlas-text-muted">Card Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
          />
        </label>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Source & Action */}
          <div className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
              Source & Action
            </h3>

            {/* Category */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Category</span>
              <select
                value={attrs.category}
                onChange={(e) => updateAttr("category", e.target.value)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                {SFX_CATEGORIES.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </label>

            {/* Subcategory */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Subcategory</span>
              <select
                value={attrs.subcategory || ""}
                onChange={(e) => updateAttr("subcategory", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {(categoryDef?.subcategories ?? []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            {/* Source Object */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Source Object</span>
              <input
                type="text"
                value={attrs.sourceObject || ""}
                onChange={(e) => updateAttr("sourceObject", e.target.value || undefined)}
                placeholder="e.g., heavy boots, glass bottle"
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
              />
            </label>

            {/* Action */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Action</span>
              <input
                type="text"
                value={attrs.action || ""}
                onChange={(e) => updateAttr("action", e.target.value || undefined)}
                placeholder="e.g., walking slowly, shattering"
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
              />
            </label>

            {/* Material */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Material</span>
              <input
                type="text"
                value={attrs.material || ""}
                onChange={(e) => updateAttr("material", e.target.value || undefined)}
                placeholder="e.g., metal, glass, wood"
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
              />
            </label>

            {/* Surface */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Surface</span>
              {categoryDef?.surfaces ? (
                <select
                  value={attrs.surface || ""}
                  onChange={(e) => updateAttr("surface", e.target.value || undefined)}
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
                >
                  <option value="">Select...</option>
                  {categoryDef.surfaces.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={attrs.surface || ""}
                  onChange={(e) => updateAttr("surface", e.target.value || undefined)}
                  placeholder="e.g., wet concrete, gravel"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
                />
              )}
            </label>
          </div>

          {/* Right column: Spatial & Tonal */}
          <div className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
              Spatial & Tonal
            </h3>

            {/* Environment */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Environment</span>
              {categoryDef?.environments ? (
                <select
                  value={attrs.environment || ""}
                  onChange={(e) => updateAttr("environment", e.target.value || undefined)}
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
                >
                  <option value="">Select...</option>
                  {categoryDef.environments.map((env) => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={attrs.environment || ""}
                  onChange={(e) => updateAttr("environment", e.target.value || undefined)}
                  placeholder="e.g., empty hallway, dense forest"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
                />
              )}
            </label>

            {/* Acoustic Space */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Acoustic Space</span>
              <input
                type="text"
                value={attrs.acousticSpace || ""}
                onChange={(e) => updateAttr("acousticSpace", e.target.value || undefined)}
                placeholder="e.g., small reverberant room"
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
              />
            </label>

            {/* Perspective */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Perspective</span>
              <select
                value={attrs.perspective || ""}
                onChange={(e) => updateAttr("perspective", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {PERSPECTIVES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>

            {/* Distance */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Distance</span>
              <select
                value={attrs.distance || ""}
                onChange={(e) => updateAttr("distance", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {DISTANCES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            {/* Motion */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Motion</span>
              <select
                value={attrs.motion || ""}
                onChange={(e) => updateAttr("motion", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {MOTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            {/* Rhythm */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Rhythm</span>
              <select
                value={attrs.rhythm || ""}
                onChange={(e) => updateAttr("rhythm", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {RHYTHMS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            {/* Density */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Density</span>
              <select
                value={attrs.density || ""}
                onChange={(e) => updateAttr("density", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {DENSITIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            {/* Texture */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Texture</span>
              <select
                value={attrs.texture || ""}
                onChange={(e) => updateAttr("texture", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {TEXTURES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            {/* Mood */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Mood</span>
              <select
                value={attrs.mood || ""}
                onChange={(e) => updateAttr("mood", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {MOODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            {/* Realism Level */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Realism Level</span>
              <select
                value={attrs.realismLevel || ""}
                onChange={(e) => updateAttr("realismLevel", e.target.value || undefined)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Select...</option>
                {REALISM_LEVELS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* ElevenLabs Controls */}
        <div className="mt-8 rounded-xl border border-atlas-border bg-atlas-surface p-6">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
            ElevenLabs Controls
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Duration */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Duration (seconds)</span>
              <input
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                value={attrs.durationSeconds ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? parseFloat(e.target.value) : null;
                  updateAttr("durationSeconds", v);
                }}
                placeholder="Auto"
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
              />
            </label>

            {/* Loop */}
            <label className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                checked={attrs.loop}
                onChange={(e) => updateAttr("loop", e.target.checked)}
                className="h-4 w-4 rounded border-atlas-border accent-atlas-accent"
              />
              <span className="text-sm text-atlas-text">Seamless Loop</span>
            </label>

            {/* Prompt Influence */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">
                Prompt Influence ({attrs.promptInfluence.toFixed(2)})
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={attrs.promptInfluence}
                onChange={(e) => updateAttr("promptInfluence", parseFloat(e.target.value))}
                className="w-full accent-atlas-accent"
              />
            </label>

            {/* Model ID (readonly) */}
            <label className="block">
              <span className="mb-1 block text-xs text-atlas-text-muted">Model</span>
              <input
                type="text"
                value={attrs.modelId}
                readOnly
                className="w-full rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2 text-xs font-mono text-atlas-text-dim"
              />
            </label>
          </div>
        </div>

        {/* Exclusions */}
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
            Exclusion Tags
          </h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {attrs.exclusions.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-md border border-red-900/30 bg-red-950/20 px-2.5 py-1 text-xs text-red-400"
              >
                {tag}
                <button
                  onClick={() => removeExclusion(tag)}
                  className="text-red-500 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExclusion()}
              placeholder="Add exclusion..."
              className="flex-1 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
            />
            <button
              onClick={addExclusion}
              className="rounded-lg border border-atlas-border px-3 py-2 text-sm text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {/* Quick-add defaults */}
          <div className="mt-2 flex flex-wrap gap-1">
            {DEFAULT_EXCLUSIONS.filter((d) => !attrs.exclusions.includes(d)).map((d) => (
              <button
                key={d}
                onClick={() => updateAttr("exclusions", [...attrs.exclusions, d])}
                className="rounded-md border border-atlas-border-subtle px-2 py-0.5 text-xs text-atlas-text-dim transition-colors hover:border-atlas-border hover:text-atlas-text-muted"
              >
                + {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right inspector: Prompt Preview + Critic */}
      <div className="w-80 shrink-0 overflow-y-auto border-l border-atlas-border-subtle bg-atlas-surface p-4">
        {/* Prompt preview */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
            <Sparkles className="h-3 w-3" />
            Composed Prompt
          </div>
          <div className="rounded-lg border border-atlas-border bg-atlas-bg p-3">
            <p className="font-mono text-xs leading-relaxed text-atlas-text">
              {composedPrompt || "Fill in attributes to compose a prompt."}
            </p>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-atlas-text-dim">
            <span
              className={
                composedPrompt.length > 450 ? "text-atlas-danger" : ""
              }
            >
              {composedPrompt.length} / 450 chars
            </span>
          </div>
        </div>

        {/* Mock indicator */}
        {lastGenerationWasMock && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-atlas-mock/30 bg-yellow-950/20 px-3 py-2 text-xs text-atlas-mock">
            <AlertCircle className="h-3.5 w-3.5" />
            Last generation used mock mode — no ElevenLabs API call
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2 text-xs text-atlas-text-muted">
            {statusMessage}
          </div>
        )}

        {/* Actions */}
        <div className="mb-6 space-y-2">
          <button
            onClick={runCritic}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-atlas-border px-4 py-2.5 text-sm font-medium text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text"
          >
            <Wand2 className="h-4 w-4" />
            Run Prompt Critic
          </button>
          <button
            onClick={generateSfx}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-atlas-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* Critic report */}
        {criticReport && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-bold ${
                    criticReport.grade === "strong"
                      ? "text-atlas-success"
                      : criticReport.grade === "usable"
                      ? "text-atlas-warning"
                      : "text-atlas-danger"
                  }`}
                >
                  {criticReport.score}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    criticReport.grade === "strong"
                      ? "bg-green-950/40 text-green-400"
                      : criticReport.grade === "usable"
                      ? "bg-yellow-950/40 text-yellow-400"
                      : "bg-red-950/40 text-red-400"
                  }`}
                >
                  {criticReport.grade}
                </span>
              </div>
            </div>

            {criticReport.issues.length > 0 && (
              <>
                <div className="mb-3 space-y-2">
                  {criticReport.issues.map((issue, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-atlas-border-subtle bg-atlas-bg p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            issue.severity === "high"
                              ? "bg-atlas-danger"
                              : issue.severity === "medium"
                              ? "bg-atlas-warning"
                              : "bg-atlas-text-dim"
                          }`}
                        />
                        <span className="text-xs font-medium text-atlas-text-muted">
                          {issue.field}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-atlas-text-dim">
                        {issue.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={applyFixes}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-atlas-accent/40 bg-atlas-accent-muted px-3 py-2 text-xs font-medium text-atlas-accent transition-colors hover:bg-atlas-accent/20"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Apply Suggested Fixes
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
