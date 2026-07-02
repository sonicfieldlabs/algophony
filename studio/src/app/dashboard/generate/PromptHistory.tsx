"use client";

import { useRef } from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PromptHistoryEntry {
  id: string;
  text: string;
  category: string;
  duration: number;
  promptInfluence: number;
  exclusions: string[];
  loop: boolean;
  verdict?: string;
  timestamp: number;
}

const STORAGE_KEY = "atlas-prompt-history";
const MAX_ENTRIES = 20;

/** Load prompt history from localStorage */
export function loadPromptHistory(): PromptHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a new generation to prompt history */
export function saveToHistory(entry: PromptHistoryEntry): PromptHistoryEntry[] {
  const existing = loadPromptHistory();
  // Deduplicate by id
  const filtered = existing.filter((e) => e.id !== entry.id);
  const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* storage full */ }
  return updated;
}

interface PromptHistoryProps {
  entries: PromptHistoryEntry[];
  onSelect: (entry: PromptHistoryEntry) => void;
  onClear: () => void;
}

const VERDICT_ICONS: Record<string, string> = {
  favorite: "★",
  usable: "✓",
  needs_retry: "↻",
  rejected: "✗",
};

const VERDICT_COLORS: Record<string, string> = {
  favorite: "text-atlas-accent",
  usable: "text-atlas-success",
  needs_retry: "text-atlas-warning",
  rejected: "text-atlas-danger",
};

export function PromptHistory({ entries, onSelect, onClear }: PromptHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
          <Clock className="h-3 w-3" />
          Recent Prompts
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-atlas-text-dim hover:text-atlas-danger transition-colors"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className={cn(
              "group flex-shrink-0 rounded-lg border border-atlas-border-subtle bg-atlas-surface",
              "px-3 py-2 text-left transition-all duration-200",
              "hover:border-atlas-border hover:bg-atlas-surface-hover hover:shadow-sm",
              "max-w-[200px] min-w-[140px]"
            )}
          >
            {/* Top row: category + verdict */}
            <div className="flex items-center justify-between gap-2 mb-1">
              {entry.category ? (
                <span className="rounded-full bg-atlas-bg px-1.5 py-0.5 text-xs text-atlas-text-dim truncate">
                  {entry.category}
                </span>
              ) : (
                <span />
              )}
              {entry.verdict && (
                <span className={cn("text-xs", VERDICT_COLORS[entry.verdict] || "text-atlas-text-dim")}>
                  {VERDICT_ICONS[entry.verdict] || ""}
                </span>
              )}
            </div>
            {/* Prompt text */}
            <p className="text-xs text-atlas-text-muted line-clamp-2 leading-tight group-hover:text-atlas-text transition-colors">
              {entry.text}
            </p>
            {/* Timestamp */}
            <span className="text-xs text-atlas-text-dim mt-1 block">
              {formatTimeAgo(entry.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
