"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload, Loader2, ArrowRight, AlertCircle, Film,
  CheckCircle, Layers, Eye,
  FileText, Gamepad2, Subtitles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { TimelineCueRow } from "./TimelineCueRow";
import { TimelineExport } from "./TimelineExport";
import type { TimelineCue, TimelineScene, TimelineFormat, TimelineImport } from "@/lib/timeline/types";
import { FORMAT_LABELS, TIMELINE_FORMATS } from "@/lib/timeline/types";

type Step = "upload" | "review" | "generate";

const FORMAT_ICONS: Record<TimelineFormat, typeof Film> = {
  edl: Film,
  csv_cue: FileText,
  srt: Subtitles,
  vtt: Subtitles,
  script: FileText,
  timecoded_notes: FileText,
  game_events: Gamepad2,
  manual: FileText,
};

const SAMPLE_TIMECODED_NOTES = `00:02:14:12 — Door opens slowly.
00:02:17:03 — Character steps into flooded room.
00:02:21:10 — Distant creature breath.
00:02:25:00 — Water dripping from ceiling.
00:02:28:15 — Electrical sparks from damaged panel.`;

interface TimelineImportPanelProps {
  hasFullImportAccess: boolean;
}

export function TimelineImportPanel({ hasFullImportAccess }: TimelineImportPanelProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step flow
  const [step, setStep] = useState<Step>("upload");

  // Upload state
  const [rawText, setRawText] = useState("");
  const [formatOverride, setFormatOverride] = useState<TimelineFormat | "">("");
  const [frameRate, setFrameRate] = useState(24);
  const [filename, setFilename] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed state
  const [, setTimeline] = useState<TimelineImport | null>(null);
  const [cues, setCues] = useState<TimelineCue[]>([]);
  const [scenes, setScenes] = useState<TimelineScene[]>([]);
  const [selectedCues, setSelectedCues] = useState<Set<string>>(new Set());
  const [implicitCueCount, setImplicitCueCount] = useState(0);
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [canAfford, setCanAfford] = useState(true);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(0);

  // ── File Upload Handler ────────────────────────────────────

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  }, []);

  // ── Parse ──────────────────────────────────────────────────

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) {
      setParseError("No content to parse");
      return;
    }

    setParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/timeline/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          format: formatOverride || undefined,
          frameRate,
          filename: filename || "pasted-content",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Parse failed");
        return;
      }

      setTimeline(data.timeline);
      setCues(data.timeline.cues);
      setScenes(data.timeline.scenes);
      setImplicitCueCount(data.stats.implicitCueCount);
      setEstimatedCredits(data.stats.estimatedCredits);
      setCanAfford(data.stats.canAfford);

      // Select all cues by default
      setSelectedCues(new Set(data.timeline.cues.map((c: TimelineCue) => c.id)));
      setStep("review");

      toast.success(`${data.stats.totalCues} cues parsed from ${FORMAT_LABELS[data.stats.format as TimelineFormat]}`);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }, [rawText, formatOverride, frameRate, filename, toast]);

  // ── Cue Management ─────────────────────────────────────────

  const handleUpdateCue = useCallback((id: string, updates: Partial<TimelineCue>) => {
    setCues((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const handleRemoveCue = useCallback((id: string) => {
    setCues((prev) => prev.filter((c) => c.id !== id));
    setSelectedCues((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedCues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCues.size === cues.length) {
      setSelectedCues(new Set());
    } else {
      setSelectedCues(new Set(cues.map((c) => c.id)));
    }
  }, [selectedCues, cues]);

  // ── Batch Generation ───────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    const toGenerate = cues.filter((c) => selectedCues.has(c.id) && c.generatedPrompt);
    if (toGenerate.length === 0) {
      toast.error("No cues selected for generation");
      return;
    }

    setGenerating(true);
    setGenProgress(0);
    setGenTotal(toGenerate.length);
    setStep("generate");

    // Mark selected as generating
    setCues((prev) => prev.map((c) =>
      selectedCues.has(c.id) ? { ...c, status: "generating" as const } : c
    ));

    try {
      const res = await fetch("/api/timeline/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cues: toGenerate.map((c) => ({
            id: c.id,
            prompt: c.generatedPrompt,
            category: c.category,
            timecodeIn: c.timecodeIn,
            durationSeconds: c.durationMs ? c.durationMs / 1000 : 4,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Generation failed");
        setGenerating(false);
        return;
      }

      // Apply results to cues
      const resultMap = new Map(data.results.map((r: { cueId: string; status: string; audioUrl?: string; generationId?: string; errorMessage?: string }) => [r.cueId, r]));
      setCues((prev) => prev.map((c) => {
        const result = resultMap.get(c.id) as { status: string; audioUrl?: string; generationId?: string; errorMessage?: string } | undefined;
        if (!result) return c;
        return {
          ...c,
          status: result.status === "completed" ? "generated" as const : "failed" as const,
          audioUrl: result.audioUrl,
          generationId: result.generationId,
        };
      }));

      setGenProgress(toGenerate.length);
      toast.success(`${data.summary.succeeded}/${data.summary.total} cues generated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [cues, selectedCues, toast]);

  // ── Helpers ────────────────────────────────────────────────

  const getSceneForCue = (cue: TimelineCue): string | undefined => {
    const scene = scenes.find((s) => s.cueIds.includes(cue.id));
    return scene?.name;
  };

  const maxCues = hasFullImportAccess ? Infinity : 10;
  const visibleCues = cues.slice(0, maxCues);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-4 text-sm">
        {[
          { key: "upload", label: "Import" },
          { key: "review", label: "Review Cues" },
          { key: "generate", label: "Generate" },
        ].map(({ key, label }, i) => {
          const stepIdx = ["upload", "review", "generate"].indexOf(step);
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-2",
                i <= stepIdx ? "text-atlas-accent" : "text-atlas-text-dim"
              )}
            >
              <span className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                i <= stepIdx ? "bg-atlas-accent text-white" : "bg-atlas-surface text-atlas-text-dim"
              )}>
                {i < stepIdx ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {label}
              {i < 2 && <ArrowRight className="h-3 w-3 text-atlas-text-dim" />}
            </div>
          );
        })}
      </div>

      {/* ═══ Step 1: Upload ═══ */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* File upload zone */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-atlas-border bg-atlas-surface p-12 transition-colors hover:border-atlas-accent/40">
            <Film className="mb-4 h-10 w-10 text-atlas-text-dim" />
            <p className="mb-2 text-sm font-medium text-atlas-text">
              Import Timeline / Spotting Data
            </p>
            <p className="mb-4 text-xs text-atlas-text-muted text-center max-w-md">
              Upload an EDL, CSV cue sheet, SRT/VTT subtitle file, script excerpt, or game event list.
              Or paste timecoded notes directly below.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".edl,.csv,.tsv,.srt,.vtt,.txt,.json,.fountain,.fdx,.md"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-atlas-accent-hover"
            >
              <Upload className="h-4 w-4" /> Choose File
            </button>
            {filename && (
              <div className="mt-3 flex items-center gap-2 text-xs text-atlas-accent">
                <FileText className="h-3.5 w-3.5" />
                {filename}
              </div>
            )}
          </div>

          {/* Paste area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-atlas-text-dim">
                Or paste timeline / cue content:
              </label>
              <button
                onClick={() => setRawText(SAMPLE_TIMECODED_NOTES)}
                className="text-xs text-atlas-text-dim hover:text-atlas-accent transition-colors"
              >
                Load sample
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder={SAMPLE_TIMECODED_NOTES}
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-4 py-3 text-xs text-atlas-text font-mono resize-none focus:border-atlas-accent focus:outline-none placeholder:text-atlas-text-dim/40"
            />
          </div>

          {/* Format & Frame Rate */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-atlas-text-dim">Format (auto-detect)</label>
              <select
                value={formatOverride}
                onChange={(e) => setFormatOverride(e.target.value as TimelineFormat | "")}
                className="rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                <option value="">Auto-detect</option>
                {TIMELINE_FORMATS.map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-atlas-text-dim">Frame Rate</label>
              <select
                value={frameRate}
                onChange={(e) => setFrameRate(Number(e.target.value))}
                className="rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
              >
                {[23.976, 24, 25, 29.97, 30, 48, 60].map((r) => (
                  <option key={r} value={r}>{r} fps</option>
                ))}
              </select>
            </div>
          </div>

          {/* Supported formats grid */}
          <div className="rounded-xl border border-atlas-border-subtle bg-atlas-surface/50 p-4">
            <p className="text-xs font-semibold text-atlas-text-dim uppercase tracking-wider mb-3">
              Supported Formats
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TIMELINE_FORMATS.map((f) => {
                const Icon = FORMAT_ICONS[f];
                return (
                  <div key={f} className="flex items-center gap-2 text-xs text-atlas-text-muted">
                    <Icon className="h-3.5 w-3.5 text-atlas-text-dim" />
                    {FORMAT_LABELS[f]}
                  </div>
                );
              })}
            </div>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {parseError}
            </div>
          )}

          {!hasFullImportAccess && (
            <div className="flex items-center gap-2 text-xs text-atlas-mock">
              <AlertCircle className="h-3.5 w-3.5" />
              Preview mode: showing up to 10 cues before committing the full local import.
            </div>
          )}

          {/* Parse button */}
          <button
            onClick={handleParse}
            disabled={parsing || !rawText.trim()}
            className={cn(
              "w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
              parsing || !rawText.trim()
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-atlas-accent text-white hover:bg-atlas-accent-hover"
            )}
          >
            {parsing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Parsing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" /> Parse & Preview Cues
              </span>
            )}
          </button>
        </div>
      )}

      {/* ═══ Step 2: Review ═══ */}
      {step === "review" && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex items-center justify-between rounded-xl border border-atlas-border bg-atlas-surface px-5 py-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-atlas-text-dim">
                <span className="font-semibold text-atlas-text">{cues.length}</span> cues
              </span>
              <span className="text-atlas-text-dim">
                <span className="font-semibold text-atlas-text">{scenes.length}</span> scenes
              </span>
              {implicitCueCount > 0 && (
                <span className="text-atlas-text-dim">
                  <span className="font-semibold text-amber-400">+{implicitCueCount}</span> implicit
                </span>
              )}
              <span className={cn("font-medium", canAfford ? "text-atlas-accent" : "text-red-400")}>
                ~{estimatedCredits} provider calls
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-atlas-text-muted hover:text-atlas-accent transition-colors"
              >
                {selectedCues.size === cues.length ? "Deselect all" : "Select all"}
              </button>
              <button
                onClick={() => setStep("upload")}
                className="rounded-lg border border-atlas-border px-3 py-1.5 text-xs text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-colors"
              >
                Re-import
              </button>
            </div>
          </div>

          {/* Scene grouping sidebar + cue list */}
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
            {/* Scene sidebar */}
            {scenes.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-atlas-text-dim uppercase tracking-wider px-1">
                  Scenes
                </p>
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="rounded-lg border border-atlas-border-subtle bg-atlas-surface/50 px-3 py-2 text-xs"
                  >
                    <div className="font-medium text-atlas-text truncate">{scene.name}</div>
                    <div className="text-atlas-text-dim mt-0.5">
                      {scene.cueIds.length} cues · {scene.timecodeIn}
                    </div>
                    {scene.inferredAmbience && (
                      <div className="text-xs text-atlas-accent mt-1 truncate">
                        🎧 {scene.inferredAmbience}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Cue list */}
            <div className="space-y-2">
              {visibleCues.map((cue) => (
                <TimelineCueRow
                  key={cue.id}
                  cue={cue}
                  sceneLabel={getSceneForCue(cue)}
                  onUpdate={handleUpdateCue}
                  onRemove={handleRemoveCue}
                  isSelected={selectedCues.has(cue.id)}
                  onSelect={handleToggleSelect}
                />
              ))}
              {cues.length > maxCues && (
                <div className="text-center py-4 text-xs text-atlas-text-dim">
                  +{cues.length - maxCues} more cues.
                </div>
              )}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || selectedCues.size === 0 || !canAfford || (!hasFullImportAccess && cues.length > 10)}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-semibold transition-all",
              generating || selectedCues.size === 0 || !canAfford
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating {genProgress}/{genTotal}...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Generate {selectedCues.size} Cue{selectedCues.size !== 1 ? "s" : ""} ({estimatedCredits} provider calls)
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* ═══ Step 3: Generate / Results ═══ */}
      {step === "generate" && (
        <div className="space-y-4">
          {/* Progress */}
          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-atlas-text-dim">
                <span>Generating cues...</span>
                <span className="tabular-nums">{genProgress}/{genTotal}</span>
              </div>
              <div className="h-2 rounded-full bg-atlas-surface-hover overflow-hidden">
                <div
                  className="h-full rounded-full bg-atlas-accent transition-all duration-500"
                  style={{ width: `${genTotal > 0 ? (genProgress / genTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Results list */}
          <div className="space-y-2">
            {cues.map((cue) => (
              <TimelineCueRow
                key={cue.id}
                cue={cue}
                sceneLabel={getSceneForCue(cue)}
                onUpdate={handleUpdateCue}
                onRemove={handleRemoveCue}
                isSelected={selectedCues.has(cue.id)}
                onSelect={handleToggleSelect}
              />
            ))}
          </div>

          {/* Export */}
          <TimelineExport cues={cues} />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep("review")}
              className="rounded-lg border border-atlas-border px-4 py-2.5 text-sm font-medium text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text"
            >
              Back to Review
            </button>
            <button
              onClick={() => {
                setStep("upload");
                setCues([]);
                setScenes([]);
                setTimeline(null);
                setRawText("");
                setFilename("");
              }}
              className="rounded-lg border border-atlas-border px-4 py-2.5 text-sm font-medium text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text"
            >
              New Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
