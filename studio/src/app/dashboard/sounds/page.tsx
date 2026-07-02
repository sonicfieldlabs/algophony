"use client";

import { useState, useCallback, useEffect } from "react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import {
  Play, Download, FileAudio, Clock, RefreshCw,
  ChevronDown, Fingerprint, Star, ThumbsUp, ThumbsDown, RotateCcw,
  Filter, Search, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ProvenancePanel, type ProvenanceGeneration } from "./ProvenancePanel";
import { PromptAutopsy } from "./PromptAutopsy";
import { VersionTreePanel } from "./VersionTreePanel";
import { SendToToolMenu } from "./SendToToolMenu";
import { buildAutoName, type AutoNameCategory } from "@/lib/sfx/auto-name";

// ── Full generation row (matches DB schema) ──────────────────

interface Generation {
  id: string;
  prompt_card_id: string | null;
  project_id: string | null;
  status: string;
  request_payload: Record<string, unknown>;
  elevenlabs_model_id: string | null;
  audio_storage_path: string | null;
  audio_signed_url: string | null;
  duration_seconds: number | null;
  output_format: string | null;
  character_cost: number | null;
  app_credit_cost: number;
  error_message: string | null;
  api_route: string;
  request_id: string | null;
  user_verdict: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── Audio Player ─────────────────────────────────────────────

function AudioPlayer({ gen }: { gen: Generation }) {
  const url = gen.audio_signed_url;
  const handle = () => {
    if (!url) return;
    const prompt = String(gen.request_payload?.text ?? "");
    window.dispatchEvent(new CustomEvent("atlas:audio:play", {
      detail: {
        id: gen.id,
        url,
        title: prompt.length > 60 ? prompt.slice(0, 57) + "..." : (prompt || gen.id.slice(0, 8)),
        prompt,
        category: String(gen.request_payload?.category ?? gen.api_route ?? "Sound"),
        duration: gen.duration_seconds ?? null,
        createdAt: new Date(gen.created_at).getTime(),
        apiRoute: gen.api_route,
      },
    }));
  };
  return (
    <button
      onClick={handle}
      disabled={!url}
      title={url ? "Play in global player" : "No audio available"}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
        url
          ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover hover:shadow-md hover:shadow-atlas-accent/20 active:scale-95"
          : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
      )}
    >
      <Play className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const VERDICT_ICONS: Record<string, typeof Star> = {
  favorite: Star,
  usable: ThumbsUp,
  needs_retry: RotateCcw,
  rejected: ThumbsDown,
};

const VERDICT_COLORS: Record<string, string> = {
  favorite: "text-green-400",
  usable: "text-blue-400",
  needs_retry: "text-orange-400",
  rejected: "text-red-400",
};

type VerdictFilter = "all" | "favorite" | "usable" | "needs_retry" | "rejected" | "unrated";
type StatusFilter = "all" | "succeeded" | "failed" | "pending";

const PAGE_SIZE = 25;

// ── Page ─────────────────────────────────────────────────────

export default function SoundsPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Provenance panel
  const [provenanceGen, setProvenanceGen] = useState<Generation | null>(null);
  // Autopsy panel
  const [autopsyGen, setAutopsyGen] = useState<Generation | null>(null);
  const router = useRouter();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");

  const fetchPage = useCallback(async (cursor?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/generations?${params}`, { signal });
    if (!res.ok) return { generations: [], nextCursor: null };
    return res.json();
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextCursor);
      setGenerations((prev) => [...prev, ...(data.generations ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, fetchPage]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPage();
      setGenerations(data.generations ?? []);
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useAbortableFetch(async (signal) => {
    try {
      const data = await fetchPage(undefined, signal);
      if (signal.aborted) return;
      setGenerations(data.generations ?? []);
      setNextCursor(data.nextCursor ?? null);
      setLoading(false);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[sounds] initial fetch failed:", err);
      if (!signal.aborted) setLoading(false);
    }
  }, [fetchPage]);

  // Client-side filtering
  const filtered = generations.filter((gen) => {
    if (statusFilter !== "all" && gen.status !== statusFilter) return false;
    if (verdictFilter === "unrated" && gen.user_verdict) return false;
    if (verdictFilter !== "all" && verdictFilter !== "unrated" && gen.user_verdict !== verdictFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = String(gen.request_payload?.text ?? "").toLowerCase();
      const cat = String(gen.request_payload?.category ?? "").toLowerCase();
      if (!text.includes(q) && !cat.includes(q) && !gen.id.includes(q)) return false;
    }
    return true;
  });

  // Aggregates
  const succeededCount = generations.filter((g) => g.status === "succeeded").length;
  const failedCount = generations.filter((g) => g.status === "failed").length;
  const totalCredits = generations.reduce((sum, g) => sum + g.app_credit_cost, 0);
  const totalChars = generations.reduce((sum, g) => sum + (g.character_cost ?? 0), 0);
  const favoriteCount = generations.filter((g) => g.user_verdict === "favorite").length;
  const rejectedCount = generations.filter((g) => g.user_verdict === "rejected").length;

  // Dispatch stats for the Library tab bar to pick up
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("algophony-studio:sounds:stats", {
      detail: { succeededCount, failedCount, totalCredits, totalChars, favoriteCount, rejectedCount, loading },
    }));
  }, [succeededCount, failedCount, totalCredits, totalChars, favoriteCount, rejectedCount, loading]);

  return (
    <div className="animate-fade-in">
      {/* ── Toolbar: refresh · filters ── */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-atlas-border-subtle">
        {/* Refresh */}
        <button
          onClick={refresh}
          className="atlas-tap rounded-lg p-2 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors mr-auto"
          title="Refresh"
        >
          <RefreshCw className={cn("h-[18px] w-[18px]", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filters row */}
      <div className="px-6 py-2.5 flex flex-wrap items-center gap-3 border-b border-atlas-border-subtle">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-atlas-text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full rounded-lg border border-atlas-border bg-atlas-surface pl-9 pr-3 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-muted focus:border-atlas-accent focus:outline-none focus:ring-2 focus:ring-atlas-accent/10"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-0.5 rounded-lg bg-atlas-surface-hover/50 p-0.5">
          {(["all", "succeeded", "failed", "pending"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all capitalize",
                statusFilter === s ? "bg-atlas-surface text-atlas-accent shadow-xs" : "text-atlas-text-muted hover:text-atlas-text"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Verdict filter */}
        <div className="flex gap-0.5 rounded-lg bg-atlas-surface-hover/50 p-0.5">
          {(["all", "favorite", "usable", "needs_retry", "rejected", "unrated"] as VerdictFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setVerdictFilter(v)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all capitalize",
                verdictFilter === v ? "bg-atlas-surface text-atlas-accent shadow-xs" : "text-atlas-text-muted hover:text-atlas-text"
              )}
            >
              {v.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="px-6 pt-1">
        {loading && generations.length === 0 ? (
          <div className="flex items-center justify-center p-16">
            <div className="text-center">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (<span key={i} className="waveform-bar" />))}
              </div>
              <p className="text-base font-medium text-atlas-text">Loading generations…</p>
            </div>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-atlas-border-subtle">
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted w-10"></th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Name</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Prompt</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Settings</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Cost</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Time</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Verdict</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Status</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-atlas-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atlas-border-subtle">
                  {filtered.map((gen) => {
                    const VerdictIcon = gen.user_verdict ? VERDICT_ICONS[gen.user_verdict] : null;
                    const verdictColor = gen.user_verdict ? VERDICT_COLORS[gen.user_verdict] : "";
                    const payload = gen.request_payload ?? {};
                    const influence = payload.prompt_influence as number | undefined;

                    // Build a human-readable name from the prompt, falling back to route+category
                    const promptText = String(payload.text ?? "");
                    const autoName = promptText
                      ? buildAutoName({ prompt: promptText, category: (payload.category as AutoNameCategory) ?? "sfx" })
                      : null;
                    const fallbackName = autoName?.displayName
                      ?? (payload.category ? `${String(payload.category)}_${gen.id.slice(0, 4)}` : `${gen.api_route ?? "sfx"}_${gen.id.slice(0, 4)}`);
                    const fallbackLong = autoName?.longName
                      ?? `${gen.api_route ?? "sfx"}_${gen.id.slice(0, 8)}`;

                    return (
                      <tr key={gen.id} className="transition-colors hover:bg-atlas-surface-hover/50">
                        {/* Play */}
                        <td className="px-2 py-1.5">
                          <AudioPlayer gen={gen} />
                        </td>
                        {/* Name */}
                        <td className="px-2 py-1.5 max-w-[140px]">
                          <span
                            className="text-xs text-atlas-text truncate block"
                            title={fallbackLong}
                          >
                            {fallbackName}
                          </span>
                        </td>
                        {/* Prompt */}
                        <td className="max-w-sm px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <p
                              className="text-xs text-atlas-text-muted truncate flex-1"
                              title={(payload.text as string) ?? ""}
                            >
                              {payload.text ? String(payload.text).slice(0, 80) : "—"}
                            </p>
                            {typeof payload.category === "string" && (
                              <span className="rounded bg-atlas-accent-muted px-1.5 py-0 text-[10px] text-atlas-accent font-medium shrink-0">
                                {payload.category}
                              </span>
                            )}
                            {gen.api_route && gen.api_route !== "sound_effects" && (
                              <span className="rounded bg-atlas-surface-hover px-1.5 py-0 text-[10px] text-atlas-text-muted shrink-0">
                                {gen.api_route}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Settings */}
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap gap-1">
                            {gen.duration_seconds != null && (
                              <span className="rounded bg-atlas-surface-hover px-1.5 py-0.5 text-[10px] text-atlas-text-muted tabular-nums">{gen.duration_seconds}s</span>
                            )}
                            {influence != null && (
                              <span className="rounded bg-atlas-accent/8 px-1.5 py-0.5 text-[10px] text-atlas-accent tabular-nums">PI {influence}</span>
                            )}
                            {Boolean(payload.loop) && (
                              <span className="rounded bg-blue-400/12 px-1.5 py-0.5 text-[10px] text-blue-400 font-medium">loop</span>
                            )}
                          </div>
                        </td>
                        {/* Cost */}
                        <td className="px-2 py-1.5">
                          <div className="text-xs text-atlas-text-muted tabular-nums leading-tight">
                            <span>{gen.character_cost ?? "—"} ch</span>
                            <span className="text-atlas-accent ml-1.5">{gen.app_credit_cost} cr</span>
                          </div>
                        </td>
                        {/* Time */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1 text-xs text-atlas-text-muted">
                            <Clock className="h-3 w-3" />
                            {timeAgo(gen.created_at)}
                          </div>
                        </td>
                        {/* Verdict — after time */}
                        <td className="px-2 py-1.5">
                          {VerdictIcon ? (
                            <span className={cn("flex items-center gap-1 text-xs font-medium capitalize", verdictColor)}>
                              <VerdictIcon className="h-3 w-3" />
                              {gen.user_verdict?.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-atlas-text-dim">—</span>
                          )}
                        </td>
                        {/* Status — after verdict */}
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className={cn(
                              "status-dot",
                              gen.status === "succeeded" ? "status-dot-active" :
                              gen.status === "failed" ? "status-dot-error" : "status-dot-warning"
                            )} />
                            <span className={cn(
                              "text-xs font-medium capitalize",
                              gen.status === "succeeded" ? "text-atlas-success" :
                              gen.status === "failed" ? "text-atlas-danger" : "text-atlas-warning"
                            )}>
                              {gen.status}
                            </span>
                          </span>
                        </td>
                        {/* Actions — always visible */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-0.5">
                            {gen.status === "succeeded" && gen.audio_signed_url && (
                              <a
                                href={gen.audio_signed_url}
                                download={
                                  payload.text
                                    ? `${buildAutoName({ prompt: String(payload.text), category: "sfx" }).longName}.${gen.output_format || "mp3"}`
                                    : `sfx-${gen.id.slice(0, 8)}.${gen.output_format || "mp3"}`
                                }
                                className="atlas-tap rounded-lg p-1.5 text-atlas-text-muted transition-colors hover:bg-atlas-surface-hover hover:text-atlas-text"
                                title="Download audio"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setProvenanceGen(gen)}
                              className="atlas-tap rounded-lg p-1.5 text-atlas-text-muted transition-colors hover:bg-atlas-accent/10 hover:text-atlas-accent"
                              title="View Provenance"
                            >
                              <Fingerprint className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setAutopsyGen(gen)}
                              className="atlas-tap rounded-lg p-1.5 text-atlas-text-muted transition-colors hover:bg-red-400/10 hover:text-red-400"
                              title="Prompt Autopsy"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </button>
                            <SendToToolMenu generation={gen as unknown as Record<string, unknown>} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Version Control */}
            <div className="mt-4">
              <VersionTreePanel generations={generations as unknown as Array<{ id: string; request_payload: Record<string, unknown>; user_verdict: string | null; failure_reason: string | null; metadata: Record<string, unknown>; created_at: string; duration_seconds: number | null }>} />
            </div>

            {/* Load more */}
            {nextCursor && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-atlas-border px-4 py-2 text-sm text-atlas-text-muted transition-all hover:border-atlas-accent hover:text-atlas-text hover:shadow-sm disabled:opacity-50"
                >
                  {loadingMore ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  Load More
                </button>
              </div>
            )}
          </>
        ) : generations.length > 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Filter className="mx-auto mb-4 h-10 w-10 text-atlas-text-muted" />
              <p className="atlas-title">No matching generations</p>
              <p className="text-sm text-atlas-text-muted mt-1.5">Try adjusting filters or clearing your search</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-16">
            <div className="text-center">
              <FileAudio className="mx-auto mb-4 h-10 w-10 text-atlas-text-muted" />
              <p className="atlas-title">No sounds yet</p>
              <p className="text-sm text-atlas-text-muted mt-1.5">Generate your first SFX from a prompt card</p>
            </div>
          </div>
        )}
      </div>

      {/* Provenance Slide-in Panel */}
      {provenanceGen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setProvenanceGen(null)}
          />
          <ProvenancePanel
            generation={provenanceGen as ProvenanceGeneration}
            onClose={() => setProvenanceGen(null)}
          />
        </>
      )}

      {/* Prompt Autopsy Panel */}
      {autopsyGen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setAutopsyGen(null)}
          />
          <PromptAutopsy
            generation={autopsyGen as ProvenanceGeneration}
            onClose={() => setAutopsyGen(null)}
            onRetry={(retryPrompt, exclusions, settings) => {
              // Store retry data for the Generate page to pick up
              if (typeof window !== "undefined") {
                localStorage.setItem("algophony-studio-autopsy-retry", JSON.stringify({
                  retryPrompt,
                  exclusions,
                  ...settings,
                  sourceGenerationId: autopsyGen.id,
                }));
              }
              router.push("/dashboard/generate");
            }}
            onSubmitEvaluation={async (data) => {
              await fetch("/api/evaluations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  generatedSoundId: data.generationId,
                  promptCardId: autopsyGen.prompt_card_id,
                  is_rejected: true,
                  rejection_reason: data.rejectionReason,
                  problems: data.problems,
                  notes: data.notes,
                }),
              });
              // Update local state
              setGenerations((prev) =>
                prev.map((g) =>
                  g.id === data.generationId
                    ? { ...g, user_verdict: "rejected", failure_reason: data.rejectionReason }
                    : g
                )
              );
            }}
          />
        </>
      )}
    </div>
  );
}
