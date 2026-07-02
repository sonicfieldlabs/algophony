"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2, Sparkles, Save, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { ListeningModeSelector, composeAnalyticalDirective, LISTENING_MODES } from "./ListeningModes";
import { AudioCleanupPanel } from "@/app/dashboard/components/AudioCleanupPanel";
import { TimingSyncPanel } from "@/app/dashboard/components/TimingSyncPanel";

interface AnalysisResult {
  summary: string;
  detected_sound_events: Array<{ tag: string }>;
  suggested_categories: string[];
  prompt_cards: Array<{ title: string; category: string; subcategory: string }>;
  exclusion_constraints: string[];
  quality_questions: string[];
  recommended_api_route: string;
}

export default function ListenPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isolating, setIsolating] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [referenceUploadId, setReferenceUploadId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [audioEvents, setAudioEvents] = useState<Array<{ tag: string }>>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savingCards, setSavingCards] = useState<Record<number, boolean>>({});
  const [savedCards, setSavedCards] = useState<Record<number, boolean>>({});
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const [selectedModes, setSelectedModes] = useState<string[]>(["listen"]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const url = URL.createObjectURL(selected);
    setFile(selected);
    setAudioPreviewUrl(url);
    setError(null);
    setUploadStatus(null);
    setReferenceUploadId(null);
    setTranscript(null);
    setAudioEvents([]);
    setAnalysis(null);
    setIsPlaying(false);
    setSavedCards({});

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const res = await fetch("/api/listen-mode/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        toast.error("Upload failed");
      } else {
        setReferenceUploadId(data.referenceUploadId);
        setUploadStatus(`Uploaded: ${selected.name}`);
        toast.success("Reference audio uploaded");
      }
    } catch {
      setError("Upload failed");
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!audioPreviewUrl) return;
    return () => URL.revokeObjectURL(audioPreviewUrl);
  }, [audioPreviewUrl]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
    }
  }, [isPlaying]);

  const toggleMode = useCallback((modeId: string) => {
    setSelectedModes((prev) =>
      prev.includes(modeId) ? prev.filter((m) => m !== modeId) : [...prev, modeId]
    );
  }, []);

  const handleIsolate = useCallback(async () => {
    if (!file) return;
    setIsolating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (referenceUploadId) formData.append("referenceUploadId", referenceUploadId);
      const res = await fetch("/api/elevenlabs/isolate-audio", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Isolation failed");
        toast.error(data.error || "Isolation failed");
      } else {
        toast.success("Audio isolation complete");
      }
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setIsolating(false);
    }
  }, [file, referenceUploadId, toast]);

  const handleTranscribe = useCallback(async () => {
    if (!file) return;
    setTranscribing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (referenceUploadId) formData.append("referenceUploadId", referenceUploadId);
      const res = await fetch("/api/elevenlabs/transcribe-reference", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Transcription failed");
        toast.error(data.error || "Transcription failed");
      } else {
        setTranscript(data.transcript);
        setAudioEvents(data.audioEvents ?? []);
        toast.success("Transcription complete");
      }
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setTranscribing(false);
    }
  }, [file, referenceUploadId, toast]);

  const handleAnalyze = useCallback(async () => {
    if (!referenceUploadId && !transcript) {
      setError("Transcribe the reference first");
      return;
    }
    setAnalyzing(true);
    setError(null);

    const analyticalDirective = composeAnalyticalDirective(selectedModes);
    const activeModeNames = selectedModes
      .map((id) => LISTENING_MODES.find((m) => m.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    try {
      const res = await fetch("/api/listen-mode/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceUploadId: referenceUploadId ?? "00000000-0000-0000-0000-000000000000",
          notes: `${notes}\n\n[Active listening modes: ${activeModeNames}]\n\n[Analytical directive]\n${analyticalDirective}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        toast.error(data.error || "Analysis failed");
      } else {
        setAnalysis(data);
        toast.success("Analysis complete");
      }
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setAnalyzing(false);
    }
  }, [referenceUploadId, transcript, notes, selectedModes, toast]);

  const handleSaveCard = useCallback(async (cardIndex: number) => {
    if (!analysis) return;
    const card = analysis.prompt_cards[cardIndex];
    if (!card) return;
    setSavingCards((prev) => ({ ...prev, [cardIndex]: true }));
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: card.title,
          category: card.category,
          subcategory: card.subcategory,
          generated_prompt: card.title,
          exclusions: analysis.exclusion_constraints,
          api_route: analysis.recommended_api_route || "sound_effects",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save card");
      } else {
        setSavedCards((prev) => ({ ...prev, [cardIndex]: true }));
        toast.success(`Saved: ${card.title}`);
      }
    } catch {
      toast.error("Failed to save card");
    } finally {
      setSavingCards((prev) => ({ ...prev, [cardIndex]: false }));
    }
  }, [analysis, toast]);

  const hasFile = !!file;

  return (
    <div className="p-5 max-w-6xl mx-auto animate-fade-in">
      {/* Two-column grid: main flow on the left, side tools on the right.
          Cleanup + Timing live in the rail so they aren't buried at the bottom. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* ── Main column ── */}
        <div className="space-y-4">
          {/* Upload + player as a single compact row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex-1 flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left transition-all",
                hasFile
                  ? "border-atlas-accent/40 bg-atlas-accent-muted"
                  : "border-atlas-border hover:border-atlas-text-dim hover:bg-atlas-surface/50"
              )}
            >
              <Upload className="h-5 w-5 shrink-0 text-atlas-text-dim" />
              <div className="min-w-0 flex-1">
                <span className="block text-sm text-atlas-text truncate">
                  {file ? file.name : "Drop reference audio or click to browse"}
                </span>
                <span className="block text-xs text-atlas-text-dim">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : "WAV · MP3 · FLAC"}
                </span>
              </div>
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-atlas-accent" />}
              {uploadStatus && !uploading && <span className="text-xs text-atlas-success">✓</span>}
              <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
            </button>

            {audioPreviewUrl && (
              <div className="flex items-center gap-2 rounded-xl border border-atlas-border bg-atlas-surface px-3 py-2 sm:w-[280px]">
                <button
                  onClick={togglePlayback}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                </button>
                <audio
                  ref={audioRef}
                  src={audioPreviewUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="flex-1 h-8"
                  controls
                />
              </div>
            )}
          </div>

          {/* Listening modalities + notes side by side. Modalities are pills
              with hover tooltips; notes stays small. */}
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3 atlas-card p-4">
            <ListeningModeSelector
              selectedModes={selectedModes}
              onToggleMode={toggleMode}
            />
            <div>
              <span className="atlas-eyebrow block mb-2">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what you hear or what you need…"
                rows={3}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder-atlas-text-dim resize-none focus:border-atlas-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleIsolate}
              disabled={!file || isolating}
              className="rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2.5 text-xs text-atlas-text-muted hover:bg-atlas-surface-hover disabled:opacity-40 transition-colors"
            >
              {isolating ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Isolate"}
            </button>
            <button
              onClick={handleTranscribe}
              disabled={!file || transcribing}
              className="rounded-lg border border-atlas-border bg-atlas-surface px-3 py-2.5 text-xs text-atlas-text-muted hover:bg-atlas-surface-hover disabled:opacity-40 transition-colors"
            >
              {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Transcribe"}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="rounded-lg bg-atlas-accent px-3 py-2.5 text-xs text-white hover:bg-atlas-accent-hover disabled:opacity-40 transition-colors"
            >
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : `Analyze · ${selectedModes.length}`}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-atlas-danger/30 bg-atlas-danger/5 p-2 text-xs text-atlas-danger">
              {error}
            </div>
          )}

          {/* Transcript */}
          {transcript !== null && (
            <div className="atlas-card p-3 animate-slide-up">
              <span className="atlas-eyebrow block mb-1">Transcript</span>
              <p className="text-xs text-atlas-text-muted">{transcript || "(no speech detected)"}</p>
            </div>
          )}

          {/* Audio events timeline */}
          {audioEvents.length > 0 && (
            <div className="atlas-card p-3 animate-slide-up">
              <span className="atlas-eyebrow block mb-2">Detected sound events</span>
              <div className="relative h-6 rounded-full bg-atlas-bg overflow-hidden mb-2">
                {audioEvents.map((e, i) => {
                  const pos = (i / audioEvents.length) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-1 rounded-full bg-atlas-text-muted"
                      style={{ left: `${pos}%` }}
                      title={e.tag}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {audioEvents.map((e, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text-muted"
                  >
                    {e.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Analysis results */}
          {analysis ? (
            <div className="space-y-3">
              <div className="atlas-card p-4 animate-fade-in">
                <span className="atlas-eyebrow mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Analysis summary
                </span>
                <p className="text-sm text-atlas-text-muted leading-relaxed">{analysis.summary}</p>
              </div>

              {analysis.suggested_categories.length > 0 && (
                <div className="atlas-card p-4 animate-fade-in">
                  <span className="atlas-eyebrow block mb-2">Suggested categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.suggested_categories.map((c) => (
                      <span key={c} className="rounded-full bg-atlas-accent-muted px-2.5 py-0.5 text-xs text-atlas-accent">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.prompt_cards.length > 0 && (
                <div className="atlas-card p-4 animate-fade-in">
                  <span className="atlas-eyebrow mb-2 flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Suggested cards
                  </span>
                  <div className="space-y-1.5">
                    {analysis.prompt_cards.map((card, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-atlas-bg px-3 py-2">
                        <div className="min-w-0">
                          <span className="text-xs text-atlas-text truncate">{card.title}</span>
                          <span className="ml-2 text-xs text-atlas-text-dim">{card.category}</span>
                        </div>
                        <button
                          onClick={() => handleSaveCard(i)}
                          disabled={savingCards[i] || savedCards[i]}
                          className={cn(
                            "rounded px-2 py-0.5 text-xs transition-colors shrink-0",
                            savedCards[i]
                              ? "bg-atlas-success/10 text-atlas-success"
                              : "bg-atlas-accent-muted text-atlas-accent hover:bg-atlas-accent/20"
                          )}
                        >
                          {savingCards[i] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : savedCards[i] ? (
                            "✓ Saved"
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.exclusion_constraints.length > 0 && (
                <div className="atlas-card p-4 animate-fade-in">
                  <span className="atlas-eyebrow block mb-2">Exclusions</span>
                  <div className="flex flex-wrap gap-1">
                    {analysis.exclusion_constraints.map((e) => (
                      <span key={e} className="rounded-full bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text-muted">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.quality_questions.length > 0 && (
                <div className="rounded-lg border border-atlas-warning/30 bg-atlas-warning/5 p-3 animate-fade-in">
                  <span className="atlas-eyebrow text-atlas-warning block mb-1">Questions</span>
                  {analysis.quality_questions.map((q, i) => (
                    <p key={i} className="text-xs text-atlas-text-muted">{q}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-atlas-border-subtle bg-atlas-surface/50 p-5 text-center">
              <p className="text-xs text-atlas-text-muted">
                Pick your listening modes above, then Analyze to see results here.
              </p>
            </div>
          )}
        </div>

        {/* ── Side rail: Cleanup + Timing (sticky so they stay visible) ── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <AudioCleanupPanel context="Listen Mode" compact />
          <TimingSyncPanel compact />
        </aside>
      </div>
    </div>
  );
}
