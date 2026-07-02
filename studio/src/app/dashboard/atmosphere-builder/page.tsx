"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Database, HardDrive, Layers as LayersIcon, Sparkles, AudioWaveform } from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";
import { useToast } from "@/app/dashboard/toast";
import { AtmosphereBriefForm } from "./AtmosphereBriefForm";
import { LayerDecomposer } from "./LayerDecomposer";
import { AtmosphereMixer } from "./AtmosphereMixer";
import { GenerationQueue } from "./GenerationQueue";
import { AtmosphereSetPanel } from "./AtmosphereSetPanel";
import { VariationCycles, type VariationSet } from "./VariationCycles";
import { ExportManifest } from "./ExportManifest";
import {
  type AtmosphereBrief,
  type AtmosphereLayer,
  type AtmosphereLayerType,
  type AtmosphereProject,
  getDefaultBrief,
  getLayerDef,
  createDefaultProject,
} from "@/lib/sfx/atmosphere-taxonomy";
import {
  decomposeAtmosphere,
  composeLayerPrompt,
} from "@/lib/sfx/atmosphere-prompt";

// ── Persistence mode ───────────────────────────────────────────

type PersistenceMode = "api" | "local";

const LS_KEY = "algophony-studio-atmosphere-projects";

function loadProjectsLocal(): AtmosphereProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjectsLocal(projects: AtmosphereProject[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

// ── API helpers ────────────────────────────────────────────────

async function apiListProjects(): Promise<AtmosphereProject[]> {
  const res = await fetch("/api/atmosphere/projects");
  if (!res.ok) throw new Error("Failed to load projects");
  const data = await res.json();
  // Convert DB shape → client shape
  return (data.projects ?? []).map(dbProjectToClient);
}

async function apiCreateProject(brief: AtmosphereBrief, name: string): Promise<AtmosphereProject> {
  const res = await fetch("/api/atmosphere/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      scene_description: brief.scene,
      location: brief.location,
      time_of_day: brief.timeOfDay,
      weather: brief.weather,
      emotional_tone: brief.emotionalTone,
      narrative_function: brief.narrativeFunction,
      realism_level: brief.realismLevel,
      density: brief.density,
      human_presence: brief.humanPresence,
      animal_presence: brief.animalPresence,
      machine_presence: brief.machinePresence,
      synthetic_presence: brief.syntheticPresence,
      avoided_sounds: brief.avoidedSounds,
      dramatic_values: brief.dramaticValues,
    }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  const data = await res.json();
  return dbProjectToClient(data.project);
}

async function apiUpdateProject(id: string, brief: AtmosphereBrief, name: string): Promise<void> {
  await fetch(`/api/atmosphere/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      scene_description: brief.scene,
      location: brief.location,
      time_of_day: brief.timeOfDay,
      weather: brief.weather,
      emotional_tone: brief.emotionalTone,
      narrative_function: brief.narrativeFunction,
      realism_level: brief.realismLevel,
      density: brief.density,
      human_presence: brief.humanPresence,
      animal_presence: brief.animalPresence,
      machine_presence: brief.machinePresence,
      synthetic_presence: brief.syntheticPresence,
      avoided_sounds: brief.avoidedSounds,
      dramatic_values: brief.dramaticValues,
    }),
  });
}

async function apiSyncLayers(
  projectId: string,
  layers: AtmosphereLayer[]
): Promise<void> {
  // Batch layer creation/update — simple approach: save each layer
  for (const layer of layers) {
    await fetch("/api/atmosphere/layers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        atmosphere_project_id: projectId,
        layer_type: layer.layerType,
        layer_role: layer.layerRole,
        prompt_text: layer.promptText,
        intensity: layer.intensity,
        density: layer.density,
        distance: layer.distance,
        movement: layer.movement,
        frequency_role: layer.frequencyRole,
        loopable: layer.loopable,
        duration_seconds: layer.durationSeconds,
        prompt_influence: layer.promptInfluence,
        priority: layer.priority,
        audio_url: layer.audioUrl,
        generated_sound_id: layer.generationId,
        status: layer.status === "generating" ? "draft" : layer.status,
      }),
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbProjectToClient(db: any): AtmosphereProject {
  return {
    id: db.id,
    name: db.name,
    brief: {
      title: db.name ?? "",
      scene: db.scene_description ?? "",
      location: db.location ?? "",
      timeOfDay: db.time_of_day ?? "unspecified",
      weather: db.weather ?? "clear",
      emotionalTone: db.emotional_tone ?? "",
      narrativeFunction: db.narrative_function ?? "",
      realismLevel: db.realism_level ?? "realistic",
      density: db.density ?? "moderate",
      humanPresence: db.human_presence ?? "none",
      animalPresence: db.animal_presence ?? "moderate",
      machinePresence: db.machine_presence ?? "none",
      syntheticPresence: db.synthetic_presence ?? "none",
      avoidedSounds: db.avoided_sounds ?? [],
      dramaticValues: db.dramatic_values ?? {},
    },
    layers: [],
    defaultDuration: db.default_duration ?? 20,
    loop: db.loop ?? true,
    promptInfluence: db.prompt_influence ?? 0.3,
    outputFormat: db.output_format ?? "mp3_44100_128",
    modelId: db.model_id ?? "eleven_text_to_sound_v2",
    createdAt: new Date(db.created_at).getTime(),
    updatedAt: new Date(db.updated_at).getTime(),
  };
}

// ── Page Component ─────────────────────────────────────────────

export default function AtmosphereBuilderPage() {
  const toast = useToast();

  // Persistence mode — try API first, fall back to local
  const [mode, setMode] = useState<PersistenceMode>("local");
  const modeDetected = useRef(false);

  // Projects
  const [projects, setProjects] = useState<AtmosphereProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [currentLayerId, setCurrentLayerId] = useState<string | null>(null);

  // Variation cycles state
  const [variationSets, setVariationSets] = useState<VariationSet[]>([]);

  // Authoring mode — "layers" decomposes a brief into multiple atmosphere
  // layers (current behavior); "single" exposes a /generate-style box for a
  // one-shot custom prompt without a brief/decomposer.
  type AuthoringMode = "layers" | "single";
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>("layers");
  const [singlePrompt, setSinglePrompt] = useState("");
  const [singleDuration, setSingleDuration] = useState(20);
  const [singlePromptInfluence, setSinglePromptInfluence] = useState(0.3);
  const [singleLoop, setSingleLoop] = useState(true);
  const [singleGenerating, setSingleGenerating] = useState(false);
  const [singleResult, setSingleResult] = useState<{ audioUrl: string; characterCost: number; isMock: boolean } | null>(null);

  const handleSingleGenerate = useCallback(async () => {
    if (!singlePrompt.trim()) return;
    setSingleGenerating(true);
    setSingleResult(null);
    try {
      const res = await fetch("/api/elevenlabs/generate-sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: singlePrompt,
          duration_seconds: singleDuration,
          loop: singleLoop,
          prompt_influence: singlePromptInfluence,
          model_id: "eleven_text_to_sound_v2",
          output_format: "mp3_44100_128",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Generation failed");
      } else {
        setSingleResult({ audioUrl: data.audioUrl, characterCost: data.characterCost, isMock: !!data.isMock });
        toast.success(`Atmosphere generated (${data.characterCost ?? 0} chars)`);
        if (typeof data.creditsRemaining === "number") {
          window.dispatchEvent(new CustomEvent("atlas:credits", { detail: { creditsRemaining: data.creditsRemaining } }));
        }
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSingleGenerating(false);
    }
  }, [singlePrompt, singleDuration, singleLoop, singlePromptInfluence, toast]);

  // ── Detect persistence mode + load ─────────────────────────

  useEffect(() => {
    if (modeDetected.current) return;
    modeDetected.current = true;

    (async () => {
      try {
        const apiProjects = await apiListProjects();
        setMode("api");
        if (apiProjects.length > 0) {
          setProjects(apiProjects);
          setActiveProjectId(apiProjects[0].id);
        } else {
          // Try migrating from localStorage
          const localProjects = loadProjectsLocal();
          if (localProjects.length > 0) {
            setProjects(localProjects);
            setActiveProjectId(localProjects[0].id);
          }
        }
      } catch {
        // API not available → fall back to localStorage
        setMode("local");
        const loaded = loadProjectsLocal();
        setProjects(loaded);
        if (loaded.length > 0) {
          setActiveProjectId(loaded[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Active project helper
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  // ── Persist helper (auto-routes based on mode) ─────────────

  const persistProjects = useCallback(
    (updated: AtmosphereProject[]) => {
      // Always save locally as cache
      saveProjectsLocal(updated);
      setProjects(updated);
    },
    []
  );

  const updateProject = useCallback(
    (updates: Partial<AtmosphereProject>) => {
      if (!activeProjectId) return;
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === activeProjectId
            ? { ...p, ...updates, updatedAt: Date.now() }
            : p
        );
        saveProjectsLocal(updated);
        return updated;
      });

      // Non-blocking API sync
      if (mode === "api" && activeProject) {
        const merged = { ...activeProject, ...updates };
        apiUpdateProject(activeProjectId, merged.brief, merged.name).catch(() => {});
      }
    },
    [activeProjectId, activeProject, mode]
  );

  // ── Brief handlers ─────────────────────────────────────────

  const handleBriefChange = useCallback(
    (brief: AtmosphereBrief) => {
      if (!activeProject) {
        // Auto-create project
        const newProject = createDefaultProject();
        newProject.brief = brief;
        newProject.name = brief.title || "Untitled Atmosphere";
        const updated = [newProject, ...projects];
        persistProjects(updated);
        setActiveProjectId(newProject.id);

        // Non-blocking API create
        if (mode === "api") {
          apiCreateProject(brief, newProject.name).catch(() => {});
        }
      } else {
        updateProject({ brief, name: brief.title || activeProject.name });
      }
    },
    [activeProject, projects, updateProject, persistProjects, mode]
  );

  const handleDecompose = useCallback(() => {
    const brief = activeProject?.brief ?? getDefaultBrief();
    if (!brief.scene && !brief.location) {
      toast.error("Please describe the scene or location first.");
      return;
    }

    const layers = decomposeAtmosphere(brief);

    if (!activeProject) {
      const newProject = createDefaultProject();
      newProject.brief = brief;
      newProject.name = brief.title || "Untitled Atmosphere";
      newProject.layers = layers;
      const updated = [newProject, ...projects];
      persistProjects(updated);
      setActiveProjectId(newProject.id);
    } else {
      updateProject({ layers });
    }

    toast.success(`Decomposed into ${layers.length} layers`);
  }, [activeProject, projects, updateProject, persistProjects, toast]);

  // ── Layer handlers ─────────────────────────────────────────

  const handleLayerChange = useCallback(
    (id: string, updates: Partial<AtmosphereLayer>) => {
      if (!activeProject) return;
      const updatedLayers = activeProject.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      updateProject({ layers: updatedLayers });
    },
    [activeProject, updateProject]
  );

  const handleAddLayer = useCallback(
    (type: AtmosphereLayerType) => {
      if (!activeProject) return;
      const brief = activeProject.brief;
      const def = getLayerDef(type);

      const newLayer: AtmosphereLayer = {
        id: `layer-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        layerType: type,
        layerRole: def.subcategories[0],
        promptText: composeLayerPrompt({ layerType: type, brief }),
        intensity: 0.5,
        density: 0.5,
        distance: 0.5,
        movement: 0.3,
        frequencyRole: "full",
        loopable: def.defaultLoop,
        durationSeconds: def.defaultDuration,
        promptInfluence: 0.3,
        priority: activeProject.layers.length,
        muted: false,
        solo: false,
        engineMode: "sound_effects",
        status: "draft",
      };

      updateProject({ layers: [...activeProject.layers, newLayer] });
      toast.success(`Added ${def.label} layer`);
    },
    [activeProject, updateProject, toast]
  );

  const handleRemoveLayer = useCallback(
    (id: string) => {
      if (!activeProject) return;
      updateProject({
        layers: activeProject.layers.filter((l) => l.id !== id),
      });
    },
    [activeProject, updateProject]
  );

  const handleFavorite = useCallback(
    (id: string) => {
      if (!activeProject) return;
      const updatedLayers = activeProject.layers.map((l) =>
        l.id === id
          ? { ...l, status: (l.status === "favorite" ? "generated" : "favorite") as AtmosphereLayer["status"] }
          : l
      );
      updateProject({ layers: updatedLayers });
    },
    [activeProject, updateProject]
  );

  const handleReject = useCallback(
    (id: string) => {
      if (!activeProject) return;
      const updatedLayers = activeProject.layers.map((l) =>
        l.id === id
          ? { ...l, status: (l.status === "rejected" ? "draft" : "rejected") as AtmosphereLayer["status"] }
          : l
      );
      updateProject({ layers: updatedLayers });
    },
    [activeProject, updateProject]
  );

  // ── Generation handlers ────────────────────────────────────

  const generateLayer = useCallback(
    async (layer: AtmosphereLayer): Promise<AtmosphereLayer> => {
      setCurrentLayerId(layer.id);

      try {
        // Route to music API for music_bed engine mode
        if (layer.engineMode === "music_bed") {
          const res = await fetch("/api/elevenlabs/music-compose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: layer.promptText,
              duration_ms: layer.durationSeconds * 1000,
              instrumental: true,
              output_format: "mp3_44100_128",
              layerType: layer.layerType,
            }),
          });
          const data = await res.json();
          if (res.ok && data.audioUrl) {
            return { ...layer, audioUrl: data.audioUrl, generationId: data.generationId, status: "generated" };
          } else {
            toast.error(`Bed layer failed: ${data.error || "Unknown error"}`);
            return { ...layer, status: "draft" };
          }
        }

        // Default: SFX engine
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: layer.promptText,
            duration_seconds: layer.durationSeconds,
            loop: layer.loopable,
            prompt_influence: layer.promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          return {
            ...layer,
            audioUrl: data.audioUrl,
            generationId: data.generationId,
            status: "generated",
          };
        } else {
          toast.error(`Layer failed: ${data.error || "Unknown error"}`);
          return { ...layer, status: "draft" };
        }
      } catch {
        toast.error("Generation failed — network error");
        return { ...layer, status: "draft" };
      }
    },
    [toast]
  );

  const handleGenerateSingleLayer = useCallback(
    async (id: string) => {
      if (!activeProject || generating) return;
      const layer = activeProject.layers.find((l) => l.id === id);
      if (!layer) return;

      setGenerating(true);
      handleLayerChange(id, { status: "generating" });

      const result = await generateLayer(layer);
      handleLayerChange(id, {
        status: result.status,
        audioUrl: result.audioUrl,
        generationId: result.generationId,
      });

      setGenerating(false);
      setCurrentLayerId(null);
      if (result.status === "generated") {
        toast.success(`${getLayerDef(layer.layerType).shortLabel} generated`);
      }
    },
    [activeProject, generating, generateLayer, handleLayerChange, toast]
  );

  const handleGenerate = useCallback(
    async (mode: "selected" | "all" | "beds_only" | "micro_only") => {
      if (!activeProject || generating) return;

      let targetLayers: AtmosphereLayer[];
      switch (mode) {
        case "all":
          targetLayers = activeProject.layers.filter((l) => !l.muted && l.status !== "rejected");
          break;
        case "selected":
          targetLayers = activeProject.layers.filter((l) => l.status === "draft" && !l.muted);
          break;
        case "beds_only":
          targetLayers = activeProject.layers.filter(
            (l) => l.layerType === "base_bed" && l.loopable && !l.muted
          );
          break;
        case "micro_only":
          targetLayers = activeProject.layers.filter(
            (l) => l.layerType === "micro_event" && !l.muted
          );
          break;
      }

      if (targetLayers.length === 0) {
        toast.error("No layers to generate");
        return;
      }

      setGenerating(true);

      // Mark all as generating
      const updatedLayers = [...activeProject.layers];
      for (const tl of targetLayers) {
        const idx = updatedLayers.findIndex((l) => l.id === tl.id);
        if (idx >= 0) updatedLayers[idx] = { ...updatedLayers[idx], status: "generating" };
      }
      updateProject({ layers: updatedLayers });

      // Generate sequentially
      let completedCount = 0;
      for (const tl of targetLayers) {
        const result = await generateLayer(tl);
        const idx = updatedLayers.findIndex((l) => l.id === tl.id);
        if (idx >= 0) {
          updatedLayers[idx] = {
            ...updatedLayers[idx],
            status: result.status,
            audioUrl: result.audioUrl,
            generationId: result.generationId,
          };
        }
        updateProject({ layers: [...updatedLayers] });
        if (result.status === "generated") completedCount++;
      }

      setGenerating(false);
      setCurrentLayerId(null);
      toast.success(`${completedCount}/${targetLayers.length} layers generated`);
    },
    [activeProject, generating, generateLayer, updateProject, toast]
  );

  // ── Variation handlers ─────────────────────────────────────

  const handleGenerateVariations = useCallback(
    async (layerId: string, count: number) => {
      if (!activeProject || generating) return;
      const sourceLayer = activeProject.layers.find((l) => l.id === layerId);
      if (!sourceLayer || !sourceLayer.promptText) return;

      setGenerating(true);
      const variations: AtmosphereLayer[] = [];

      for (let i = 0; i < count; i++) {
        // Vary the prompt slightly for each variation
        const variantSuffix = i === 0 ? ", variation A, slightly different" : i === 1 ? ", variation B, alternative version" : ", variation C, sparse variant";
        const varLayer: AtmosphereLayer = {
          ...sourceLayer,
          id: `var-${layerId}-${i}-${Date.now()}`,
          promptText: sourceLayer.promptText + variantSuffix,
          status: "generating",
        };

        const result = await generateLayer(varLayer);
        variations.push(result);
      }

      setVariationSets((prev) => {
        const existing = prev.findIndex((vs) => vs.layerId === layerId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { layerId, variations: [...updated[existing].variations, ...variations] };
          return updated;
        }
        return [...prev, { layerId, variations }];
      });

      setGenerating(false);
      setCurrentLayerId(null);
      const successCount = variations.filter((v) => v.status === "generated").length;
      toast.success(`${successCount}/${count} variations generated`);
    },
    [activeProject, generating, generateLayer, toast]
  );

  const handleSelectVariation = useCallback(
    (layerId: string, variationIndex: number) => {
      if (!activeProject) return;
      const varSet = variationSets.find((vs) => vs.layerId === layerId);
      if (!varSet || !varSet.variations[variationIndex]) return;

      const variation = varSet.variations[variationIndex];
      const updatedLayers = activeProject.layers.map((l) =>
        l.id === layerId
          ? { ...l, audioUrl: variation.audioUrl, generationId: variation.generationId, status: "generated" as const }
          : l
      );
      updateProject({ layers: updatedLayers });
      toast.success("Variation applied as primary");
    },
    [activeProject, variationSets, updateProject, toast]
  );

  const handleRemoveVariation = useCallback(
    (layerId: string, variationIndex: number) => {
      setVariationSets((prev) =>
        prev.map((vs) =>
          vs.layerId === layerId
            ? { ...vs, variations: vs.variations.filter((_, i) => i !== variationIndex) }
            : vs
        ).filter((vs) => vs.variations.length > 0)
      );
    },
    []
  );

  // ── Save set ───────────────────────────────────────────────

  const handleSaveSet = useCallback(async () => {
    if (!activeProject) return;

    if (mode === "api") {
      try {
        await apiUpdateProject(activeProject.id, activeProject.brief, activeProject.name);
        await apiSyncLayers(activeProject.id, activeProject.layers);
        toast.success(`"${activeProject.name}" saved to database`);
      } catch {
        toast.error("API save failed — saved locally");
      }
    } else {
      toast.success(`"${activeProject.name}" saved locally`);
    }
  }, [activeProject, mode, toast]);

  // ── Project management ─────────────────────────────────────

  const handleNewProject = useCallback(async () => {
    const newProject = createDefaultProject();

    if (mode === "api") {
      try {
        const created = await apiCreateProject(getDefaultBrief(), "Untitled Atmosphere");
        newProject.id = created.id;
      } catch {
        // Fall back to local ID
      }
    }

    const updated = [newProject, ...projects];
    persistProjects(updated);
    setActiveProjectId(newProject.id);
    toast.success("New atmosphere project created");
  }, [projects, persistProjects, mode, toast]);

  // ── Render ─────────────────────────────────────────────────

  const brief = activeProject?.brief ?? getDefaultBrief();
  const layers = activeProject?.layers ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-atlas-accent" />
        <span className="text-sm text-atlas-text-dim">Loading atmosphere projects…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-4 pt-2">
      {/* Header row — "Database" identity on the left; mode toggle, project
          picker, + New, and the backing-store indicator on the right. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-atlas-border-subtle bg-atlas-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-atlas-text-muted">
          <Database className="h-3 w-3" /> Database
        </span>

        {/* Authoring-mode toggle — pushes everything else to the right. */}
        <div className="ml-auto flex rounded-lg overflow-hidden border border-atlas-border">
          <button
            onClick={() => setAuthoringMode("layers")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              authoringMode === "layers"
                ? "bg-atlas-accent text-white"
                : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
            )}
          >
            <LayersIcon className="h-3.5 w-3.5" /> Layers
          </button>
          <button
            onClick={() => setAuthoringMode("single")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-atlas-border transition-colors",
              authoringMode === "single"
                ? "bg-atlas-accent text-white"
                : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover"
            )}
          >
            <AudioWaveform className="h-3.5 w-3.5" /> Single
          </button>
        </div>

        {authoringMode === "layers" && projects.length > 0 && (
          <select
            value={activeProjectId ?? ""}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="rounded-xl border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {authoringMode === "layers" && (
          <button
            onClick={handleNewProject}
            className="rounded-xl border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors"
          >
            + New
          </button>
        )}

        {/* Backing-store indicator — moved to the right of the header. */}
        <span className="inline-flex items-center gap-1 rounded-md border border-atlas-border-subtle px-1.5 py-1 text-[10px] font-medium text-atlas-text-dim">
          {mode === "api" ? (
            <><Database className="h-3 w-3" /> DB</>
          ) : (
            <><HardDrive className="h-3 w-3" /> Local</>
          )}
        </span>
      </div>

      {/* 2-column layout: main controls + sticky sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: main controls ── */}
        <div className="lg:col-span-2 space-y-5">
          {authoringMode === "layers" ? (
            <>
              {/* Section 1 — Atmosphere Brief */}
              <AtmosphereBriefForm
                brief={brief}
                onChange={handleBriefChange}
                onDecompose={handleDecompose}
              />

              {/* Section 2 — Layer Decomposer */}
              {layers.length > 0 && (
                <LayerDecomposer
                  layers={layers}
                  onLayerChange={handleLayerChange}
                  onAddLayer={handleAddLayer}
                  onRemoveLayer={handleRemoveLayer}
                  onGenerateLayer={handleGenerateSingleLayer}
                />
              )}

              {/* Section 3 — Atmosphere Mixer */}
              {layers.length > 0 && (
                <AtmosphereMixer
                  layers={layers}
                  onLayerChange={handleLayerChange}
                  onFavorite={handleFavorite}
                  onReject={handleReject}
                />
              )}

              {/* Section 4 — Variation Cycles */}
              {layers.length > 0 && (
                <VariationCycles
                  layers={layers}
                  variationSets={variationSets}
                  onGenerateVariations={handleGenerateVariations}
                  onSelectVariation={handleSelectVariation}
                  onRemoveVariation={handleRemoveVariation}
                  generating={generating}
                />
              )}
            </>
          ) : (
            // Single-layer mode — minimal scratchpad. Use the prompt
            // textarea + Generate button in the sticky sidebar.
            <div className="atlas-card p-5 text-xs text-atlas-text-muted leading-relaxed">
              <p className="font-semibold text-atlas-text mb-2">Single atmosphere mode</p>
              <p>
                Write a free-form atmosphere prompt in the sidebar and hit Generate. This skips the brief / decomposer / mixer flow and produces a single bounce — useful for quick experiments or when you already have a clear sonic intent.
              </p>
              {singleResult && (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="atlas-eyebrow">Result</span>
                    {singleResult.isMock && (
                      <span className="rounded-full bg-atlas-mock/10 px-2 py-0.5 text-[10px] font-semibold text-atlas-mock tracking-wide">MOCK</span>
                    )}
                  </div>
                  <audio controls src={singleResult.audioUrl} className="w-full h-12" />
                  <div className="text-[11px] text-atlas-text-dim tabular-nums">{singleResult.characterCost} chars</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right column: sticky sidebar ── */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          {authoringMode === "layers" ? (
            <>
              {/* Generation Queue */}
              <GenerationQueue
                layers={layers}
                generating={generating}
                currentLayerId={currentLayerId}
                onGenerate={handleGenerate}
              />

              {/* Atmosphere Set */}
              <AtmosphereSetPanel
                layers={layers}
                projectName={activeProject?.name ?? "Untitled"}
                onFavorite={handleFavorite}
                onReject={handleReject}
                onSaveSet={handleSaveSet}
              />

              {/* Export Manifest */}
              <ExportManifest
                project={activeProject}
                variationSets={variationSets}
              />
            </>
          ) : (
            <>
              {/* Single-mode prompt — same shape as /generate sidebar. */}
              <div className="atlas-card p-4">
                <textarea
                  value={singlePrompt}
                  onChange={(e) => setSinglePrompt(e.target.value)}
                  placeholder="Describe the atmosphere you want to generate..."
                  rows={5}
                  className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
                  data-no-transition
                />
                <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
                  <span className={cn("tabular-nums", singlePrompt.length > 450 ? "text-atlas-danger font-medium" : "")}>
                    {singlePrompt.length} chars
                  </span>
                </div>
              </div>

              <button
                onClick={handleSingleGenerate}
                disabled={singleGenerating || !singlePrompt.trim()}
                className={cn(
                  "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
                  singleGenerating || !singlePrompt.trim()
                    ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                    : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
                )}
              >
                {singleGenerating ? (
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
                    <Sparkles className="h-4 w-4" /> Generate Atmosphere
                  </span>
                )}
              </button>

              <div className="atlas-card p-3 space-y-3">
                <AtlasSlider
                  value={singleDuration}
                  onChange={setSingleDuration}
                  min={1}
                  max={30}
                  step={1}
                  label="Duration"
                  displayValue={`${singleDuration}s`}
                  lowLabel="1s"
                  highLabel="30s"
                  ticks={[5, 10, 15, 20, 25, 30]}
                />
                <AtlasSlider
                  value={singlePromptInfluence}
                  onChange={setSinglePromptInfluence}
                  min={0}
                  max={1}
                  step={0.05}
                  label="Prompt Influence"
                  displayValue={singlePromptInfluence.toFixed(2)}
                  lowLabel="Creative"
                  highLabel="Precise"
                />
                <label className="flex items-center gap-3 cursor-pointer w-fit group">
                  <div
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors duration-200",
                      singleLoop ? "bg-atlas-accent" : "bg-atlas-surface-hover border border-atlas-border"
                    )}
                    onClick={() => setSingleLoop(!singleLoop)}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-200",
                        singleLoop ? "translate-x-5 bg-white" : "translate-x-0.5 bg-atlas-text-dim"
                      )}
                    />
                  </div>
                  <span className="text-sm text-atlas-text-muted group-hover:text-atlas-text transition-colors">
                    Seamless loop
                  </span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
