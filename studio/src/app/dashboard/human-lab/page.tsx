"use client";

import { useState, useCallback, useMemo } from "react";
import { Shield, ChevronDown, ChevronRight, Wand2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { AudioCleanupPanel } from "@/app/dashboard/components/AudioCleanupPanel";
import { HumanCategorySelector } from "./HumanCategorySelector";
import { BodyProfileBuilder } from "./BodyProfileBuilder";
import { ExpressionBuilder } from "./ExpressionBuilder";
import { EngineModePicker } from "./EngineModePicker";
import { CrowdCreator } from "./CrowdCreator";
import { HumanPromptPreview } from "./HumanPromptPreview";
import { HumanGeneratePanel } from "./HumanGeneratePanel";
import { HumanExportPanel } from "./HumanExportPanel";
import type {
  HumanCategory, EngineMode, BodyProfile, ExpressionSettings,
  CrowdSettings, TtsSettings, HumanItem,
} from "@/lib/sfx/human-taxonomy";
import {
  defaultBodyProfile, defaultExpressionSettings,
  defaultCrowdSettings, defaultTtsSettings, getCategoryDef,
} from "@/lib/sfx/human-taxonomy";
import {
  buildHumanPrompt, buildChantPlan, buildHybridCrowdPlan,
  estimateHumanCost,
} from "@/lib/sfx/human-prompt";

export default function HumanLabPage() {
  const toast = useToast();

  // State
  const [category, setCategory] = useState<HumanCategory>("breath");
  const [engineMode, setEngineMode] = useState<EngineMode>("sfx");
  const [body, setBody] = useState<BodyProfile>(defaultBodyProfile());
  const [expression, setExpression] = useState<ExpressionSettings>(defaultExpressionSettings());
  const [crowd, setCrowd] = useState<CrowdSettings>(defaultCrowdSettings());
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>(defaultTtsSettings());
  const [customOverride, setCustomOverride] = useState("");
  const [promptInfluence, setPromptInfluence] = useState(0.4);

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<HumanItem[]>([]);

  // Audio cleanup / export are collapsed by default so the main flow stays
  // light. The user can open them after a generation when they actually
  // need the tools.
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Category change → reset engine to default
  const handleCategoryChange = useCallback((cat: HumanCategory) => {
    setCategory(cat);
    const def = getCategoryDef(cat);
    setEngineMode(def.defaultEngine);
    setExpression((prev) => ({ ...prev, action: def.actions[0] ?? "" }));
  }, []);

  // Composed prompt
  const composedPrompt = useMemo(() => {
    if (customOverride.trim()) return customOverride.trim();
    return buildHumanPrompt(category, body, expression, crowd, engineMode);
  }, [category, body, expression, crowd, engineMode, customOverride]);

  // Crowd plans
  const chantPlan = useMemo(() => buildChantPlan(crowd), [crowd]);
  const hybridPlan = useMemo(() => buildHybridCrowdPlan(crowd), [crowd]);

  // ── Engine-aware Generation ─────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const itemId = `human-${Date.now()}`;
    const newItem: HumanItem = {
      id: itemId, category, engineMode,
      composedPrompt, takeNumber: results.length + 1,
      status: "generating",
    };
    setResults((prev) => [newItem, ...prev]);

    try {
      let res: Response;

      if (engineMode === "sfx") {
        res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: composedPrompt,
            duration_seconds: expression.durationSeconds,
            loop: category === "crowds" && crowd.loopable,
            prompt_influence: promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });
      } else if (engineMode === "tts") {
        res = await fetch("/api/elevenlabs/text-to-speech-layer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voice_id: ttsSettings.voiceId,
            text: ttsSettings.text || composedPrompt,
            model_id: "eleven_v3",
            output_format: "mp3_44100_128",
            layer_role: "main",
          }),
        });
      } else if (engineMode === "dialogue") {
        res = await fetch("/api/elevenlabs/text-to-dialogue-layer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputs: [{ text: ttsSettings.text || composedPrompt, voice_id: ttsSettings.voiceId }],
            model_id: "eleven_v3",
            output_format: "mp3_44100_128",
          }),
        });
      } else if (engineMode === "voice_design") {
        res = await fetch("/api/elevenlabs/design-voice-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voice_description: composedPrompt,
            text: ttsSettings.text || "This is a test of the voice character.",
          }),
        });
      } else {
        // Hybrid: run SFX first
        res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: composedPrompt,
            duration_seconds: expression.durationSeconds,
            loop: false,
            prompt_influence: promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });
      }

      const data = await res.json();
      if (res.ok && (data.audioUrl || data.generatedVoiceId)) {
        setResults((prev) => prev.map((r) => r.id === itemId ? {
          ...r, status: "generated" as const,
          audioUrl: data.audioUrl,
          generationId: data.generationId ?? data.generatedVoiceId,
        } : r));
        toast.success(engineMode === "voice_design" ? "Voice designed" : "Generated");
      } else {
        setResults((prev) => prev.map((r) => r.id === itemId ? { ...r, status: "failed" as const, errorMessage: data.error } : r));
        toast.error(data.error || "Generation failed");
      }
    } catch {
      setResults((prev) => prev.map((r) => r.id === itemId ? { ...r, status: "failed" as const, errorMessage: "Network error" } : r));
      toast.error("Network error");
    }

    setIsGenerating(false);
  }, [category, engineMode, composedPrompt, expression, crowd, promptInfluence, ttsSettings, results, toast]);

  const isCrowds = category === "crowds";

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-4 pt-2">

      {/* 2-column grid: main controls + sticky sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Controls ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1 — Category */}
          <HumanCategorySelector selected={category} onSelect={handleCategoryChange} />

          {/* 2 + 3 — Body Profile + Expression / Crowd Creator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BodyProfileBuilder profile={body} onChange={setBody} />
            {isCrowds ? (
              <CrowdCreator
                settings={crowd} onChange={setCrowd}
                chantPlan={chantPlan} hybridPlan={hybridPlan}
              />
            ) : (
              <ExpressionBuilder category={category} expression={expression} onChange={setExpression} />
            )}
          </div>

          {/* 4 — Engine Mode (inline segmented control) */}
          <EngineModePicker selected={engineMode} category={category} onSelect={setEngineMode} />

          {/* 7 — Audio Cleanup (collapsed by default) */}
          <CollapsibleSection
            open={cleanupOpen}
            onToggle={() => setCleanupOpen((v) => !v)}
            icon={<Wand2 className="h-3.5 w-3.5" />}
            label="Audio Cleanup"
            hint="Denoise · de-ess · level"
          >
            <AudioCleanupPanel context="Human Lab" compact />
          </CollapsibleSection>

          {/* 8 — Export (collapsed by default) */}
          <CollapsibleSection
            open={exportOpen}
            onToggle={() => setExportOpen((v) => !v)}
            icon={<Send className="h-3.5 w-3.5" />}
            label="Export"
            hint={`${results.filter((r) => r.status === "generated").length} item${results.length === 1 ? "" : "s"}`}
          >
            <HumanExportPanel
              items={results}
              hybridPlan={hybridPlan}
              setName="Human Lab Export"
            />
          </CollapsibleSection>

          {/* Safety footer */}
          <div className="flex items-start gap-2 rounded-xl border border-atlas-border-subtle bg-atlas-surface p-3">
            <Shield className="h-4 w-4 text-atlas-text-dim shrink-0 mt-0.5" />
            <div className="text-xs text-atlas-text-dim space-y-0.5">
              <p className="font-semibold">Safety &amp; Ethics</p>
              <p>Human Lab uses fictional character profiles. Do not impersonate real people or celebrities. Generated human/crowd assets are marked as synthetic in metadata. Use generic descriptive profiles (&ldquo;raspy exhausted warrior&rdquo;) rather than named-person imitation.</p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Sticky Sidebar ───────────────────── */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          {/* 5 — Prompt Preview */}
          <HumanPromptPreview
            composedPrompt={composedPrompt}
            engineMode={engineMode}
            customOverride={customOverride}
            onCustomOverrideChange={setCustomOverride}
            promptInfluence={promptInfluence}
            onPromptInfluenceChange={setPromptInfluence}
            ttsSettings={ttsSettings}
            onTtsSettingsChange={setTtsSettings}
          />

          {/* 6 — Generate */}
          <HumanGeneratePanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            results={results}
            estimatedCost={estimateHumanCost(1)}
            engineMode={engineMode}
          />
        </div>
      </div>
    </div>
  );
}

// Tiny collapsible — keeps the page light while exposing optional tools
// behind one click. Matches the rest of the dashboard's atlas-card chrome.
function CollapsibleSection({
  open, onToggle, icon, label, hint, children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atlas-card overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors",
          open ? "bg-atlas-surface-hover/40" : "hover:bg-atlas-surface-hover/40"
        )}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-muted" />}
        <span className="text-atlas-text-muted">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text">{label}</span>
        {hint && <span className="ml-auto text-[11px] text-atlas-text-dim">{hint}</span>}
      </button>
      {open && <div className="border-t border-atlas-border-subtle p-3">{children}</div>}
    </div>
  );
}
