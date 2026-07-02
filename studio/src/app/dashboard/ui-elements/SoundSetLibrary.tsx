"use client";

import { useState, useRef, useMemo } from "react";
import { Play, Pause, Star, X, LayoutGrid, List, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UISoundItem, UIElementType, EngineMode } from "@/lib/sfx/ui-elements-taxonomy";
import {
  ELEMENT_TYPE_LABELS,
  ACTION_TYPE_LABELS,
} from "@/lib/sfx/ui-elements-taxonomy";

interface SoundSetLibraryProps {
  items: UISoundItem[];
  onFavorite: (id: string) => void;
  onReject: (id: string) => void;
}

type StatusFilter = "all" | "generated" | "favorite" | "rejected";

export function SoundSetLibrary({ items, onFavorite, onReject }: SoundSetLibraryProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterElement, setFilterElement] = useState<UIElementType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterEngine, setFilterEngine] = useState<EngineMode | "all">("all");

  // Extract unique values for filter options
  const uniqueElements = useMemo(() => {
    const set = new Set(items.map((i) => i.elementType));
    return [...set];
  }, [items]);

  const uniqueEngines = useMemo(() => {
    const set = new Set(items.map((i) => i.engineMode));
    return [...set];
  }, [items]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterElement !== "all" && item.elementType !== filterElement) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterEngine !== "all" && item.engineMode !== filterEngine) return false;
      return true;
    });
  }, [items, filterElement, filterStatus, filterEngine]);

  const hasActiveFilters = filterElement !== "all" || filterStatus !== "all" || filterEngine !== "all";

  const playSound = (item: UISoundItem) => {
    if (!item.audioUrl) return;
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = item.audioUrl;
      void audioRef.current.play();
      setPlayingId(item.id);
    }
  };

  if (items.length === 0) {
    return (
      <div className="atlas-card p-6 text-center">
        <p className="text-sm text-atlas-text-dim">
          No sounds in this set yet. Generate a UI sound and save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="atlas-card p-4">
      <audio
        ref={audioRef}
        onPause={() => setPlayingId(null)}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
          Sound Set · {filteredItems.length}{filteredItems.length !== items.length && ` / ${items.length}`} sounds
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "rounded p-1 transition-colors",
              showFilters || hasActiveFilters ? "text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-text-muted"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn("rounded p-1 transition-colors", view === "grid" ? "text-atlas-accent" : "text-atlas-text-dim")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("rounded p-1 transition-colors", view === "list" ? "text-atlas-accent" : "text-atlas-text-dim")}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-3 animate-expand-down">
          {/* Element type filter */}
          <div>
            <select
              value={filterElement}
              onChange={(e) => setFilterElement(e.target.value as UIElementType | "all")}
              className="rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text"
            >
              <option value="all">All Elements</option>
              {uniqueElements.map((el) => (
                <option key={el} value={el}>{ELEMENT_TYPE_LABELS[el]}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex gap-0.5">
            {(["all", "generated", "favorite", "rejected"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium transition-all capitalize",
                  filterStatus === s
                    ? "bg-atlas-accent-muted text-atlas-accent"
                    : "text-atlas-text-dim hover:text-atlas-text-muted"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Engine filter */}
          {uniqueEngines.length > 1 && (
            <div>
              <select
                value={filterEngine}
                onChange={(e) => setFilterEngine(e.target.value as EngineMode | "all")}
                className="rounded-lg border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text"
              >
                <option value="all">All Engines</option>
                {uniqueEngines.map((eng) => (
                  <option key={eng} value={eng}>{eng.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterElement("all");
                setFilterStatus("all");
                setFilterEngine("all");
              }}
              className="text-xs text-atlas-accent hover:text-atlas-accent-hover transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="py-4 text-center text-xs text-atlas-text-dim">
          No items match the current filters.
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && filteredItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2" data-stagger>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border p-3 transition-all group",
                item.status === "favorite"
                  ? "border-atlas-accent/30 bg-atlas-accent-muted/30"
                  : item.status === "rejected"
                  ? "border-red-300/20 opacity-50"
                  : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-atlas-text-muted capitalize">
                  {ELEMENT_TYPE_LABELS[item.elementType]}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    item.status === "generated" && "bg-atlas-success",
                    item.status === "favorite" && "bg-atlas-accent",
                    item.status === "rejected" && "bg-atlas-danger",
                    item.status === "draft" && "bg-atlas-text-dim"
                  )}
                />
              </div>
              <div className="text-xs text-atlas-text mb-1 capitalize">
                {ACTION_TYPE_LABELS[item.actionType]}
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-atlas-text-dim tabular-nums">
                  {item.durationTarget.toFixed(1)}s
                </span>
                <span className="text-[8px] text-atlas-text-dim capitalize rounded-full bg-atlas-surface-hover px-1.5 py-0.5">
                  {item.engineMode.replace(/_/g, " ").split(" ")[0]}
                </span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1">
                {item.audioUrl && (
                  <button
                    onClick={() => playSound(item)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors"
                  >
                    {playingId === item.id ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3 ml-0.5" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => onFavorite(item.id)}
                  className={cn(
                    "p-1 transition-colors",
                    item.status === "favorite" ? "text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-accent"
                  )}
                >
                  <Star className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onReject(item.id)}
                  className="p-1 text-atlas-text-dim hover:text-atlas-danger transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && filteredItems.length > 0 && (
        <div className="space-y-1" data-stagger>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                item.status === "rejected"
                  ? "border-red-200/30 opacity-50 bg-atlas-surface"
                  : item.status === "favorite"
                  ? "border-atlas-accent/20 bg-atlas-accent-muted/20"
                  : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
              )}
            >
              {item.audioUrl && (
                <button
                  onClick={() => playSound(item)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-colors"
                >
                  {playingId === item.id ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3 ml-0.5" />
                  )}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs text-atlas-text capitalize">
                  {ELEMENT_TYPE_LABELS[item.elementType]} · {ACTION_TYPE_LABELS[item.actionType]}
                </span>
              </div>
              <span className="text-[8px] text-atlas-text-dim capitalize rounded-full bg-atlas-surface-hover px-1.5 py-0.5 shrink-0">
                {item.engineMode.replace(/_/g, " ").split(" ")[0]}
              </span>
              <span className="text-xs text-atlas-text-dim tabular-nums shrink-0">
                {item.durationTarget.toFixed(1)}s
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onFavorite(item.id)}
                  className={cn(
                    "p-1 transition-colors",
                    item.status === "favorite" ? "text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-accent"
                  )}
                >
                  <Star className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onReject(item.id)}
                  className="p-1 text-atlas-text-dim hover:text-atlas-danger transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  item.status === "generated" && "bg-atlas-success",
                  item.status === "favorite" && "bg-atlas-accent",
                  item.status === "rejected" && "bg-atlas-danger",
                  item.status === "draft" && "bg-atlas-text-dim"
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
