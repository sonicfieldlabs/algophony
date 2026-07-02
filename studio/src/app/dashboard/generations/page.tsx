"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Download, FileAudio, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";

interface Generation {
  id: string;
  prompt_card_id: string | null;
  status: string;
  request_payload: { text?: string; category?: string };
  audio_signed_url: string | null;
  duration_seconds: number | null;
  character_cost: number | null;
  output_format: string | null;
  error_message: string | null;
  created_at: string;
}

function AudioPlayer({ url }: { url: string | null }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!url || !audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <>
      {url && <audio ref={audioRef} src={url} preload="none" />}
      <button
        onClick={toggle}
        disabled={!url}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          url
            ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover"
            : "bg-atlas-bg text-atlas-text-dim cursor-not-allowed"
        }`}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}

const PAGE_SIZE = 25;

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

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

  // Load initial data
  useAbortableFetch(async (signal) => {
    try {
      const data = await fetchPage(undefined, signal);
      if (signal.aborted) return;
      setGenerations(data.generations ?? []);
      setNextCursor(data.nextCursor ?? null);
      setLoading(false);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[generations] initial fetch failed:", err);
      if (!signal.aborted) setLoading(false);
    }
  }, [fetchPage]);

  const succeededCount = generations.filter((g) => g.status === "succeeded").length;

  return (
    <div className="p-6 animate-fade-in">
      {/* Counter + refresh — page title now lives in the topbar. */}
      <div className="mb-4 flex items-center justify-end gap-3">
        <div className="flex items-center gap-2 text-sm text-atlas-text-dim">
          <FileAudio className="h-4 w-4" />
          {succeededCount} generated
        </div>
        <button
          onClick={refresh}
          className="rounded-lg p-2 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && generations.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-atlas-border p-16">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-atlas-text-dim" />
            <p className="text-sm text-atlas-text-muted">Loading generations...</p>
          </div>
        </div>
      ) : generations.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-atlas-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-atlas-border bg-atlas-surface">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">Play</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">Prompt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-atlas-text-dim"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atlas-border-subtle">
                {generations.map((gen) => (
                  <tr key={gen.id} className="bg-atlas-bg transition-colors hover:bg-atlas-surface-hover">
                    <td className="px-4 py-3">
                      <AudioPlayer url={gen.audio_signed_url} />
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-mono text-xs text-atlas-text">
                        {gen.request_payload?.text ?? "—"}
                      </p>
                      {gen.request_payload?.category && (
                        <span className="mt-1 inline-block rounded-md bg-atlas-surface px-1.5 py-0.5 text-xs text-atlas-text-dim">
                          {gen.request_payload.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          gen.status === "succeeded"
                            ? "status-badge-succeeded"
                            : gen.status === "failed"
                            ? "status-badge-failed"
                            : "status-badge-pending"
                        }`}
                      >
                        {gen.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-atlas-text-dim">
                      {gen.duration_seconds ? `${gen.duration_seconds}s` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-atlas-text-dim">
                      {gen.character_cost ?? "—"} chars
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-atlas-text-dim">
                        <Clock className="h-3 w-3" />
                        {new Date(gen.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {gen.status === "succeeded" && gen.audio_signed_url && (
                        <a
                          href={gen.audio_signed_url}
                          download={`sfx-${gen.id.slice(0, 8)}.${gen.output_format || "mp3"}`}
                          className="rounded-lg p-1.5 text-atlas-text-dim transition-colors hover:bg-atlas-surface hover:text-atlas-text"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more button */}
          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-lg border border-atlas-border px-4 py-2 text-sm text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-text disabled:opacity-50"
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
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-atlas-border p-16">
          <div className="text-center">
            <FileAudio className="mx-auto mb-3 h-8 w-8 text-atlas-text-dim" />
            <p className="text-sm text-atlas-text-muted">No generations yet</p>
            <p className="text-xs text-atlas-text-dim">Generate your first SFX from a prompt card</p>
          </div>
        </div>
      )}
    </div>
  );
}
