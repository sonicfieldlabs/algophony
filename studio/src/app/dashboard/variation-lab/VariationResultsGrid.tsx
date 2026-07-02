"use client";

import { useState, useRef } from "react";
import { Grid2x2, List, Play, Pause, Star, ThumbsDown, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariationJob } from "@/lib/sfx/variation-taxonomy";

interface VariationResultsGridProps {
  jobs: VariationJob[];
  onFavorite: (jobId: string) => void;
  onReject: (jobId: string) => void;
}

export function VariationResultsGrid({ jobs, onFavorite, onReject }: VariationResultsGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "favorites" | "rejected">("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generatedJobs = jobs.filter((j) => j.status === "generated");
  const filteredJobs = generatedJobs.filter((j) => {
    if (filter === "favorites") return j.isFavorite;
    if (filter === "rejected") return j.isRejected;
    return true;
  });

  if (generatedJobs.length === 0) return null;

  const playSound = (job: VariationJob) => {
    if (!job.audioUrl) return;
    if (playingId === job.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(job.audioUrl);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    void audio.play();
    setPlayingId(job.id);
  };

  const favCount = generatedJobs.filter((j) => j.isFavorite).length;
  const rejCount = generatedJobs.filter((j) => j.isRejected).length;

  return (
    <div className="atlas-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Heart className="h-3 w-3" />
          Results · {generatedJobs.length}
        </span>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex gap-0.5">
            {(["all", "favorites", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[8px] font-medium transition-all capitalize",
                  filter === f ? "bg-atlas-accent-muted text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-text-muted"
                )}
              >
                {f}{f === "favorites" && favCount > 0 ? ` (${favCount})` : ""}{f === "rejected" && rejCount > 0 ? ` (${rejCount})` : ""}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex gap-0.5 border border-atlas-border-subtle rounded-lg p-0.5">
            <button onClick={() => setViewMode("grid")} className={cn("p-0.5 rounded", viewMode === "grid" && "bg-atlas-surface-hover")}>
              <Grid2x2 className="h-3 w-3 text-atlas-text-dim" />
            </button>
            <button onClick={() => setViewMode("list")} className={cn("p-0.5 rounded", viewMode === "list" && "bg-atlas-surface-hover")}>
              <List className="h-3 w-3 text-atlas-text-dim" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className={cn(
                "rounded-xl border p-2.5 space-y-1.5 transition-all",
                job.isFavorite ? "border-atlas-accent/40 bg-atlas-accent-muted/30" :
                job.isRejected ? "border-atlas-danger/30 bg-atlas-danger/5 opacity-60" :
                "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
              )}
            >
              {/* Play button */}
              <button
                onClick={() => playSound(job)}
                disabled={!job.audioUrl}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-atlas-surface-hover hover:bg-atlas-accent-muted transition-colors"
              >
                {playingId === job.id ? (
                  <Pause className="h-4 w-4 text-atlas-accent" />
                ) : (
                  <Play className="h-4 w-4 text-atlas-text-dim ml-0.5" />
                )}
              </button>

              {/* Index + prompt preview */}
              <div className="space-y-0.5">
                <span className="text-[8px] text-atlas-text-dim tabular-nums">#{job.jobIndex + 1}</span>
                <p className="text-[8px] text-atlas-text-muted line-clamp-2 font-mono leading-relaxed">
                  {job.generatedPrompt.slice(0, 60)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => onFavorite(job.id)}
                  className={cn(
                    "flex-1 rounded-md py-0.5 text-center transition-colors",
                    job.isFavorite ? "bg-atlas-accent text-white" : "bg-atlas-surface-hover text-atlas-text-dim hover:text-atlas-accent"
                  )}
                >
                  <Star className="h-2.5 w-2.5 mx-auto" />
                </button>
                <button
                  onClick={() => onReject(job.id)}
                  className={cn(
                    "flex-1 rounded-md py-0.5 text-center transition-colors",
                    job.isRejected ? "bg-atlas-danger text-white" : "bg-atlas-surface-hover text-atlas-text-dim hover:text-atlas-danger"
                  )}
                >
                  <ThumbsDown className="h-2.5 w-2.5 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors",
                job.isFavorite ? "bg-atlas-accent-muted/20" :
                job.isRejected ? "bg-atlas-danger/5 opacity-60" :
                "hover:bg-atlas-surface"
              )}
            >
              <span className="text-[8px] text-atlas-text-dim tabular-nums w-5 text-right">#{job.jobIndex + 1}</span>
              <button onClick={() => playSound(job)} disabled={!job.audioUrl} className="shrink-0">
                {playingId === job.id ? (
                  <Pause className="h-3 w-3 text-atlas-accent" />
                ) : (
                  <Play className="h-3 w-3 text-atlas-text-dim" />
                )}
              </button>
              <span className="text-xs text-atlas-text-muted flex-1 truncate font-mono">{job.generatedPrompt.slice(0, 100)}</span>
              <button onClick={() => onFavorite(job.id)} className={cn("shrink-0", job.isFavorite ? "text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-accent")}>
                <Star className="h-3 w-3" />
              </button>
              <button onClick={() => onReject(job.id)} className={cn("shrink-0", job.isRejected ? "text-atlas-danger" : "text-atlas-text-dim hover:text-atlas-danger")}>
                <ThumbsDown className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
