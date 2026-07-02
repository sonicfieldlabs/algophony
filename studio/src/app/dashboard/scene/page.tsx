"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Sparkles, ChevronRight, FileAudio, Save, Loader2 } from "lucide-react";
import { breakdownScene, type SceneEvent } from "@/lib/sfx/scene-breakdown";
import { criticize, type CriticReport } from "@/lib/sfx/critic";
import type { SfxPromptAttributes } from "@/lib/sfx/prompt-schema";

const DEMO_SCENE =
  "A creature crawls through a flooded subway tunnel while loose cables spark, rats move behind a metal panel, and a distant train rumbles.";

export default function ScenePage() {
  const router = useRouter();
  const [sceneText, setSceneText] = useState("");
  const [events, setEvents] = useState<SceneEvent[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [criticReport, setCriticReport] = useState<CriticReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const handleBreakdown = () => {
    const text = sceneText.trim() || DEMO_SCENE;
    if (!sceneText.trim()) setSceneText(DEMO_SCENE);
    const parsed = breakdownScene(text);
    setEvents(parsed);
    setSelectedIdx(null);
    setCriticReport(null);
    setGenerationResult(null);
  };

  const handleSelectEvent = (idx: number) => {
    setSelectedIdx(idx);
    setGenerationResult(null);
    const event = events[idx];
    const fullAttrs: SfxPromptAttributes = {
      category: event.attributes.category || event.category,
      loop: event.attributes.loop ?? false,
      promptInfluence: event.attributes.promptInfluence ?? 0.3,
      modelId: "eleven_text_to_sound_v2",
      exclusions: event.attributes.exclusions ?? [],
      ...event.attributes,
    };
    setCriticReport(criticize(fullAttrs));
  };

  const handleGenerate = async () => {
    if (selectedIdx === null) return;
    const event = events[selectedIdx];
    setGenerating(true);
    setGenerationResult(null);
    try {
      const res = await fetch("/api/elevenlabs/generate-sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: event.generatedPrompt,
          duration_seconds: event.attributes.durationSeconds ?? null,
          loop: event.attributes.loop ?? false,
          prompt_influence: event.attributes.promptInfluence ?? 0.3,
          exclusion_constraints: event.attributes.exclusions ?? ["no music", "no dialogue"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenerationResult(`Generated! Credits remaining: ${data.creditsRemaining}`);
    } catch (err) {
      setGenerationResult(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditCard = (event: SceneEvent) => {
    // Pass full attributes as query params
    const params = new URLSearchParams();
    params.set("category", event.category);
    if (event.attributes.sourceObject) params.set("sourceObject", event.attributes.sourceObject);
    if (event.attributes.action) params.set("action", event.attributes.action);
    if (event.attributes.environment) params.set("environment", event.attributes.environment);
    if (event.attributes.surface) params.set("surface", event.attributes.surface);
    if (event.attributes.material) params.set("material", event.attributes.material);
    if (event.attributes.perspective) params.set("perspective", event.attributes.perspective);
    if (event.attributes.durationSeconds) params.set("duration", String(event.attributes.durationSeconds));
    if (event.attributes.loop) params.set("loop", "true");
    params.set("title", event.title);
    router.push(`/dashboard/cards/new?${params.toString()}`);
  };

  const handleSaveAllEvents = async () => {
    if (events.length === 0) return;
    setSavingAll(true);
    try {
      for (const event of events) {
        await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            attributes: {
              category: event.category,
              ...event.attributes,
            },
          }),
        });
      }
      setGenerationResult(`Saved ${events.length} cards!`);
    } catch (err) {
      setGenerationResult(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingAll(false);
    }
  };

  const selectedEvent = selectedIdx !== null ? events[selectedIdx] : null;

  return (
    <div className="flex h-full">
      {/* Scene Input + Events */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-xl font-semibold text-atlas-text">
          Scene Breakdown
        </h1>
        <p className="mb-6 text-sm text-atlas-text-muted">
          Paste a scene description and break it into individual SFX event cards.
        </p>

        {/* Scene input */}
        <div className="mb-6">
          <textarea
            value={sceneText}
            onChange={(e) => setSceneText(e.target.value)}
            placeholder={DEMO_SCENE}
            rows={4}
            className="mb-3 w-full resize-none rounded-lg border border-atlas-border bg-atlas-surface p-4 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBreakdown}
              className="flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover"
            >
              <Zap className="h-4 w-4" />
              Break into SFX Events
            </button>
            {events.length > 0 && (
              <button
                onClick={handleSaveAllEvents}
                disabled={savingAll}
                className="flex items-center gap-2 rounded-lg border border-atlas-border px-4 py-2.5 text-sm font-medium text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text disabled:opacity-50"
              >
                {savingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save All Events as Cards
              </button>
            )}
          </div>
        </div>

        {/* Status message */}
        {generationResult && (
          <div className="mb-4 rounded-lg border border-atlas-border-subtle bg-atlas-surface px-4 py-2 text-sm text-atlas-text-muted">
            {generationResult}
          </div>
        )}

        {/* Event cards */}
        {events.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-atlas-text-muted">
              {events.length} events detected
            </h2>
            <div className="space-y-2">
              {events.map((event, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectEvent(i)}
                  className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                    selectedIdx === i
                      ? "border-atlas-accent bg-atlas-accent-muted"
                      : "border-atlas-border bg-atlas-surface hover:border-atlas-border hover:bg-atlas-surface-hover"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-bg text-xs font-mono text-atlas-text-dim">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-atlas-text">
                      {event.title}
                    </div>
                    <div className="mt-0.5 text-xs text-atlas-text-dim">
                      {event.category}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-atlas-text-dim" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right inspector */}
      {selectedEvent && (
        <div className="w-80 shrink-0 overflow-y-auto border-l border-atlas-border-subtle bg-atlas-surface p-4">
          <h3 className="mb-4 text-sm font-semibold text-atlas-text">
            {selectedEvent.title}
          </h3>

          {/* Generated prompt */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
              <Sparkles className="h-3 w-3" />
              Composed Prompt
            </div>
            <div className="rounded-lg border border-atlas-border bg-atlas-bg p-3">
              <p className="font-mono text-xs leading-relaxed text-atlas-text">
                {selectedEvent.generatedPrompt}
              </p>
            </div>
            <div className="mt-1 text-right text-xs text-atlas-text-dim">
              {selectedEvent.generatedPrompt.length} chars
            </div>
          </div>

          {/* Critic report */}
          {criticReport && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-atlas-text-dim">
                Prompt Critic
              </div>
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`text-2xl font-bold ${
                    criticReport.grade === "strong"
                      ? "text-atlas-success"
                      : criticReport.grade === "usable"
                      ? "text-atlas-warning"
                      : "text-atlas-danger"
                  }`}
                >
                  {criticReport.score}
                </div>
                <div>
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
                <div className="space-y-2">
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
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-atlas-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-atlas-accent-hover disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileAudio className="h-3.5 w-3.5" />
              )}
              {generating ? "Generating..." : "Generate"}
            </button>
            <button
              onClick={() => handleEditCard(selectedEvent)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-atlas-border px-3 py-2 text-xs font-medium text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text"
            >
              Edit Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
