"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, Play, Save } from "lucide-react";
import { useToast } from "@/app/dashboard/toast";
import { VariationSourceSelector } from "./VariationSourceSelector";
import { PreservationLockPanel } from "./PreservationLockPanel";
import { VariationAxesPanel } from "./VariationAxesPanel";
import { VariationStrategySelector } from "./VariationStrategySelector";
import { BatchConfigPanel } from "./BatchConfigPanel";
import { VariationQueueTable } from "./VariationQueueTable";
import { VariationResultsGrid } from "./VariationResultsGrid";
import { BatchExportPanel } from "./BatchExportPanel";
import type {
  VariationSource,
  VariationStrategy,
  BatchMode,
  PreservationSettings,
  VariationBatch,
  SoundFamily,
} from "@/lib/sfx/variation-taxonomy";
import {
  createDefaultBatch,
  getDefaultPreservation,
} from "@/lib/sfx/variation-taxonomy";
import {
  planBatchJobs,
  applyEvaluationFeedback,
  estimateVariationCost,
} from "@/lib/sfx/variation-prompt";

// ── Storage ───────────────────────────────────────────────────

const STORAGE_KEY = "algophony-studio-variation-batches";

function loadBatches(): VariationBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBatches(batches: VariationBatch[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  }
}

// ── Page ──────────────────────────────────────────────────────

export default function VariationLabPage() {
  const toast = useToast();

  // Batch state
  const [batches, setBatches] = useState<VariationBatch[]>(() => loadBatches());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(batches[0]?.id ?? null);
  const activeBatch = batches.find((b) => b.id === activeBatchId) ?? null;

  // Source state
  const [source, setSource] = useState<VariationSource>({
    type: "manual_prompt",
    promptText: "",
  });

  // Config state (editable before generation)
  const [strategy, setStrategy] = useState<VariationStrategy>("micro_variation");
  const [batchMode, setBatchMode] = useState<BatchMode>("n_from_one");
  const [preservation, setPreservation] = useState<PreservationSettings>(getDefaultPreservation("micro_variation"));
  const [selectedAxes, setSelectedAxes] = useState<string[]>(["intensity", "texture", "micro_timing"]);
  const [batchSize, setBatchSize] = useState(4);
  const [generationsPerSource, setGenerationsPerSource] = useState(1);

  // Generation state
  const [isRunning, setIsRunning] = useState(false);
  const [_isPaused, setIsPaused] = useState(false);
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);

  // Family state (for Phase 3)
  const [family, setFamily] = useState<SoundFamily | null>(null);

  // Credits (from profile; default 250 for dev)
  const [creditsRemaining] = useState(250);

  // ── Helpers ─────────────────────────────────────────────────

  const persistBatches = useCallback(
    (updated: VariationBatch[]) => {
      setBatches(updated);
      saveBatches(updated);
    },
    []
  );

  const updateActiveBatch = useCallback(
    (partial: Partial<VariationBatch>) => {
      if (!activeBatchId) return;
      const updated = batches.map((b) =>
        b.id === activeBatchId ? { ...b, ...partial, updatedAt: Date.now() } : b
      );
      persistBatches(updated);
    },
    [activeBatchId, batches, persistBatches]
  );

  // ── Strategy change → auto-update preservation ────────────

  const handleStrategyChange = useCallback((s: VariationStrategy) => {
    setStrategy(s);
    setPreservation(getDefaultPreservation(s));
  }, []);

  // ── Generate batch ─────────────────────────────────────────

  const handleStartBatch = useCallback(async () => {
    if (!source.promptText.trim()) {
      toast.error("Enter a source prompt first");
      return;
    }

    const isCardsOnly = batchMode === "cards_only";
    const { totalCredits } = estimateVariationCost(batchSize, generationsPerSource, isCardsOnly);

    if (!isCardsOnly && totalCredits > creditsRemaining) {
      toast.error("Insufficient credits");
      return;
    }

    // Plan jobs
    const plan = planBatchJobs(source, strategy, preservation, selectedAxes, batchSize);

    // Create batch entity
    const batch: VariationBatch = {
      ...createDefaultBatch(),
      name: source.promptText.slice(0, 40),
      sourceType: source.type,
      strategy,
      batchMode,
      preservation,
      selectedAxes,
      batchSize,
      generationsPerSource,
      estimatedCost: plan.totalCost,
      actualCost: 0,
      status: isCardsOnly ? "completed" : "running",
      jobs: plan.jobs.map((j, i) => ({
        id: `job-${Date.now()}-${i}`,
        batchId: "",
        jobIndex: j.index,
        sourcePrompt: source.promptText,
        generatedPrompt: j.prompt,
        status: isCardsOnly ? "generated" : "queued",
        isFavorite: false,
        isRejected: false,
        evaluationTags: [],
      })),
    };
    batch.jobs.forEach((j) => (j.batchId = batch.id));

    const updated = [batch, ...batches];
    persistBatches(updated);
    setActiveBatchId(batch.id);

    // Create sound family
    setFamily({
      id: `fam-${Date.now()}`,
      name: batch.name,
      sourcePrompt: source.promptText,
      strategy,
      preservation,
      memberIds: [],
      favoriteIds: [],
      rejectedIds: [],
      createdAt: Date.now(),
    });

    if (isCardsOnly) {
      toast.success(`${plan.jobs.length} prompt cards created — review before saving`);
      return;
    }

    // Run sequential generation
    setIsRunning(true);
    cancelRef.current = false;
    pauseRef.current = false;

    let completedCount = 0;
    const jobsCopy = [...batch.jobs];

    for (let i = 0; i < jobsCopy.length; i++) {
      // Check cancel/pause
      if (cancelRef.current) {
        for (let j = i; j < jobsCopy.length; j++) {
          jobsCopy[j] = { ...jobsCopy[j], status: "cancelled" };
        }
        break;
      }

      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelRef.current) break;
      }

      // Mark running
      jobsCopy[i] = { ...jobsCopy[i], status: "running" };
      persistBatches([
        { ...batch, jobs: [...jobsCopy], status: "running" },
        ...batches,
      ]);

      try {
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: jobsCopy[i].generatedPrompt,
            duration_seconds: 5,
            loop: false,
            prompt_influence: 0.3,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          jobsCopy[i] = {
            ...jobsCopy[i],
            status: "generated",
            audioUrl: data.audioUrl,
            generationId: data.generationId,
          };
          completedCount++;
        } else {
          jobsCopy[i] = {
            ...jobsCopy[i],
            status: "failed",
            errorMessage: data.error || "Generation failed",
          };
        }
      } catch {
        jobsCopy[i] = {
          ...jobsCopy[i],
          status: "failed",
          errorMessage: "Network error",
        };
      }

      // Update state after each job
      persistBatches([
        { ...batch, jobs: [...jobsCopy], actualCost: completedCount },
        ...batches,
      ]);
    }

    // Finalize
    const finalBatch: VariationBatch = {
      ...batch,
      jobs: jobsCopy,
      status: cancelRef.current ? "cancelled" : "completed",
      actualCost: completedCount,
    };
    persistBatches([finalBatch, ...batches]);
    setIsRunning(false);
    toast.success(`${completedCount}/${jobsCopy.length} variations generated`);
  }, [
    source, strategy, batchMode, preservation, selectedAxes,
    batchSize, generationsPerSource, creditsRemaining,
    batches, persistBatches, toast,
  ]);

  // ── Queue controls ─────────────────────────────────────────

  const handlePause = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  const handleRetryFailed = useCallback(async () => {
    if (!activeBatch) return;
    const failedJobs = activeBatch.jobs.filter((j) => j.status === "failed");
    if (failedJobs.length === 0) return;

    setIsRunning(true);
    cancelRef.current = false;
    const jobsCopy = [...activeBatch.jobs];
    let retried = 0;

    for (const fj of failedJobs) {
      if (cancelRef.current) break;
      const idx = jobsCopy.findIndex((j) => j.id === fj.id);
      if (idx < 0) continue;

      // Apply evaluation feedback if any
      const { prompt: retryPrompt } = fj.evaluationTags.length > 0
        ? applyEvaluationFeedback(fj.generatedPrompt, fj.evaluationTags)
        : { prompt: fj.generatedPrompt };

      jobsCopy[idx] = { ...jobsCopy[idx], status: "retrying", generatedPrompt: retryPrompt };
      updateActiveBatch({ jobs: [...jobsCopy] });

      try {
        const res = await fetch("/api/elevenlabs/generate-sfx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: retryPrompt,
            duration_seconds: 5,
            loop: false,
            prompt_influence: 0.3,
            model_id: "eleven_text_to_sound_v2",
            output_format: "mp3_44100_128",
          }),
        });

        const data = await res.json();
        if (res.ok && data.audioUrl) {
          jobsCopy[idx] = { ...jobsCopy[idx], status: "generated", audioUrl: data.audioUrl, generationId: data.generationId, errorMessage: undefined };
          retried++;
        } else {
          jobsCopy[idx] = { ...jobsCopy[idx], status: "failed", errorMessage: data.error };
        }
      } catch {
        jobsCopy[idx] = { ...jobsCopy[idx], status: "failed", errorMessage: "Network error" };
      }

      updateActiveBatch({ jobs: [...jobsCopy] });
    }

    setIsRunning(false);
    toast.success(`${retried}/${failedJobs.length} retries succeeded`);
  }, [activeBatch, updateActiveBatch, toast]);

  // ── Favorite / Reject ──────────────────────────────────────

  const handleFavorite = useCallback((jobId: string) => {
    if (!activeBatch) return;
    const jobs = activeBatch.jobs.map((j) =>
      j.id === jobId ? { ...j, isFavorite: !j.isFavorite, isRejected: false } : j
    );
    updateActiveBatch({ jobs });
  }, [activeBatch, updateActiveBatch]);

  const handleReject = useCallback((jobId: string) => {
    if (!activeBatch) return;
    const jobs = activeBatch.jobs.map((j) =>
      j.id === jobId ? { ...j, isRejected: !j.isRejected, isFavorite: false } : j
    );
    updateActiveBatch({ jobs });
  }, [activeBatch, updateActiveBatch]);

  // ── New batch ──────────────────────────────────────────────

  const handleNewBatch = useCallback(() => {
    const nb = createDefaultBatch();
    const updated = [nb, ...batches];
    persistBatches(updated);
    setActiveBatchId(nb.id);
    setSource({ type: "manual_prompt", promptText: "" });
    setFamily(null);
    toast.success("New batch created");
  }, [batches, persistBatches, toast]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* Batch selector — kept; the page title now lives in the topbar. */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {batches.length > 0 && (
            <select
              value={activeBatchId ?? ""}
              onChange={(e) => setActiveBatchId(e.target.value)}
              className="rounded-xl border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Untitled Batch"}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleNewBatch}
            className="rounded-xl border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      {/* Section 1 — Source Selector */}
      <VariationSourceSelector source={source} onSourceChange={setSource} />

      {/* Section 2–3 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 2 — Preservation Settings */}
        <PreservationLockPanel preservation={preservation} onChange={setPreservation} />
        {/* Section 3 — Variation Axes */}
        <VariationAxesPanel selectedAxes={selectedAxes} onChange={setSelectedAxes} />
      </div>

      {/* Section 4 — Strategy Selector */}
      <VariationStrategySelector strategy={strategy} onChange={handleStrategyChange} />

      {/* Section 5 — Batch Config */}
      <BatchConfigPanel
        batchMode={batchMode}
        batchSize={batchSize}
        generationsPerSource={generationsPerSource}
        creditsRemaining={creditsRemaining}
        onBatchModeChange={setBatchMode}
        onBatchSizeChange={setBatchSize}
        onGenerationsPerSourceChange={setGenerationsPerSource}
      />

      {/* Generate button */}
      <button
        onClick={handleStartBatch}
        disabled={isRunning || !source.promptText.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-atlas-accent py-3 text-sm font-semibold text-white hover:bg-atlas-accent-hover transition-colors disabled:opacity-40"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : batchMode === "cards_only" ? (
          <>
            <Save className="h-4 w-4" />
            Generate {batchSize} Prompt Cards
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Generate {batchSize} Variations · {estimateVariationCost(batchSize, generationsPerSource, false).totalCredits}cr
          </>
        )}
      </button>

      {/* Section 6 — Queue */}
      {activeBatch && activeBatch.jobs.length > 0 && (
        <VariationQueueTable
          jobs={activeBatch.jobs}
          isRunning={isRunning}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onRetryFailed={handleRetryFailed}
        />
      )}

      {/* Section 7 — Results Grid */}
      {activeBatch && (
        <VariationResultsGrid
          jobs={activeBatch.jobs}
          onFavorite={handleFavorite}
          onReject={handleReject}
        />
      )}

      {/* Section 8 — Export */}
      <BatchExportPanel batch={activeBatch} family={family} />
    </div>
  );
}
