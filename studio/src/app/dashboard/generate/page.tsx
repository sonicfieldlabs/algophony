"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { AudioWaveform, Star, Check, RotateCcw, X, Sparkles, ShieldAlert, Volume2, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { POSITIVE_TAGS, NEGATIVE_TAGS, aggregateGuidance, type EvaluationTag } from "@/lib/sfx/evaluations";
import { getCategoryDefinition } from "@/lib/sfx/taxonomy";
import { buildAutoName, autoFilename } from "@/lib/sfx/auto-name";
import { CategoryBrowser } from "./CategoryBrowser";
import { AtlasSlider } from "./AtlasSlider";
import { FormatSelector } from "./FormatSelector";
import {
  PromptHistory,
  loadPromptHistory,
  saveToHistory,
  type PromptHistoryEntry,
} from "./PromptHistory";
import { InfluenceSweepPanel } from "./InfluenceSweepPanel";
import { ImplementationRoleSelector } from "./ImplementationRoleSelector";
import { LayerWarningsPanel } from "./LayerWarningsPanel";
import { VocabTrainer } from "./VocabTrainer";
import { useRegisterComposer } from "@/app/dashboard/components/floating-composer";

const BASE_EXCLUSIONS = ["no music", "no dialogue"];
const EXCLUSIONS_STORAGE_KEY = "atlas-exclusion-defaults";

/** Load user's persistent exclusion defaults */
function loadUserExclusions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXCLUSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save user's custom exclusions to localStorage */
function saveUserExclusions(exclusions: string[]) {
  try {
    // Only save user-added ones (not the base defaults)
    const custom = exclusions.filter((e) => !BASE_EXCLUSIONS.includes(e));
    localStorage.setItem(EXCLUSIONS_STORAGE_KEY, JSON.stringify(custom));
  } catch { /* storage full */ }
}

interface GenerationResult {
  generationId: string;
  audioUrl: string;
  characterCost: number;
  isMock: boolean;
  creditsRemaining: number;
  finalPromptText: string;
  status: string;
}

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Read URL params for Browser → Generate flow
  const initialText = searchParams.get("text") ?? "";
  const initialCategory = searchParams.get("category") ?? "";

  // Merge base exclusions + category defaults + user persistent defaults
  const initialExclusions = (() => {
    const catDef = initialCategory ? getCategoryDefinition(initialCategory) : undefined;
    const catExcl = catDef?.defaultExclusions ?? [];
    const userExcl = loadUserExclusions();
    return [...new Set([...BASE_EXCLUSIONS, ...catExcl, ...userExcl])];
  })();

  // ── State ──
  const [text, setText] = useState(initialText);
  const [duration, setDuration] = useState<number>(4);
  const [loop, setLoop] = useState(false);
  const [promptInfluence, setPromptInfluence] = useState(0.3);
  const [outputFormat, setOutputFormat] = useState(() => {
    if (typeof window === "undefined") return "mp3_44100_128";
    try {
      return localStorage.getItem("atlas-gen-output-format") || "mp3_44100_128";
    } catch {
      return "mp3_44100_128";
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exclusions, setExclusions] = useState<string[]>(initialExclusions);
  const [newExclusion, setNewExclusion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [verdictSent, setVerdictSent] = useState(false);
  const [evalGuidance, setEvalGuidance] = useState<string[]>([]);
  const [history, setHistory] = useState<PromptHistoryEntry[]>(() => loadPromptHistory());

  // Persist outputFormat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("atlas-gen-output-format", outputFormat);
    } catch { /* storage full */ }
  }, [outputFormat]);

  // ── Category change ──
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    if (cat) {
      const def = getCategoryDefinition(cat);
      if (def) {
        const userExcl = loadUserExclusions();
        setExclusions([...new Set([...BASE_EXCLUSIONS, ...def.defaultExclusions, ...userExcl])]);
      }
    } else {
      const userExcl = loadUserExclusions();
      setExclusions([...new Set([...BASE_EXCLUSIONS, ...userExcl])]);
    }
  };

  // ── Subcategory/surface/env click → append to prompt ──
  const handleSubcategoryClick = (word: string) => {
    setText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return word;
      // Add comma separator if text doesn't end with punctuation
      const separator = /[,.\-;:]$/.test(trimmed) ? " " : ", ";
      return trimmed + separator + word;
    });
    // Focus the textarea after
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ── Exclusion management with persistence ──
  const updateExclusions = useCallback((newList: string[]) => {
    setExclusions(newList);
    saveUserExclusions(newList);
  }, []);

  const addExclusion = () => {
    const trimmed = newExclusion.trim().toLowerCase();
    if (trimmed && !exclusions.includes(trimmed)) {
      updateExclusions([...exclusions, trimmed]);
    }
    setNewExclusion("");
  };

  const removeExclusion = (ex: string) => {
    updateExclusions(exclusions.filter((e) => e !== ex));
  };

  const resetExclusions = () => {
    const catDef = selectedCategory ? getCategoryDefinition(selectedCategory) : undefined;
    const catExcl = catDef?.defaultExclusions ?? [];
    const reset = [...new Set([...BASE_EXCLUSIONS, ...catExcl])];
    setExclusions(reset);
    try { localStorage.removeItem(EXCLUSIONS_STORAGE_KEY); } catch {}
    toast.success("Exclusions reset to defaults");
  };

  // ── Generate ──
  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setVerdictSent(false);
    setSelectedTags([]);
    setEvalGuidance([]);

    try {
      const res = await fetch("/api/elevenlabs/generate-sfx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          duration_seconds: duration,
          loop,
          prompt_influence: promptInfluence,
          model_id: "eleven_text_to_sound_v2",
          output_format: outputFormat,
          exclusion_constraints: exclusions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Tailor the toast to the error class returned by the server.
        const baseMessage = data.error || "Generation failed";
        let message = baseMessage;
        if (res.status === 429) {
          const retryAfter = data.retryAfterMs ? ` (try again in ${Math.ceil(data.retryAfterMs / 1000)}s)` : "";
          message = `${baseMessage}${retryAfter}`;
        } else if (res.status === 402) {
          message = `${baseMessage} — provider quota left: ${data.creditsRemaining ?? "?"}`;
        } else if (data.errorType === "model_error") {
          message = `${baseMessage} — try a different model or simpler prompt`;
        }
        setError(message);
        toast.error(message);
      } else {
        setResult(data);
        toast.success(`Sound generated (${data.characterCost ?? 0} chars)`);
        if (typeof data.creditsRemaining === "number") {
          window.dispatchEvent(
            new CustomEvent("atlas:credits", { detail: { creditsRemaining: data.creditsRemaining } }),
          );
        }
        // Auto-name: derive a deterministic short/long pair from the prompt
        // so the player + library show stable, library-friendly labels.
        const auto = buildAutoName({ prompt: text, category: "sfx" });
        const filename = autoFilename(
          { prompt: text, category: "sfx" },
          outputFormat.includes("wav") ? "wav" : "mp3"
        );

        // §global-player: emit so the persistent player can autoplay + add to playlist.
        window.dispatchEvent(new CustomEvent("atlas:generation", {
          detail: {
            id: data.generationId,
            url: data.audioUrl,
            title: auto.displayName,
            longName: auto.longName,
            filename,
            prompt: text,
            category: selectedCategory || "Generic",
            duration,
            createdAt: Date.now(),
          },
        }));

        // Save to prompt history
        const entry: PromptHistoryEntry = {
          id: data.generationId,
          text,
          category: selectedCategory,
          duration,
          promptInfluence,
          exclusions,
          loop,
          timestamp: Date.now(),
        };
        setHistory(saveToHistory(entry));
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Network error";
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  }, [text, duration, loop, promptInfluence, outputFormat, exclusions, selectedCategory, toast]);

  // ── Load from history ──
  const handleHistorySelect = useCallback((entry: PromptHistoryEntry) => {
    setText(entry.text);
    setSelectedCategory(entry.category);
    setDuration(entry.duration);
    setPromptInfluence(entry.promptInfluence);
    setLoop(entry.loop);
    setExclusions(entry.exclusions);
    setResult(null);
    setError(null);
    setVerdictSent(false);
    toast.success("Prompt loaded from history");
  }, [toast]);

  const clearHistory = useCallback(() => {
    try { localStorage.removeItem("atlas-prompt-history"); } catch {}
    setHistory([]);
    toast.success("History cleared");
  }, [toast]);

  // Mirror this page's prompt/category into the global floating composer
  // and route its Generate button back into our handleGenerate. The
  // composer also reflects the loading state so its spinner stays in sync.
  useRegisterComposer({
    prompt: text,
    setPrompt: setText,
    category: selectedCategory || null,
    onGenerate: handleGenerate,
    generating: loading,
  });

  // ── Evaluation ──
  const handleVerdict = async (verdict: string) => {
    if (!result) return;
    setEvaluating(true);
    try {
      const qualities = selectedTags.filter((t) => POSITIVE_TAGS.includes(t as typeof POSITIVE_TAGS[number]));
      const problems = selectedTags.filter((t) => NEGATIVE_TAGS.includes(t as typeof NEGATIVE_TAGS[number]));

      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedSoundId: result.generationId,
          is_favorite: verdict === "favorite",
          is_usable: verdict === "usable",
          is_needs_retry: verdict === "needs_retry",
          is_rejected: verdict === "rejected",
          qualities,
          problems,
        }),
      });
      const data = await res.json();
      if (data.futureGuidance?.length) {
        setEvalGuidance(data.futureGuidance);
      }

      // Auto-learn from negative tags: add exclusion constraints
      const negTags = problems as EvaluationTag[];
      if (negTags.length > 0) {
        const newConstraints = aggregateGuidance(negTags);
        if (newConstraints.length > 0) {
          const merged = [...new Set([...exclusions, ...newConstraints])];
          updateExclusions(merged);
          toast.success(`Learned ${newConstraints.length} new exclusion${newConstraints.length > 1 ? "s" : ""} from evaluation`);
        }
      }

      // Update history with verdict
      setHistory((prev) =>
        prev.map((e) => (e.id === result.generationId ? { ...e, verdict } : e))
      );

      setVerdictSent(true);
      toast.success(`Verdict saved: ${verdict}`);
    } finally {
      setEvaluating(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="p-4 pt-2 max-w-7xl mx-auto animate-fade-in">

      {/* Prompt History */}
      <div className="mb-5 mt-4">
        <PromptHistory
          entries={history}
          onSelect={handleHistorySelect}
          onClear={clearHistory}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Main controls ═══ */}
        <div className="lg:col-span-2 space-y-5">
          {/* Category browser */}
          <CategoryBrowser
            selected={selectedCategory}
            onSelect={handleCategoryChange}
            onSubcategoryClick={handleSubcategoryClick}
          />


          {/* Vocabulary Trainer */}
          <VocabTrainer
            prompt={text}
            onApplySuggestion={(replacement) => setText(replacement)}
          />

          {/* Layer Compatibility Warnings */}
          <LayerWarningsPanel
            prompt={text}
            duration={duration}
            loop={loop}
            promptInfluence={promptInfluence}
            exclusions={exclusions}
            category={selectedCategory}
            onAddExclusion={(ex) => {
              const newExclusions = ex.split(",").map((e) => e.trim()).filter(Boolean);
              setExclusions((prev) => [...new Set([...prev, ...newExclusions])]);
            }}
            onSetDuration={setDuration}
            onToggleLoop={setLoop}
          />



          {/* Exclusion constraints */}
          <div className="atlas-card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="atlas-label flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Exclusion Constraints
              </label>
              <button
                onClick={resetExclusions}
                className="flex items-center gap-1.5 text-xs font-medium text-atlas-text-muted hover:text-atlas-text transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {exclusions.map((ex) => {
                const isBase = BASE_EXCLUSIONS.includes(ex);
                return (
                  <span
                    key={ex}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors",
                      isBase
                        ? "bg-atlas-surface-hover text-atlas-text-muted"
                        : "bg-atlas-accent-muted text-atlas-accent"
                    )}
                  >
                    {ex}
                    <button
                      onClick={() => removeExclusion(ex)}
                      className="hover:text-atlas-danger transition-colors"
                      aria-label={`Remove ${ex}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExclusion()}
                placeholder="Add constraint..."
                className="flex-1 rounded-lg border border-atlas-border bg-atlas-bg px-3.5 py-2 text-sm text-atlas-text placeholder-atlas-text-muted focus:border-atlas-accent focus:outline-none"
                data-no-transition
              />
              <button
                onClick={addExclusion}
                className="rounded-lg bg-atlas-surface-hover px-4 py-2 text-sm font-medium text-atlas-text hover:bg-atlas-surface-active transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Pre-generation cost estimate */}
          {text.trim() && (
            <div className="flex items-center justify-between rounded-lg bg-atlas-surface-hover/50 px-4 py-2.5">
              <span className="text-sm text-atlas-text-muted">Estimated cost</span>
              <span className="text-sm font-semibold text-atlas-accent tabular-nums">1 credit · ~{text.length} chars</span>
            </div>
          )}

          {/* Influence Sweep Panel */}
          <InfluenceSweepPanel
            promptText={text}
            duration={duration}
            loop={loop}
            modelId="eleven_text_to_sound_v2"
            outputFormat={outputFormat}
            exclusions={exclusions}
            creditsRemaining={250}
          />

          {/* Implementation Role Selector */}
          <ImplementationRoleSelector
            prompt={text}
            exclusions={exclusions}
            onApply={(adapted) => {
              setText(adapted.adaptedPrompt);
              if (adapted.addedExclusions.length > 0) {
                setExclusions((prev) => [...new Set([...prev, ...adapted.addedExclusions])]);
              }
              if (adapted.suggestedSettings.maxDuration != null) {
                setDuration(adapted.suggestedSettings.maxDuration);
              }
              if (adapted.suggestedSettings.minDuration != null) {
                setDuration(adapted.suggestedSettings.minDuration);
              }
              if (adapted.suggestedSettings.loop != null) {
                setLoop(adapted.suggestedSettings.loop);
              }
              if (adapted.suggestedSettings.promptInfluence != null) {
                setPromptInfluence(adapted.suggestedSettings.promptInfluence);
              }
            }}
          />


          {/* Error */}
          {error && (
            <div className="rounded-xl border border-atlas-danger/30 bg-atlas-danger/5 px-4 py-3 text-sm text-atlas-danger animate-slide-up">
              {error}
            </div>
          )}

          {/* ═══ Result ═══ */}
          {result && (
            <div className="atlas-card p-6 space-y-5 animate-scale-in border-atlas-accent/30 shadow-md shadow-atlas-accent/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-5 w-5 text-atlas-accent" />
                  <span className="text-base font-semibold text-atlas-text">Generated Sound</span>
                </div>
                {result.isMock && (
                  <span className="rounded-full bg-atlas-mock/10 px-2.5 py-1 text-xs font-semibold text-atlas-mock tracking-wide">MOCK</span>
                )}
              </div>

              {/* Final prompt — the product output */}
              {result.finalPromptText && (
                <div className="rounded-lg border border-atlas-border-subtle bg-atlas-bg/50 px-4 py-3">
                  <div className="atlas-eyebrow mb-1.5">Final prompt</div>
                  <p className="atlas-prompt">{result.finalPromptText}</p>
                </div>
              )}

              <audio controls src={result.audioUrl} className="w-full h-12" />
              <div className="grid grid-cols-3 gap-3">
                <div className="atlas-card px-3 py-2.5 text-center">
                  <div className="atlas-eyebrow">Cost</div>
                  <div className="text-base font-semibold text-atlas-text tabular-nums mt-1">{result.characterCost} chars</div>
                </div>
                <div className="atlas-card px-3 py-2.5 text-center">
                  <div className="atlas-eyebrow">Provider quota</div>
                  <div className="text-base font-semibold text-atlas-text tabular-nums mt-1">{result.creditsRemaining}</div>
                </div>
                <div className="atlas-card px-3 py-2.5 text-center">
                  <div className="atlas-eyebrow">ID</div>
                  <div className="font-mono text-sm text-atlas-text-muted mt-1">{result.generationId.slice(0, 8)}</div>
                </div>
              </div>

              {/* ── Evaluation section ── */}
              {!verdictSent && (
                <div className="pt-4 border-t border-atlas-border-subtle space-y-4">
                  {/* Quality tags (positive) */}
                  <div>
                    <span className="atlas-eyebrow mb-2 flex items-center gap-1.5" style={{ color: "var(--color-atlas-success)" }}>
                      <Check className="h-3.5 w-3.5" /> Qualities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(POSITIVE_TAGS as readonly string[]).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "rounded-full px-3 py-1 text-sm font-medium transition-all duration-150",
                            selectedTags.includes(tag)
                              ? "bg-atlas-surface-hover text-atlas-text ring-1 ring-green-400 shadow-sm"
                              : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Issue tags (negative) */}
                  <div>
                    <span className="atlas-eyebrow mb-2 flex items-center gap-1.5" style={{ color: "var(--color-atlas-danger)" }}>
                      <X className="h-3.5 w-3.5" /> Issues
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(NEGATIVE_TAGS as readonly string[]).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "rounded-full px-3 py-1 text-sm font-medium transition-all duration-150",
                            selectedTags.includes(tag)
                              ? "bg-atlas-surface-hover text-atlas-text ring-1 ring-red-400 shadow-sm"
                              : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Verdict buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-atlas-border-subtle">
                {verdictSent ? (
                  <div className="flex items-center gap-2 text-sm text-atlas-success animate-fade-in">
                    <Check className="h-4 w-4" /> Verdict saved
                    {evalGuidance.length > 0 && (
                      <span className="text-atlas-text-muted">
                        • {evalGuidance.length} constraint{evalGuidance.length > 1 ? "s" : ""} learned
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleVerdict("favorite")}
                      disabled={evaluating}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold atlas-card hover:border-atlas-accent hover:text-atlas-accent transition-all"
                    >
                      <Star className="h-4 w-4" /> Favorite
                    </button>
                    <button
                      onClick={() => handleVerdict("usable")}
                      disabled={evaluating}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold atlas-card hover:border-green-400 hover:text-atlas-success transition-all"
                    >
                      <Check className="h-4 w-4" /> Usable
                    </button>
                    <button
                      onClick={() => handleVerdict("needs_retry")}
                      disabled={evaluating}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold atlas-card hover:border-yellow-400 hover:text-atlas-warning transition-all"
                    >
                      <RotateCcw className="h-4 w-4" /> Retry
                    </button>
                    <button
                      onClick={() => handleVerdict("rejected")}
                      disabled={evaluating}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold atlas-card hover:border-red-400 hover:text-atlas-danger transition-all"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Side panel ═══ */}
        <div className="lg:col-span-1 sticky top-4 self-start space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
          {/* Prompt */}
          <div className="atlas-card p-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe the sound you want to generate... (⌘+Enter to generate)"
              rows={5}
              className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
              data-no-transition
              aria-label="Sound prompt"
            />
            <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
              <span className="tabular-nums">{text.length} chars</span>
              <div className="flex items-center gap-2">
                <span className={text.length > 450 ? "text-atlas-danger font-medium" : ""}>
                  {text.length > 450 ? "Over limit" : ""}
                </span>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
                  title="Output settings"
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className={cn(
              "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
              loading || !text.trim()
                ? "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                : "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-lg hover:shadow-atlas-accent/20 active:scale-[0.99]"
            )}
          >
            {loading ? (
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
                <Sparkles className="h-4 w-4" /> Generate
              </span>
            )}
          </button>

          {/* Controls card — Duration + Prompt Influence + Loop */}
          <div className="atlas-card p-3 space-y-3">
            <AtlasSlider
              value={duration}
              onChange={setDuration}
              min={0.5}
              max={30}
              step={0.5}
              label="Duration"
              displayValue={`${duration}s`}
              lowLabel="0.5s"
              highLabel="30s"
              ticks={[1, 5, 10, 15, 20, 25, 30]}
            />
            <AtlasSlider
              value={promptInfluence}
              onChange={setPromptInfluence}
              min={0}
              max={1}
              step={0.05}
              label="Prompt Influence"
              displayValue={promptInfluence.toFixed(2)}
              lowLabel="Creative"
              highLabel="Precise"
            />
            <label className="flex items-center gap-3 cursor-pointer w-fit group">
              <div
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors duration-200",
                  loop ? "bg-atlas-accent" : "bg-atlas-surface-hover border border-atlas-border"
                )}
                onClick={() => setLoop(!loop)}
              >
                <div
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-200",
                    loop ? "translate-x-5 bg-white" : "translate-x-0.5 bg-atlas-text-dim"
                  )}
                />
              </div>
              <span className="text-sm text-atlas-text-muted group-hover:text-atlas-text transition-colors">
                Seamless loop
              </span>
            </label>
          </div>
        </div>

        {/* ═══ Settings Modal (portal) ═══ */}
        {settingsOpen && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setSettingsOpen(false)}
          >
            <div
              className="atlas-card w-full max-w-md p-6 space-y-5 shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-atlas-text">Settings</h3>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-lg p-1.5 text-atlas-text-muted hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
                  aria-label="Close settings"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Model badge */}
              <div>
                <label className="atlas-label mb-2 block">Model</label>
                <div className="flex items-center gap-2 rounded-lg border border-atlas-border bg-atlas-bg px-3.5 py-2.5">
                  <AudioWaveform className="h-4 w-4 text-atlas-accent" />
                  <span className="text-sm font-medium text-atlas-text">Sound Effects v2</span>
                  <span className="ml-auto rounded-full bg-atlas-success/10 px-2 py-0.5 text-xs font-semibold text-atlas-success">Active</span>
                </div>
              </div>

              {/* Output Format */}
              <FormatSelector value={outputFormat} onChange={setOutputFormat} />
            </div>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}
