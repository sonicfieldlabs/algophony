"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Save } from "lucide-react";
import { useToast } from "@/app/dashboard/toast";
import { AudioCleanupPanel } from "@/app/dashboard/components/AudioCleanupPanel";
import { TimingSyncPanel } from "@/app/dashboard/components/TimingSyncPanel";
import { SceneCoverageGenerator } from "@/app/dashboard/components/SceneCoverageGenerator";
import { CueDescriptionPanel } from "./CueDescriptionPanel";
import { LayerStackEditor } from "./LayerStackEditor";
import { LocalSoundLayerBrowser, type BrowserSoundAsset } from "./LocalSoundLayerBrowser";
import { FrequencyRolePlanner } from "./FrequencyRolePlanner";
import { StackerMixer } from "./StackerMixer";
import { StackerQueue } from "./StackerQueue";
import { StackerResultsPanel } from "./StackerResultsPanel";
import { StackerExportPanel } from "./StackerExportPanel";
import type {
  StackerCue,
  StackerLayer,
  CueContext,
  NamingConvention,
  StackerImportPayload,
} from "@/lib/sfx/stacker-taxonomy";
import {
  createDefaultCue,
  createDefaultLayer,
  MAX_LAYERS,
  STACKER_IMPORT_KEY,
} from "@/lib/sfx/stacker-taxonomy";
import {
  decomposeEvent,
  composeLayerPrompt,
} from "@/lib/sfx/stacker-prompt";

// ── Storage ───────────────────────────────────────────────────

const STORAGE_KEY = "algophony-studio-stacker-cues";

function loadCues(): StackerCue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCues(cues: StackerCue[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cues));
  }
}

// ── Page ──────────────────────────────────────────────────────

export default function StackerPage() {
  const toast = useToast();

  // Cues state
  const [cues, setCues] = useState<StackerCue[]>(() => loadCues());
  const [activeCueId, setActiveCueId] = useState<string | null>(cues[0]?.id ?? null);
  const activeCue = cues.find((c) => c.id === activeCueId) ?? null;

  // Form state
  const [description, setDescription] = useState(activeCue?.description ?? "");
  const [context, setContext] = useState<CueContext>(activeCue?.context ?? "film_scene");
  const [cueName, setCueName] = useState(activeCue?.name ?? "Untitled Cue");
  const [layers, setLayers] = useState<StackerLayer[]>(activeCue?.layers ?? []);
  const [namingConvention, setNamingConvention] = useState<NamingConvention>(activeCue?.namingConvention ?? "film_foley");

  // Generation state
  const [queueStatus, setQueueStatus] = useState<"idle" | "running" | "paused" | "completed">("idle");
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);

  // ── Cross-module import handler ─────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const rawImport = localStorage.getItem(STACKER_IMPORT_KEY);
      if (!rawImport || cancelled) return;

      try {
        const payload: StackerImportPayload = JSON.parse(rawImport);
        localStorage.removeItem(STACKER_IMPORT_KEY);

        setLayers((prev) => {
          const newLayer = createDefaultLayer(payload.layerType ?? "body", prev.length);
          newLayer.promptText = payload.promptText;
          newLayer.audioUrl = payload.audioUrl;
          newLayer.importedFrom = payload.cardId ?? payload.soundId ?? payload.sourceAssetId;
          newLayer.importedModule = payload.module;
          newLayer.sourceKind = payload.sourceKind;
          newLayer.sourceAssetId = payload.sourceAssetId;
          newLayer.sourceFileName = payload.sourceFileName;
          newLayer.sourcePath = payload.sourcePath;
          newLayer.metadata = payload.metadata;
          if (payload.frequencyRole) newLayer.frequencyRole = payload.frequencyRole;
          if (payload.audioUrl) newLayer.status = "generated";
          return [...prev, newLayer];
        });
        toast.success(`Imported layer from ${payload.module}`);
      } catch {
        // Invalid import payload — ignore
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [toast]);

  // ── Persistence ─────────────────────────────────────────────

  const persistCues = useCallback((updated: StackerCue[]) => {
    setCues(updated);
    saveCues(updated);
  }, []);

  const saveCue = useCallback(() => {
    const cue: StackerCue = {
      id: activeCueId ?? `cue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cueName,
      description,
      context,
      layers,
      namingConvention,
      status: layers.some((l) => l.status === "generated") ? "completed" : "draft",
      createdAt: activeCue?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    const updated = activeCueId
      ? cues.map((c) => (c.id === activeCueId ? cue : c))
      : [cue, ...cues];

    persistCues(updated);
    if (!activeCueId) setActiveCueId(cue.id);
    toast.success("Cue saved");
  }, [activeCueId, cueName, description, context, layers, namingConvention, activeCue, cues, persistCues, toast]);

  // ── Decompose ───────────────────────────────────────────────

  const handleDecompose = useCallback(() => {
    const result = decomposeEvent(description, context);
    setLayers(result.layers);
    if (cueName === "Untitled Cue" || !cueName) {
      setCueName(result.cueName);
    }
    toast.success(`${result.layers.length} layers generated from cue`);
  }, [description, context, cueName, toast]);

  const handleImportAsset = useCallback((
    asset: BrowserSoundAsset,
    role?: { layerType: StackerLayer["layerType"]; frequencyRole: StackerLayer["frequencyRole"] },
  ) => {
    if (layers.length >= MAX_LAYERS) {
      toast.error(`Stacks can contain up to ${MAX_LAYERS} layers`);
      return;
    }

    const layerType = role?.layerType ?? asset.stack.suggestedLayerType ?? asset.metadata.layerType ?? "body";
    const layer = createDefaultLayer(layerType, layers.length);
    layer.frequencyRole = role?.frequencyRole ?? asset.stack.suggestedFrequencyRole ?? asset.metadata.frequencyRole ?? layer.frequencyRole;
    layer.promptText = asset.promptCandidate || asset.prompt || asset.title;
    layer.audioUrl = asset.audioUrl ?? undefined;
    layer.status = asset.audioUrl ? "generated" : "draft";
    layer.durationSeconds = normalizeLayerDuration(asset.technical.durationSeconds ?? asset.metadata.durationSeconds, layer.durationSeconds);
    layer.importedFrom = asset.sourceId;
    layer.importedModule = asset.source === "imported" ? "local-library" : "generations";
    layer.sourceKind = asset.source;
    layer.sourceAssetId = asset.id;
    layer.sourceFileName = asset.fileName;
    layer.sourcePath = asset.provenance.relativePath ?? asset.provenance.storagePath ?? asset.provenance.absolutePath;
    layer.metadata = {
      tags: asset.tags,
      category: asset.metadata.category,
      action: asset.metadata.action,
      material: asset.metadata.material,
      modelId: asset.provenance.modelId,
    };

    setLayers([...layers, layer]);
    toast.success(`Added ${asset.source} layer`);
  }, [layers, toast]);

  // ── Generate ────────────────────────────────────────────────

  const handleStartGeneration = useCallback(async () => {
    const eligible = layers.filter((l) => !l.muted && l.status !== "generated");
    if (eligible.length === 0) {
      toast.error("No layers to generate");
      return;
    }

    setQueueStatus("running");
    cancelRef.current = false;
    pauseRef.current = false;

    const layersCopy = [...layers];
    const cueSnapshot: StackerCue = {
      id: activeCueId ?? "temp",
      name: cueName,
      description,
      context,
      layers: layersCopy,
      namingConvention,
      status: "generating",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let generated = 0;

    for (let i = 0; i < layersCopy.length; i++) {
      if (layersCopy[i].muted || layersCopy[i].status === "generated") continue;
      if (cancelRef.current) {
        layersCopy[i] = { ...layersCopy[i], status: "draft" };
        continue;
      }

      // Pause loop
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelRef.current) break;
      }

      // Mark generating
      layersCopy[i] = { ...layersCopy[i], status: "generating" };
      setLayers([...layersCopy]);

      // Compose prompt with frequency injection
      const composedPrompt = composeLayerPrompt(layersCopy[i], cueSnapshot);

      try {
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: composedPrompt,
            duration_seconds: layersCopy[i].durationSeconds,
            loop: layersCopy[i].loop,
            prompt_influence: layersCopy[i].promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          layersCopy[i] = {
            ...layersCopy[i],
            status: "generated",
            audioUrl: data.audioUrl,
            generationId: data.generationId,
          };
          generated++;
        } else {
          layersCopy[i] = {
            ...layersCopy[i],
            status: "failed",
            errorMessage: data.error || "Generation failed",
          };
        }
      } catch {
        layersCopy[i] = {
          ...layersCopy[i],
          status: "failed",
          errorMessage: "Network error",
        };
      }

      setLayers([...layersCopy]);
    }

    setQueueStatus(cancelRef.current ? "idle" : "completed");
    toast.success(`${generated}/${eligible.length} layers generated`);
  }, [layers, activeCueId, cueName, description, context, namingConvention, toast]);

  const handlePause = useCallback(() => {
    pauseRef.current = true;
    setQueueStatus("paused");
  }, []);

  const handleResume = useCallback(() => {
    pauseRef.current = false;
    setQueueStatus("running");
  }, []);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    setQueueStatus("idle");
  }, []);

  const handleRetryFailed = useCallback(async () => {
    const failed = layers.filter((l) => l.status === "failed");
    if (failed.length === 0) return;

    setQueueStatus("running");
    cancelRef.current = false;

    const layersCopy = [...layers];
    const cueSnapshot: StackerCue = {
      id: activeCueId ?? "temp",
      name: cueName,
      description,
      context,
      layers: layersCopy,
      namingConvention,
      status: "generating",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let retried = 0;

    for (const fl of failed) {
      if (cancelRef.current) break;
      const idx = layersCopy.findIndex((l) => l.id === fl.id);
      if (idx < 0) continue;

      layersCopy[idx] = { ...layersCopy[idx], status: "generating" };
      setLayers([...layersCopy]);

      const composedPrompt = composeLayerPrompt(layersCopy[idx], cueSnapshot);

      try {
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: composedPrompt,
            duration_seconds: layersCopy[idx].durationSeconds,
            loop: layersCopy[idx].loop,
            prompt_influence: layersCopy[idx].promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          layersCopy[idx] = { ...layersCopy[idx], status: "generated", audioUrl: data.audioUrl, generationId: data.generationId, errorMessage: undefined };
          retried++;
        } else {
          layersCopy[idx] = { ...layersCopy[idx], status: "failed", errorMessage: data.error };
        }
      } catch {
        layersCopy[idx] = { ...layersCopy[idx], status: "failed", errorMessage: "Network error" };
      }

      setLayers([...layersCopy]);
    }

    setQueueStatus("completed");
    toast.success(`${retried}/${failed.length} retries succeeded`);
  }, [layers, activeCueId, cueName, description, context, namingConvention, toast]);

  // ── New cue ─────────────────────────────────────────────────

  const handleNewCue = useCallback(() => {
    const nc = createDefaultCue();
    persistCues([nc, ...cues]);
    setActiveCueId(nc.id);
    setDescription("");
    setCueName("Untitled Cue");
    setContext("film_scene");
    setLayers([]);
    setNamingConvention("film_foley");
    setQueueStatus("idle");
    toast.success("New cue created");
  }, [cues, persistCues, toast]);

  // ── Load cue on switch ──────────────────────────────────────

  const handleCueSwitch = useCallback((id: string) => {
    setActiveCueId(id);
    const cue = cues.find((c) => c.id === id);
    if (cue) {
      setDescription(cue.description);
      setCueName(cue.name);
      setContext(cue.context);
      setLayers(cue.layers);
      setNamingConvention(cue.namingConvention);
    }
  }, [cues]);

  // ── Build current cue object for export ─────────────────────

  const currentCue: StackerCue = {
    id: activeCueId ?? "temp",
    name: cueName,
    description,
    context,
    layers,
    namingConvention,
    status: layers.some((l) => l.status === "generated") ? "completed" : "draft",
    createdAt: activeCue?.createdAt ?? 0,
    updatedAt: activeCue?.updatedAt ?? activeCue?.createdAt ?? 0,
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* Cue controls — page title now lives in the topbar. */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {cues.length > 0 && (
            <select
              value={activeCueId ?? ""}
              onChange={(e) => handleCueSwitch(e.target.value)}
              className="rounded-xl border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text"
            >
              {cues.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button onClick={saveCue} className="flex items-center gap-1 rounded-xl border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors">
            <Save className="h-3 w-3" /> Save
          </button>
          <button onClick={handleNewCue} className="rounded-xl border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors">
            + New
          </button>
        </div>
      </div>

      {/* Section 1 — Cue Description */}
      <CueDescriptionPanel
        description={description}
        context={context}
        cueName={cueName}
        onDescriptionChange={setDescription}
        onContextChange={setContext}
        onCueNameChange={setCueName}
        onDecompose={handleDecompose}
        hasLayers={layers.length > 0}
      />

      {/* Section 1.5 — Scene Coverage Generator */}
      <SceneCoverageGenerator />

      {/* Section 2 — Layer Stack Editor */}
      <LayerStackEditor layers={layers} onChange={setLayers} />

      {/* Section 2.5 — Local and generated asset browser */}
      <LocalSoundLayerBrowser
        cueDescription={description}
        layers={layers}
        onImportAsset={handleImportAsset}
      />

      {/* Section 3+4 side by side */}
      {layers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FrequencyRolePlanner layers={layers} />
          <StackerMixer layers={layers} onChange={setLayers} />
        </div>
      )}

      {/* Section 5 — Queue */}
      <StackerQueue
        layers={layers}
        queueStatus={queueStatus}
        onStart={handleStartGeneration}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        onRetryFailed={handleRetryFailed}
      />

      {/* Section 6 — Results */}
      <StackerResultsPanel layers={layers} />

      {/* Section 7 — Audio Cleanup & Timing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AudioCleanupPanel context="Stacker" compact />
        <TimingSyncPanel compact />
      </div>

      {/* Section 8 — Export */}
      <StackerExportPanel cue={currentCue} onNamingChange={setNamingConvention} />
    </div>
  );
}

function normalizeLayerDuration(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0.5, Math.min(30, Math.round(value * 10) / 10));
}
