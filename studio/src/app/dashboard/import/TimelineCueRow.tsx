"use client";

import { useState, useRef } from "react";
import { Play, Pause, Pencil, Check, Tag, Clock, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineCue, CueStatus } from "@/lib/timeline/types";

interface TimelineCueRowProps {
  cue: TimelineCue;
  sceneLabel?: string;
  onUpdate: (id: string, updates: Partial<TimelineCue>) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const STATUS_STYLES: Record<CueStatus, { bg: string; text: string; label: string }> = {
  parsed: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Parsed" },
  reviewed: { bg: "bg-atlas-accent-muted", text: "text-atlas-accent", label: "Ready" },
  generating: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Generating" },
  generated: { bg: "bg-green-500/10", text: "text-green-400", label: "Generated" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", label: "Failed" },
  skipped: { bg: "bg-atlas-surface-hover", text: "text-atlas-text-dim", label: "Skipped" },
  exported: { bg: "bg-purple-500/10", text: "text-purple-400", label: "Exported" },
};

const CATEGORY_OPTIONS = [
  "Foley", "Ambience", "Footsteps", "Water", "Impact", "Door", "Vehicle",
  "Creature", "Animal", "Weapon", "Fire", "Air", "Weather", "Machinery",
  "Electricity", "Sci-fi", "Magic", "Horror", "UI", "Booms",
];

export function TimelineCueRow({
  cue,
  sceneLabel,
  onUpdate,
  onRemove,
  isSelected,
  onSelect,
}: TimelineCueRowProps) {
  const [editing, setEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(cue.generatedPrompt ?? "");
  const [showCatMenu, setShowCatMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const status = STATUS_STYLES[cue.status];

  const handleSavePrompt = () => {
    onUpdate(cue.id, { generatedPrompt: editedPrompt, status: "reviewed" });
    setEditing(false);
  };

  const handleTogglePlay = () => {
    if (!audioRef.current || !cue.audioUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
    }
  };

  return (
    <div
      className={cn(
        "group rounded-xl border transition-all duration-200",
        isSelected ? "border-atlas-accent bg-atlas-accent/5" : "border-atlas-border bg-atlas-surface hover:border-atlas-border-hover",
        cue.status === "skipped" && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(cue.id)}
          className="mt-1 h-4 w-4 rounded border-atlas-border accent-atlas-accent"
        />

        {/* Cue number + timecode */}
        <div className="shrink-0 w-28">
          <div className="text-xs font-semibold text-atlas-text tabular-nums">
            Cue {String(cue.index + 1).padStart(3, "0")}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-atlas-text-dim" />
            <span className="text-xs font-mono text-atlas-accent tabular-nums">
              {cue.timecodeIn}
            </span>
          </div>
          {cue.durationMs != null && (
            <div className="text-xs text-atlas-text-dim mt-0.5 tabular-nums">
              {(cue.durationMs / 1000).toFixed(2)}s
            </div>
          )}
          {sceneLabel && (
            <div className="text-xs text-atlas-text-dim mt-1 truncate max-w-[100px]">
              {sceneLabel}
            </div>
          )}
        </div>

        {/* Description + Prompt */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Original description */}
          <p className="text-xs text-atlas-text-muted leading-relaxed">
            {cue.description}
          </p>

          {/* Generated prompt */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-atlas-accent bg-atlas-bg px-3 py-2 text-xs text-atlas-text font-mono resize-none focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePrompt}
                  className="flex items-center gap-1 rounded-md bg-atlas-accent px-2.5 py-1 text-xs font-medium text-white"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
                <button
                  onClick={() => { setEditing(false); setEditedPrompt(cue.generatedPrompt ?? ""); }}
                  className="text-xs text-atlas-text-dim hover:text-atlas-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            cue.generatedPrompt && (
              <div
                className="group/prompt flex items-start gap-2 rounded-lg bg-atlas-bg/60 px-3 py-2 cursor-pointer hover:bg-atlas-surface-hover transition-colors"
                onClick={() => { setEditing(true); setEditedPrompt(cue.generatedPrompt ?? ""); }}
              >
                <p className="text-xs text-atlas-text font-mono leading-relaxed flex-1">
                  {cue.generatedPrompt}
                </p>
                <Pencil className="h-3 w-3 text-atlas-text-dim opacity-0 group-hover/prompt:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>
            )
          )}
        </div>

        {/* Right column: category + status + actions */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {/* Category badge */}
          <div className="relative">
            <button
              onClick={() => setShowCatMenu(!showCatMenu)}
              className="flex items-center gap-1 rounded-md bg-atlas-surface-hover px-2 py-1 text-xs font-medium text-atlas-text-muted hover:text-atlas-text transition-colors"
            >
              <Tag className="h-3 w-3" />
              {cue.category || "Foley"}
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
            {showCatMenu && (
              <div className="absolute right-0 top-7 z-20 w-36 max-h-48 overflow-y-auto rounded-lg border border-atlas-border bg-atlas-surface shadow-lg">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { onUpdate(cue.id, { category: cat }); setShowCatMenu(false); }}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-xs hover:bg-atlas-surface-hover",
                      (cue.category ?? "Foley") === cat ? "text-atlas-accent font-medium" : "text-atlas-text-muted"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status badge */}
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", status.bg, status.text)}>
            {status.label}
          </span>

          {/* Play button */}
          {cue.audioUrl && (
            <>
              <audio
                ref={audioRef}
                src={cue.audioUrl}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              <button
                onClick={handleTogglePlay}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                  playing
                    ? "bg-atlas-accent text-white scale-110"
                    : "bg-atlas-surface-hover text-atlas-text hover:bg-atlas-accent/20"
                )}
              >
                {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
              </button>
            </>
          )}

          {/* Remove */}
          <button
            onClick={() => onRemove(cue.id)}
            className="text-atlas-text-dim hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
