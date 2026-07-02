"use client";

import { useState, useCallback, useMemo } from "react";

import { useToast } from "@/app/dashboard/toast";
import { FoleyCategorySelector } from "./FoleyCategorySelector";
import { FoleyPerformanceBuilder } from "./FoleyPerformanceBuilder";
import { FoleyMaterialBuilder } from "./FoleyMaterialBuilder";
import { FoleyPerspectivePanel } from "./FoleyPerspectivePanel";
import { FoleyPromptPreview } from "./FoleyPromptPreview";
import { FoleyGeneratePanel } from "./FoleyGeneratePanel";
import { FoleyRoundRobinPanel } from "./FoleyRoundRobinPanel";
import type {
  FoleyCategory, PerformerSettings, MaterialSettings,
  RecordingSettings, CategoryFields, RoundRobinConfig, FoleyItem,
} from "@/lib/sfx/foley-taxonomy";
import {
  defaultPerformerSettings, defaultMaterialSettings,
  defaultRecordingSettings, defaultCategoryFields,
  defaultRoundRobinConfig,
} from "@/lib/sfx/foley-taxonomy";
import {
  buildFoleyPrompt, buildRoundRobinPlan, estimateFoleyCost,
} from "@/lib/sfx/foley-prompt";

export default function FoleyRoomPage() {
  const toast = useToast();

  // State
  const [category, setCategory] = useState<FoleyCategory>("footsteps");
  const [performer, setPerformer] = useState<PerformerSettings>(defaultPerformerSettings());
  const [material, setMaterial] = useState<MaterialSettings>(defaultMaterialSettings());
  const [recording, setRecording] = useState<RecordingSettings>(defaultRecordingSettings());
  const [categoryFields, setCategoryFields] = useState<CategoryFields>(defaultCategoryFields("footsteps"));
  const [customOverride, setCustomOverride] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(2);
  const [promptInfluence, setPromptInfluence] = useState(0.4);
  const [roundRobinConfig, setRoundRobinConfig] = useState<RoundRobinConfig>(defaultRoundRobinConfig());

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<FoleyItem[]>([]);
  const [isRoundRobinGenerating, setIsRoundRobinGenerating] = useState(false);
  const [roundRobinGenerated, setRoundRobinGenerated] = useState(0);

  // Category change
  const handleCategoryChange = useCallback((cat: FoleyCategory) => {
    setCategory(cat);
    setCategoryFields(defaultCategoryFields(cat));
  }, []);

  // Compose prompt
  const composedPrompt = useMemo(() => {
    return buildFoleyPrompt({
      category,
      performer,
      material,
      recording,
      categoryFields,
      customPromptOverride: customOverride,
    });
  }, [category, performer, material, recording, categoryFields, customOverride]);

  // Round-robin plan
  const roundRobinPlan = useMemo(() => {
    return buildRoundRobinPlan(roundRobinConfig, performer, material, recording);
  }, [roundRobinConfig, performer, material, recording]);

  // Generate single
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const itemId = `foley-${Date.now()}`;
    const newItem: FoleyItem = {
      id: itemId,
      category,
      config: { category, performer, material, recording, categoryFields, customPromptOverride: customOverride },
      composedPrompt,
      takeNumber: results.length + 1,
      status: "generating",
    };
    setResults((prev) => [newItem, ...prev]);

    try {
      const res = await fetch("/api/elevenlabs/generate-sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: composedPrompt,
          duration_seconds: durationSeconds,
          loop: false,
          prompt_influence: promptInfluence,
          model_id: "eleven_text_to_sound_v2",
          output_format: "mp3_44100_128",
        }),
      });

      const data = await res.json();
      if (res.ok && data.audioUrl) {
        setResults((prev) =>
          prev.map((r) => r.id === itemId ? { ...r, status: "generated" as const, audioUrl: data.audioUrl, generationId: data.generationId } : r)
        );
        toast.success("Foley generated");
      } else {
        setResults((prev) =>
          prev.map((r) => r.id === itemId ? { ...r, status: "failed" as const, errorMessage: data.error } : r)
        );
        toast.error(data.error || "Generation failed");
      }
    } catch {
      setResults((prev) =>
        prev.map((r) => r.id === itemId ? { ...r, status: "failed" as const, errorMessage: "Network error" } : r)
      );
      toast.error("Network error");
    }

    setIsGenerating(false);
  }, [category, performer, material, recording, categoryFields, customOverride, composedPrompt, durationSeconds, promptInfluence, results, toast]);

  // Generate round-robin
  const handleRoundRobinGenerate = useCallback(async () => {
    if (roundRobinPlan.length === 0) return;
    setIsRoundRobinGenerating(true);
    setRoundRobinGenerated(0);

    const newItems: FoleyItem[] = roundRobinPlan.map((plan) => ({
      id: `rr-${Date.now()}-${plan.index}`,
      category: "footsteps" as FoleyCategory,
      config: { category: "footsteps" as FoleyCategory, performer, material, recording, categoryFields },
      composedPrompt: plan.prompt,
      takeNumber: plan.takeNumber,
      side: plan.side,
      status: "queued" as const,
    }));

    setResults((prev) => [...newItems, ...prev]);

    let generated = 0;
    for (const plan of roundRobinPlan) {
      const itemId = newItems[plan.index].id;

      // Mark generating
      setResults((prev) => prev.map((r) => r.id === itemId ? { ...r, status: "generating" as const } : r));

      try {
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: plan.prompt,
            duration_seconds: durationSeconds,
            loop: false,
            prompt_influence: promptInfluence,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          setResults((prev) => prev.map((r) => r.id === itemId ? { ...r, status: "generated" as const, audioUrl: data.audioUrl, generationId: data.generationId } : r));
          generated++;
        } else {
          setResults((prev) => prev.map((r) => r.id === itemId ? { ...r, status: "failed" as const, errorMessage: data.error } : r));
        }
      } catch {
        setResults((prev) => prev.map((r) => r.id === itemId ? { ...r, status: "failed" as const, errorMessage: "Network error" } : r));
      }

      setRoundRobinGenerated(generated);
    }

    setIsRoundRobinGenerating(false);
    toast.success(`${generated}/${roundRobinPlan.length} round-robin sounds generated`);
  }, [roundRobinPlan, performer, material, recording, categoryFields, durationSeconds, promptInfluence, toast]);

  // Layout
  const showRoundRobin = category === "footsteps" || category === "props" || category === "cloth";

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-4 pt-2">

      {/* 2-column grid: main controls | sticky sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1 — Category Selector */}
          <FoleyCategorySelector selected={category} onSelect={handleCategoryChange} />

          {/* 2 — Performance + Material side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FoleyPerformanceBuilder
              performer={performer}
              categoryFields={categoryFields}
              onPerformerChange={setPerformer}
              onCategoryFieldsChange={setCategoryFields}
            />
            <FoleyMaterialBuilder material={material} onChange={setMaterial} />
          </div>

          {/* 3 — Perspective */}
          <FoleyPerspectivePanel recording={recording} onChange={setRecording} />
        </div>

        {/* Right column — sticky sidebar */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          {/* 4 — Prompt Preview */}
          <FoleyPromptPreview
            composedPrompt={composedPrompt}
            customOverride={customOverride}
            onCustomOverrideChange={setCustomOverride}
            durationSeconds={durationSeconds}
            onDurationChange={setDurationSeconds}
            promptInfluence={promptInfluence}
            onPromptInfluenceChange={setPromptInfluence}
          />

          {/* 5 — Generate + Results */}
          <FoleyGeneratePanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            results={results}
            estimatedCost={estimateFoleyCost(1)}
          />

          {/* 6 — Round-Robin (conditional) */}
          {showRoundRobin && (
            <FoleyRoundRobinPanel
              config={roundRobinConfig}
              onChange={setRoundRobinConfig}
              plan={roundRobinPlan}
              onGenerate={handleRoundRobinGenerate}
              isGenerating={isRoundRobinGenerating}
              generatedCount={roundRobinGenerated}
            />
          )}
        </div>
      </div>
    </div>
  );
}
