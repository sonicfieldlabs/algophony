"use client";

import { useState } from "react";
import { ChevronDown, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UI_POSITIVE_TAGS,
  UI_NEGATIVE_TAGS,
  type UIEvaluationTag,
  isUIPositiveTag,
} from "@/lib/sfx/ui-elements-evaluations";

interface EvaluationPanelProps {
  /** Currently selected tags */
  tags: UIEvaluationTag[];
  /** Called when tags change */
  onTagsChange: (tags: UIEvaluationTag[]) => void;
  /** Whether a result is available to evaluate */
  hasResult: boolean;
}

export function EvaluationPanel({
  tags,
  onTagsChange,
  hasResult,
}: EvaluationPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hasResult) return null;

  const toggleTag = (tag: UIEvaluationTag) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter((t) => t !== tag));
    } else {
      onTagsChange([...tags, tag]);
    }
  };

  const negativeCount = tags.filter((t) => !isUIPositiveTag(t)).length;
  const positiveCount = tags.filter((t) => isUIPositiveTag(t)).length;

  return (
    <div className="animate-expand-down">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-2"
      >
        <span className="flex items-center gap-1.5">
          Evaluate
          {tags.length > 0 && (
            <span className="rounded-full bg-atlas-accent-muted px-1.5 py-0.5 text-[8px] text-atlas-accent tabular-nums">
              {tags.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 animate-expand-down">
          {/* Negative tags */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <ThumbsDown className="h-3 w-3 text-red-400" />
              <span className="text-xs text-atlas-text-dim">
                Issues{negativeCount > 0 && ` (${negativeCount})`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {UI_NEGATIVE_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-xs font-medium transition-all border",
                      active
                        ? "border-red-300 bg-red-100 text-red-700 [data-theme=dark]:border-red-800 [data-theme=dark]:bg-red-950/30 [data-theme=dark]:text-red-400"
                        : "border-atlas-border-subtle bg-atlas-surface text-atlas-text-dim hover:border-red-200 hover:text-red-500"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Positive tags */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <ThumbsUp className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-atlas-text-dim">
                Qualities{positiveCount > 0 && ` (${positiveCount})`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {UI_POSITIVE_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-xs font-medium transition-all border",
                      active
                        ? "border-emerald-300 bg-emerald-100 text-emerald-700 [data-theme=dark]:border-emerald-800 [data-theme=dark]:bg-emerald-950/30 [data-theme=dark]:text-emerald-400"
                        : "border-atlas-border-subtle bg-atlas-surface text-atlas-text-dim hover:border-emerald-200 hover:text-emerald-500"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback summary */}
          {negativeCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 [data-theme=dark]:border-amber-900/30 [data-theme=dark]:bg-amber-950/20 [data-theme=dark]:text-amber-400">
              ↻ {negativeCount} issue{negativeCount > 1 ? "s" : ""} will auto-correct the next prompt
            </div>
          )}
        </div>
      )}
    </div>
  );
}
