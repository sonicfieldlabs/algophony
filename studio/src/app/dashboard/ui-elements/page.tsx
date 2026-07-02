"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Zap, Star, ThumbsDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { ElementBuilder } from "./ElementBuilder";
import { UIFaderBank } from "./UIFaderBank";
import { EngineModeSelector } from "./EngineModeSelector";
import { SoundSetBar } from "./SoundSetBar";
import { SoundSetLibrary } from "./SoundSetLibrary";
import { EvaluationPanel } from "./EvaluationPanel";
import { HybridEngine } from "./HybridEngine";
import {
  type UIElementType,
  type UIActionType,
  type ElementSize,
  type ElementShape,
  type ElementWeight,
  type ElementBehavior,
  type EngineMode,
  type UISoundSet,
  type UISoundItem,
  getDurationRange,
  ENGINE_MODE_DEFS,
} from "@/lib/sfx/ui-elements-taxonomy";
import {
  composeUIPrompt,
  getDefaultFaderState,
} from "@/lib/sfx/ui-elements-prompt";
import {
  type UIEvaluationTag,
  aggregateUIGuidance,
} from "@/lib/sfx/ui-elements-evaluations";

// ── Hybrid persistence: API routes → localStorage fallback ─────

const STORAGE_KEY = "atlas-ui-sound-sets";
const USE_API = true; // Set false to force localStorage-only mode

function loadSetsLocal(): UISoundSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSetsLocal(sets: UISoundSet[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sets)); } catch {}
}

/** Try fetching sets from API; fall back to localStorage on failure */
async function fetchSets(): Promise<{ sets: UISoundSet[]; fromApi: boolean }> {
  if (!USE_API) return { sets: loadSetsLocal(), fromApi: false };
  try {
    const res = await fetch("/api/ui-elements/sets");
    if (!res.ok) throw new Error("API unavailable");
    const data = await res.json();
    // Map API shape to client shape
    const sets: UISoundSet[] = (data.sets ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: s.name as string,
      brandDescription: (s.brand_description as string) ?? "",
      interfaceType: (s.interface_type as string) ?? "",
      visualStyle: (s.visual_style as string) ?? "",
      sonicStyle: (s.sonic_style as string) ?? "",
      defaultExclusions: (s.default_exclusions as string[]) ?? [],
      items: [], // Items are loaded separately
      createdAt: new Date(s.created_at as string).getTime(),
      updatedAt: new Date(s.updated_at as string).getTime(),
    }));
    return { sets, fromApi: true };
  } catch {
    return { sets: loadSetsLocal(), fromApi: false };
  }
}

/** Try fetching items for a set from API */
async function fetchItems(soundSetId: string): Promise<UISoundItem[]> {
  if (!USE_API) return [];
  try {
    const res = await fetch(`/api/ui-elements/items?sound_set_id=${soundSetId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((i: Record<string, unknown>) => ({
      id: i.id as string,
      soundSetId: (i.sound_set_id as string) ?? "",
      elementType: i.element_type as UIElementType,
      actionType: i.action_type as UIActionType,
      state: i.state as string | undefined,
      importanceLevel: i.importance_level as string | undefined,
      frequencyOfUse: i.frequency_of_use as string | undefined,
      engineMode: (i.engine_mode as EngineMode) ?? "sound_effects",
      durationTarget: (i.duration_target as number) ?? 0.5,
      sonicRole: i.sonic_role as string | undefined,
      promptText: (i.prompt_text as string) ?? "",
      generationId: i.generated_sound_id as string | undefined,
      audioUrl: i.audio_url as string | undefined,
      status: (i.status as UISoundItem["status"]) ?? "draft",
      faderState: (i.fader_state as Record<string, number>) ?? {},
      createdAt: new Date(i.created_at as string).getTime(),
    }));
  } catch {
    return [];
  }
}

// ── Page Component ─────────────────────────────────────────────

export default function UIElementsPage() {
  const toast = useToast();

  // Sound Sets
  const [soundSets, setSoundSets] = useState<UISoundSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [usingApi, setUsingApi] = useState(false);

  // Load sets on mount — try API first
  useEffect(() => {
    fetchSets().then(({ sets, fromApi }) => {
      setSoundSets(sets);
      setUsingApi(fromApi);
    });
  }, []);

  // Load items when active set changes (API mode)
  useEffect(() => {
    if (!activeSetId || !usingApi) return;
    fetchItems(activeSetId).then((items) => {
      setSoundSets((prev) =>
        prev.map((s) => s.id === activeSetId ? { ...s, items } : s)
      );
    });
  }, [activeSetId, usingApi]);

  const activeSet = useMemo(
    () => soundSets.find((s) => s.id === activeSetId) ?? null,
    [soundSets, activeSetId]
  );

  // Element Builder state
  const [elementType, setElementType] = useState<UIElementType>("button");
  const [actionType, setActionType] = useState<UIActionType>("click");
  const [size, setSize] = useState<ElementSize>("medium");
  const [shape, setShape] = useState<ElementShape>("round");
  const [weight, setWeight] = useState<ElementWeight>("medium");
  const [behavior, setBehavior] = useState<ElementBehavior>("snap");

  // Faders
  const [faders, setFaders] = useState<Record<string, number>>(getDefaultFaderState);

  // Engine Mode
  const [engineMode, setEngineMode] = useState<EngineMode>("sound_effects");
  const [voiceText, setVoiceText] = useState("");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<{
    audioUrl: string;
    generationId: string;
    characterCost: number;
    creditCost: number;
  } | null>(null);

  // Prompt (live preview)
  const [promptOverride, setPromptOverride] = useState<string | null>(null);

  // Evaluation feedback
  const [evalTags, setEvalTags] = useState<UIEvaluationTag[]>([]);
  const feedbackExclusions = useMemo(() => aggregateUIGuidance(evalTags), [evalTags]);

  const handleActionTypeChange = useCallback((nextActionType: UIActionType) => {
    setActionType(nextActionType);
    const range = getDurationRange(nextActionType);
    setFaders((prev) => ({ ...prev, duration: range.default }));
    setPromptOverride(null);
  }, []);

  // Compose prompt from current state (with feedback exclusions injected)
  const composedPrompt = useMemo(() => {
    const allExclusions = [
      ...(activeSet?.defaultExclusions ?? []),
      ...feedbackExclusions,
    ];
    return composeUIPrompt({
      elementType,
      actionType,
      engineMode,
      interfaceType: activeSet?.interfaceType,
      brandStyle: activeSet?.sonicStyle,
      size,
      shape,
      weightProp: weight,
      behavior,
      faders,
      customExclusions: allExclusions,
      voiceText,
    });
  }, [elementType, actionType, engineMode, activeSet, size, shape, weight, behavior, faders, voiceText, feedbackExclusions]);

  const displayPrompt = promptOverride ?? composedPrompt.promptText;

  // Fader change handler
  const handleFaderChange = useCallback((id: string, value: number) => {
    setFaders((prev) => ({ ...prev, [id]: value }));
    setPromptOverride(null);
  }, []);

  // Sound Set CRUD — hybrid API + localStorage
  const handleCreateSet = useCallback(
    async (setData: Omit<UISoundSet, "id" | "items" | "createdAt" | "updatedAt">) => {
      if (usingApi) {
        try {
          const res = await fetch("/api/ui-elements/sets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: setData.name,
              brand_description: setData.brandDescription,
              interface_type: setData.interfaceType,
              visual_style: setData.visualStyle,
              sonic_style: setData.sonicStyle,
              default_exclusions: setData.defaultExclusions,
            }),
          });
          if (!res.ok) throw new Error("API error");
          const data = await res.json();
          const newSet: UISoundSet = {
            id: data.set.id,
            name: data.set.name,
            brandDescription: data.set.brand_description ?? "",
            interfaceType: data.set.interface_type ?? "",
            visualStyle: data.set.visual_style ?? "",
            sonicStyle: data.set.sonic_style ?? "",
            defaultExclusions: data.set.default_exclusions ?? [],
            items: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setSoundSets((prev) => [newSet, ...prev]);
          setActiveSetId(newSet.id);
          toast.success(`Sound Set "${newSet.name}" created`);
          return;
        } catch {
          // Fall through to localStorage
        }
      }

      // localStorage fallback
      const newSet: UISoundSet = {
        ...setData,
        id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newSet, ...soundSets];
      setSoundSets(updated);
      saveSetsLocal(updated);
      setActiveSetId(newSet.id);
      toast.success(`Sound Set "${newSet.name}" created`);
    },
    [soundSets, usingApi, toast]
  );

  // Generate
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setLastResult(null);

    const modeInfo = ENGINE_MODE_DEFS.find((m) => m.id === engineMode);
    const apiRoute = modeInfo?.apiRoute ?? "/api/elevenlabs/generate-sfx";

    try {
      let body: Record<string, unknown>;

      if (engineMode === "sound_effects" || engineMode === "music_motif") {
        body = {
          text: displayPrompt,
          duration_seconds: faders.duration ?? composedPrompt.durationSeconds,
          loop: false,
          prompt_influence: faders.prompt_influence ?? 0.3,
          model_id: "eleven_text_to_sound_v2",
          output_format: "mp3_44100_128",
        };
      } else if (engineMode === "text_to_speech") {
        body = {
          text: voiceText || displayPrompt,
          voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice
          modelId: "eleven_multilingual_v2",
        };
      } else {
        body = {
          text: voiceText || displayPrompt,
        };
      }

      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Generation failed");
        return;
      }

      const result = {
        audioUrl: data.audioUrl,
        generationId: data.generationId,
        characterCost: data.characterCost ?? 0,
        creditCost: composedPrompt.creditCost,
      };

      setLastResult(result);
      toast.success("UI sound generated");
    } catch {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [engineMode, displayPrompt, faders, composedPrompt, voiceText, toast]);

  // Save to Sound Set — hybrid
  const handleSaveToSet = useCallback(async () => {
    if (!activeSetId || !lastResult) {
      toast.error("Select a Sound Set and generate a sound first");
      return;
    }

    const itemPayload = {
      sound_set_id: activeSetId,
      element_type: elementType,
      action_type: actionType,
      engine_mode: engineMode,
      duration_target: faders.duration ?? composedPrompt.durationSeconds,
      prompt_text: displayPrompt,
      generated_sound_id: lastResult.generationId,
      audio_url: lastResult.audioUrl,
      fader_state: { ...faders },
      status: "generated" as const,
    };

    if (usingApi) {
      try {
        const res = await fetch("/api/ui-elements/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemPayload),
        });
        if (res.ok) {
          // Reload items for this set
          const items = await fetchItems(activeSetId);
          setSoundSets((prev) =>
            prev.map((s) => s.id === activeSetId ? { ...s, items } : s)
          );
          toast.success("Saved to Sound Set");
          return;
        }
      } catch {
        // Fall through to localStorage
      }
    }

    // localStorage fallback
    const newItem: UISoundItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      soundSetId: activeSetId,
      elementType,
      actionType,
      engineMode,
      durationTarget: faders.duration ?? composedPrompt.durationSeconds,
      promptText: displayPrompt,
      generationId: lastResult.generationId,
      audioUrl: lastResult.audioUrl,
      status: "generated",
      faderState: { ...faders },
      createdAt: Date.now(),
    };

    const updated = soundSets.map((s) =>
      s.id === activeSetId
        ? { ...s, items: [...s.items, newItem], updatedAt: Date.now() }
        : s
    );
    setSoundSets(updated);
    saveSetsLocal(updated);
    toast.success("Saved to Sound Set");
  }, [activeSetId, lastResult, elementType, actionType, engineMode, faders, composedPrompt, displayPrompt, soundSets, usingApi, toast]);

  // Favorite / Reject items — hybrid
  const handleFavoriteItem = useCallback(async (itemId: string) => {
    // Determine new status
    let newStatus: "favorite" | "generated" = "favorite";
    for (const s of soundSets) {
      const item = s.items.find((i) => i.id === itemId);
      if (item) {
        newStatus = item.status === "favorite" ? "generated" : "favorite";
        break;
      }
    }

    if (usingApi) {
      try {
        await fetch("/api/ui-elements/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, status: newStatus }),
        });
      } catch { /* continue with local update */ }
    }

    const updated = soundSets.map((s) => ({
      ...s,
      items: s.items.map((item) =>
        item.id === itemId ? { ...item, status: newStatus } : item
      ),
    }));
    setSoundSets(updated);
    if (!usingApi) saveSetsLocal(updated);
  }, [soundSets, usingApi]);

  const handleRejectItem = useCallback(async (itemId: string) => {
    if (usingApi) {
      try {
        await fetch("/api/ui-elements/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, status: "rejected" }),
        });
      } catch { /* continue with local update */ }
    }

    const updated = soundSets.map((s) => ({
      ...s,
      items: s.items.map((item) =>
        item.id === itemId ? { ...item, status: "rejected" as const } : item
      ),
    }));
    setSoundSets(updated);
    if (!usingApi) saveSetsLocal(updated);
  }, [soundSets, usingApi]);

  return (
    <div className="p-4 pt-2 max-w-7xl mx-auto animate-fade-in">

      {/* Main workspace — three columns. Element type gets more room than
          before (col-span-5), sonic controls move to col-span-4 so they no
          longer dominate the page with whitespace, sidebar stays at 3. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — Sound Set Bar + Element Builder, constrained to this column
            so the sound-set box no longer spans the entire page width. */}
        <div className="lg:col-span-5 space-y-4">
          <SoundSetBar
            soundSets={soundSets}
            activeSetId={activeSetId}
            onSelectSet={setActiveSetId}
            onCreateSet={handleCreateSet}
          />
          <div className="atlas-card p-4">
            <ElementBuilder
              elementType={elementType}
              actionType={actionType}
              size={size}
              shape={shape}
              weight={weight}
              behavior={behavior}
              onElementTypeChange={setElementType}
              onActionTypeChange={handleActionTypeChange}
              onSizeChange={setSize}
              onShapeChange={setShape}
              onWeightChange={setWeight}
              onBehaviorChange={setBehavior}
            />
          </div>
        </div>

        {/* CENTER — Sonic Controls. Tighter padding so the faders no longer
            have huge breathing room. */}
        <div className="lg:col-span-4 atlas-card p-3">
          <UIFaderBank faders={faders} onChange={handleFaderChange} />
        </div>

        {/* RIGHT — Engine mode + prompt + generate + result. */}
        <div className="lg:col-span-3 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          {/* Section 4: Engine Mode */}
          <div className="atlas-card p-4">
            <EngineModeSelector
              value={engineMode}
              onChange={setEngineMode}
              voiceText={voiceText}
              onVoiceTextChange={setVoiceText}
            />
          </div>

          {/* Section 5: Generated Prompt Preview — matches /generate sidebar. */}
          <div className="atlas-card p-4">
            <textarea
              value={displayPrompt}
              onChange={(e) => setPromptOverride(e.target.value)}
              rows={5}
              placeholder="Describe the UI element sound..."
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
              data-no-transition
            />
            <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
              <span className={cn("tabular-nums", displayPrompt.length > 450 ? "text-atlas-danger font-medium" : "")}>
                {displayPrompt.length} chars
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(displayPrompt);
                  toast.success("Copied");
                }}
                className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
                title="Copy prompt"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            {/* Exclusion pills */}
            {composedPrompt.exclusions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {composedPrompt.exclusions.slice(0, 6).map((ex) => (
                  <span
                    key={ex}
                    className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs text-red-600 [data-theme=dark]:border-red-900/30 [data-theme=dark]:bg-red-950/20 [data-theme=dark]:text-red-400"
                  >
                    {ex}
                  </span>
                ))}
                {composedPrompt.exclusions.length > 6 && (
                  <span className="text-xs text-atlas-text-dim">
                    +{composedPrompt.exclusions.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section 6: Generate + Actions */}
          <div className="space-y-3">
            {/* Standard generation (non-hybrid) — matches /generate sidebar button. */}
            {engineMode !== "hybrid" && (
              <button
                onClick={() => {
                  setEvalTags([]);
                  handleGenerate();
                }}
                disabled={generating || !displayPrompt.trim()}
                className={cn(
                  "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
                  generating || !displayPrompt.trim()
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
                    <Zap className="h-4 w-4" />
                    Generate · {composedPrompt.creditCost}cr
                  </span>
                )}
              </button>
            )}

            {/* Result */}
            {lastResult && (
              <div className="atlas-card p-3 animate-scale-in space-y-2">
                <audio
                  controls
                  src={lastResult.audioUrl}
                  className="w-full h-9"
                />
                <div className="flex items-center justify-between text-xs text-atlas-text-dim">
                  <span>{lastResult.characterCost} chars</span>
                  <span className="flex items-center gap-1">
                    <span className="status-dot status-dot-active" />
                    Generated
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToSet}
                    disabled={!activeSetId}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border px-3 py-2 text-xs font-medium text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-40"
                  >
                    Save to Set
                  </button>
                  <button
                    onClick={() => {
                      setLastResult(null);
                      setEvalTags([]);
                      handleGenerate();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border px-3 py-2 text-xs font-medium text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-accent"
                  >
                    Variation
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (activeSetId && lastResult) handleSaveToSet();
                      toast.success("Marked as favorite");
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-atlas-accent/10 px-3 py-2 text-xs text-atlas-accent transition-all hover:bg-atlas-accent/20"
                  >
                    <Star className="h-3 w-3" /> Favorite
                  </button>
                  <button
                    onClick={() => {
                      toast.success("Rejected — feedback applied to next prompt");
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-100 px-3 py-2 text-xs text-red-600 transition-all hover:bg-red-200 [data-theme=dark]:bg-red-950/20 [data-theme=dark]:text-red-400 [data-theme=dark]:hover:bg-red-950/30"
                  >
                    <ThumbsDown className="h-3 w-3" /> Reject
                  </button>
                </div>

                {/* Evaluation Panel */}
                <EvaluationPanel
                  tags={evalTags}
                  onTagsChange={setEvalTags}
                  hasResult={true}
                />

                {/* Feedback exclusions indicator */}
                {feedbackExclusions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {feedbackExclusions.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-700 [data-theme=dark]:border-amber-900/30 [data-theme=dark]:bg-amber-950/20 [data-theme=dark]:text-amber-400"
                      >
                        ↻ {ex}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading animation */}
            {generating && (
              <div className="flex justify-center py-3">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="waveform-bar" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hybrid Engine (when hybrid mode selected) */}
          {engineMode === "hybrid" && (
            <HybridEngine
              baseDuration={faders.duration ?? composedPrompt.durationSeconds}
              onLayersGenerated={(layers) => {
                const firstDone = layers.find((l) => l.status === "done" && l.audioUrl);
                if (firstDone) {
                  setLastResult({
                    audioUrl: firstDone.audioUrl!,
                    generationId: `hybrid-${Date.now()}`,
                    characterCost: layers.reduce((s, l) => s + l.promptText.length, 0),
                    creditCost: layers.filter((l) => l.status === "done").length,
                  });
                  toast.success(`${layers.filter((l) => l.status === "done").length} layers generated`);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Section 7 — Sound Set Library */}
      {activeSet && activeSet.items.length > 0 && (
        <div className="mt-5">
          <SoundSetLibrary
            items={activeSet.items}
            onFavorite={handleFavoriteItem}
            onReject={handleRejectItem}
          />
        </div>
      )}
    </div>
  );
}
