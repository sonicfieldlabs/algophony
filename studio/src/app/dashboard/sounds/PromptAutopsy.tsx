"use client";

import { useState, useMemo } from "react";
import {
  X, AlertTriangle, ArrowRight, Copy, Check, RotateCcw,
  Zap, ChevronRight, ChevronDown, Sparkles, ClipboardPaste,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvaluationTag } from "@/lib/sfx/evaluations";
import { requiresUserInput } from "@/lib/sfx/evaluations";
import {
  FAILURE_GROUPS,
  CORRECTION_PROMPTS,
  generateRetryPrompt,
} from "@/lib/sfx/prompt-autopsy";
import type { ProvenanceGeneration } from "./ProvenancePanel";

interface PromptAutopsyProps {
  generation: ProvenanceGeneration;
  onClose: () => void;
  onRetry: (retryPrompt: string, exclusions: string[], settings: {
    duration?: number;
    loop?: boolean;
    promptInfluence?: number;
  }) => void;
  onSubmitEvaluation: (data: {
    generationId: string;
    problems: string[];
    rejectionReason: string;
    notes?: string;
  }) => Promise<void>;
}

type AutopsyStep = "diagnose" | "correct" | "review";

export function PromptAutopsy({ generation, onClose, onRetry, onSubmitEvaluation }: PromptAutopsyProps) {
  const [step, setStep] = useState<AutopsyStep>("diagnose");
  const [selectedReasons, setSelectedReasons] = useState<Set<EvaluationTag>>(new Set());
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(FAILURE_GROUPS.map((g) => g.label))
  );

  const originalPrompt = String(generation.request_payload?.text ?? "");
  const existingExclusions = useMemo(
    () =>
      Array.isArray(generation.request_payload?.exclusion_constraints)
        ? (generation.request_payload.exclusion_constraints as string[])
        : [],
    [generation.request_payload],
  );

  // Reasons that need user input
  const needsCorrection = useMemo(
    () => [...selectedReasons].filter((r) => requiresUserInput(r)),
    [selectedReasons]
  );

  // Generate retry report
  const report = useMemo(() => {
    if (selectedReasons.size === 0) return null;
    return generateRetryPrompt(
      originalPrompt,
      [...selectedReasons],
      corrections,
      existingExclusions
    );
  }, [selectedReasons, corrections, originalPrompt, existingExclusions]);

  const toggleReason = (reason: EvaluationTag) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) {
        next.delete(reason);
        // Clean up correction
        const newCorrections = { ...corrections };
        delete newCorrections[reason];
        setCorrections(newCorrections);
      } else {
        next.add(reason);
      }
      return next;
    });
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const handleCopyRetryPrompt = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.retryPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleSubmitAndRetry = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      // Submit evaluation
      await onSubmitEvaluation({
        generationId: generation.id,
        problems: [...selectedReasons],
        rejectionReason: [...selectedReasons].join(", "),
        notes: additionalNotes || undefined,
      });

      // Fire retry
      onRetry(
        report.retryPrompt,
        report.retryExclusions,
        {
          duration: report.suggestedDuration,
          loop: report.suggestedLoop,
          promptInfluence: report.suggestedInfluence,
        }
      );

      onClose();
    } catch (err) {
      console.error("Autopsy submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOnly = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      await onSubmitEvaluation({
        generationId: generation.id,
        problems: [...selectedReasons],
        rejectionReason: [...selectedReasons].join(", "),
        notes: additionalNotes || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Autopsy submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = selectedReasons.size > 0;
  const canReview = canProceed && needsCorrection.every((r) => corrections[r]?.trim());

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-atlas-bg border-l border-atlas-border shadow-2xl overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-atlas-bg/95 backdrop-blur-sm border-b border-atlas-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-atlas-text">Prompt Autopsy</h2>
              <p className="text-xs text-atlas-text-dim">Diagnose → Correct → Retry</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-3">
          {(["diagnose", "correct", "review"] as AutopsyStep[]).map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (s === "diagnose") setStep(s);
                else if (s === "correct" && canProceed) setStep(s);
                else if (s === "review" && canReview) setStep(s);
              }}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all",
                step === s ? "bg-atlas-accent text-white" :
                (s === "correct" && !canProceed) || (s === "review" && !canReview)
                  ? "bg-atlas-surface-hover text-atlas-text-dim/30 cursor-not-allowed"
                  : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
              )}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Original prompt preview */}
        <div className="rounded-lg bg-atlas-surface-hover/50 border border-atlas-border-subtle px-3 py-2">
          <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Original Prompt</span>
          <p className="text-xs text-atlas-text font-mono mt-1 leading-relaxed">{originalPrompt || "—"}</p>
        </div>

        {/* Audio preview */}
        {generation.audio_signed_url && (
          <audio controls src={generation.audio_signed_url} className="w-full h-8" preload="none" />
        )}

        {/* ── Step 1: Diagnose ──────────────────────────── */}
        {step === "diagnose" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-atlas-text flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              Why did this fail? <span className="text-atlas-text-dim font-normal">({selectedReasons.size} selected)</span>
            </h3>

            {FAILURE_GROUPS.map((group) => {
              const isExpanded = expandedGroups.has(group.label);
              const selectedInGroup = group.reasons.filter((r) => selectedReasons.has(r)).length;

              return (
                <div key={group.label} className="rounded-xl border border-atlas-border-subtle overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-atlas-surface-hover/30 transition-colors"
                  >
                    <span className="text-xs font-semibold text-atlas-text flex items-center gap-1.5">
                      {group.label}
                      {selectedInGroup > 0 && (
                        <span className="rounded-full bg-red-400/10 text-red-400 px-1.5 py-0.5 text-xs font-medium">
                          {selectedInGroup}
                        </span>
                      )}
                    </span>
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-atlas-text-dim" /> : <ChevronRight className="h-3 w-3 text-atlas-text-dim" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                      {group.reasons.map((reason) => {
                        const selected = selectedReasons.has(reason);
                        return (
                          <button
                            key={reason}
                            onClick={() => toggleReason(reason)}
                            className={cn(
                              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border",
                              selected
                                ? "bg-red-400/10 border-red-400/30 text-red-400"
                                : "bg-atlas-surface border-atlas-border-subtle text-atlas-text-muted hover:text-atlas-text hover:border-atlas-border"
                            )}
                          >
                            {reason}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Additional notes */}
            <div className="mt-3">
              <label className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Additional Notes (optional)</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any other details about what went wrong..."
                rows={2}
                className="w-full mt-1 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none"
              />
            </div>

            {/* Next button */}
            <button
              onClick={() => needsCorrection.length > 0 ? setStep("correct") : setStep("review")}
              disabled={!canProceed}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all",
                canProceed
                  ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover"
                  : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
              )}
            >
              {needsCorrection.length > 0 ? "Next: Specify Corrections" : "Next: Review Retry"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Correct ───────────────────────────── */}
        {step === "correct" && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-atlas-text flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-atlas-accent" />
              Specify Corrections
            </h3>
            <p className="text-xs text-atlas-text-dim">
              Some failure reasons need your input to generate a proper retry prompt.
            </p>

            {needsCorrection.map((tag) => {
              const prompt = CORRECTION_PROMPTS[tag];
              if (!prompt) return null;

              return (
                <div key={tag} className="rounded-xl border border-atlas-border-subtle p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-red-400/10 text-red-400 px-1.5 py-0.5 text-xs font-medium">{tag}</span>
                  </div>
                  <label className="text-xs text-atlas-text font-medium">{prompt.label}</label>

                  {prompt.options ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {prompt.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCorrections((prev) => ({ ...prev, [tag]: opt }))}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all",
                            corrections[tag] === opt
                              ? "bg-atlas-accent/10 border-atlas-accent/30 text-atlas-accent"
                              : "bg-atlas-surface border-atlas-border-subtle text-atlas-text-muted hover:text-atlas-text"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <input
                    value={corrections[tag] ?? ""}
                    onChange={(e) => setCorrections((prev) => ({ ...prev, [tag]: e.target.value }))}
                    placeholder={prompt.placeholder}
                    className="w-full mt-2 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
                  />
                </div>
              );
            })}

            <div className="flex gap-2">
              <button
                onClick={() => setStep("diagnose")}
                className="flex-1 rounded-xl border border-atlas-border py-2.5 text-sm font-medium text-atlas-text-muted hover:text-atlas-text transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("review")}
                disabled={!canReview}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all",
                  canReview ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover" : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
                )}
              >
                Review Retry <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ────────────────────────────── */}
        {step === "review" && report && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-atlas-text flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-atlas-accent" />
              Autopsy Report
            </h3>

            {/* Diagnosis summary */}
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3">
              <span className="text-xs text-red-400 font-medium uppercase tracking-wider">Rejected Because</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {[...selectedReasons].map((r) => (
                  <span key={r} className="rounded-md bg-red-400/10 border border-red-400/20 px-2 py-0.5 text-xs text-red-400 font-medium">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* User corrections */}
            {Object.keys(corrections).length > 0 && (
              <div className="rounded-xl border border-atlas-accent/20 bg-atlas-accent/5 p-3">
                <span className="text-xs text-atlas-accent font-medium uppercase tracking-wider">Corrections Applied</span>
                <div className="mt-1.5 space-y-1">
                  {Object.entries(corrections).map(([tag, value]) => (
                    <div key={tag} className="flex items-center gap-2 text-xs">
                      <span className="text-atlas-text-dim">{tag}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-atlas-text-dim" />
                      <span className="text-atlas-accent font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retry prompt */}
            <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Retry Prompt</span>
                <button
                  onClick={handleCopyRetryPrompt}
                  className="flex items-center gap-1 text-xs text-green-400 hover:underline"
                >
                  {copiedPrompt ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                  {copiedPrompt ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-atlas-text font-mono leading-relaxed">{report.retryPrompt}</p>
            </div>

            {/* New exclusions */}
            {report.retryExclusions.length > 0 && (
              <div className="rounded-xl border border-atlas-border-subtle p-3">
                <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Exclusion Constraints ({report.retryExclusions.length})</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {report.retryExclusions.map((ex) => {
                    const isNew = !existingExclusions.includes(ex);
                    return (
                      <span
                        key={ex}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs border",
                          isNew
                            ? "bg-green-400/5 border-green-400/20 text-green-400"
                            : "bg-atlas-surface-hover border-atlas-border-subtle text-atlas-text-dim"
                        )}
                      >
                        {ex} {isNew && <span className="text-xs">NEW</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Suggested settings */}
            {(report.suggestedDuration != null || report.suggestedLoop != null || report.suggestedInfluence != null) && (
              <div className="rounded-xl border border-atlas-border-subtle p-3">
                <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Suggested Settings</span>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {report.suggestedDuration != null && (
                    <div>
                      <span className="text-xs text-atlas-text-dim">Duration</span>
                      <div className="text-xs text-atlas-accent font-semibold">{report.suggestedDuration}s</div>
                    </div>
                  )}
                  {report.suggestedLoop != null && (
                    <div>
                      <span className="text-xs text-atlas-text-dim">Loop</span>
                      <div className="text-xs text-atlas-accent font-semibold">{report.suggestedLoop ? "Yes" : "No"}</div>
                    </div>
                  )}
                  {report.suggestedInfluence != null && (
                    <div>
                      <span className="text-xs text-atlas-text-dim">Prompt Influence</span>
                      <div className="text-xs text-atlas-accent font-semibold">{report.suggestedInfluence}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSubmitAndRetry}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-3.5 text-sm font-semibold text-white hover:bg-atlas-accent-hover transition-all hover:shadow-lg hover:shadow-atlas-accent/20 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {submitting ? "Submitting..." : "Reject & Generate Retry"}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitOnly}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-atlas-border py-2.5 text-xs font-medium text-atlas-text-muted hover:text-atlas-text transition-colors disabled:opacity-50"
                >
                  Reject Only (no retry)
                </button>
                <button
                  onClick={handleCopyRetryPrompt}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-atlas-border py-2.5 text-xs font-medium text-atlas-text-muted hover:text-atlas-text transition-colors"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  Copy Retry Prompt
                </button>
              </div>

              <button
                onClick={() => needsCorrection.length > 0 ? setStep("correct") : setStep("diagnose")}
                className="w-full text-xs text-atlas-text-dim hover:text-atlas-text text-center py-1 transition-colors"
              >
                ← Back to edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
