"use client";

import { cn } from "@/lib/utils";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";

interface FoleyPromptPreviewProps {
  composedPrompt: string;
  customOverride: string;
  onCustomOverrideChange: (text: string) => void;
  durationSeconds: number;
  onDurationChange: (d: number) => void;
  promptInfluence: number;
  onPromptInfluenceChange: (v: number) => void;
}

export function FoleyPromptPreview({
  composedPrompt, customOverride, onCustomOverrideChange,
  durationSeconds, onDurationChange, promptInfluence, onPromptInfluenceChange,
}: FoleyPromptPreviewProps) {
  const displayPrompt = customOverride.trim() || composedPrompt;

  return (
    <>
      {/* Prompt card — matches /generate sidebar styling. */}
      <div className="atlas-card p-4">
        <textarea
          value={customOverride || composedPrompt}
          onChange={(e) => onCustomOverrideChange(e.target.value)}
          placeholder="Describe the foley sound you want to generate..."
          rows={5}
          className="w-full rounded-xl border border-atlas-border bg-atlas-bg px-3.5 py-3 text-sm leading-relaxed text-atlas-text placeholder-atlas-text-muted focus:outline-none resize-none"
          data-no-transition
        />
        <div className="flex items-center justify-between text-xs text-atlas-text-muted mt-1.5">
          <span className={cn("tabular-nums", displayPrompt.length > 450 ? "text-atlas-danger font-medium" : "")}>
            {displayPrompt.length} chars
          </span>
          {customOverride && (
            <button
              onClick={() => onCustomOverrideChange("")}
              className="rounded-md p-1 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
              title="Reset to auto-composed"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Controls card — sliders styled like /generate. */}
      <div className="atlas-card p-3 space-y-3">
        <AtlasSlider
          value={durationSeconds}
          onChange={onDurationChange}
          min={0.5}
          max={30}
          step={0.5}
          label="Duration"
          displayValue={`${durationSeconds}s`}
          lowLabel="0.5s"
          highLabel="30s"
          ticks={[1, 5, 10, 15, 20, 25, 30]}
        />
        <AtlasSlider
          value={promptInfluence}
          onChange={onPromptInfluenceChange}
          min={0}
          max={1}
          step={0.05}
          label="Prompt Influence"
          displayValue={promptInfluence.toFixed(2)}
          lowLabel="Creative"
          highLabel="Precise"
        />
      </div>
    </>
  );
}
