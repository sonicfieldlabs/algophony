"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AtlasSlider } from "@/app/dashboard/generate/AtlasSlider";
import type { EngineMode, TtsSettings } from "@/lib/sfx/human-taxonomy";

interface HumanPromptPreviewProps {
  composedPrompt: string;
  engineMode: EngineMode;
  customOverride: string;
  onCustomOverrideChange: (text: string) => void;
  promptInfluence: number;
  onPromptInfluenceChange: (v: number) => void;
  ttsSettings: TtsSettings;
  onTtsSettingsChange: (s: TtsSettings) => void;
}

export function HumanPromptPreview({
  composedPrompt, engineMode, customOverride, onCustomOverrideChange,
  promptInfluence, onPromptInfluenceChange, ttsSettings, onTtsSettingsChange,
}: HumanPromptPreviewProps) {
  const displayPrompt = customOverride.trim() || composedPrompt;

  return (
    <>
      {/* Prompt — matches /generate sidebar: same textarea sizing, font,
          char counter row, and reset affordance. */}
      <div className="atlas-card p-4">
        <textarea
          value={customOverride || composedPrompt}
          onChange={(e) => onCustomOverrideChange(e.target.value)}
          placeholder="Describe the human sound you want to generate..."
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

      {/* TTS / Dialogue inputs — only when needed. Lives outside the
          prompt card so the box itself stays identical to /generate. */}
      {(engineMode === "tts" || engineMode === "dialogue") && (
        <div className="atlas-card p-3 space-y-2">
          <span className="atlas-eyebrow">Vocal text</span>
          <input
            value={ttsSettings.text}
            onChange={(e) => onTtsSettingsChange({ ...ttsSettings, text: e.target.value })}
            placeholder='e.g. "Ah!", "Help!", "No!"…'
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-muted focus:border-atlas-accent focus:outline-none"
          />
          <span className="atlas-eyebrow pt-1 block">Voice ID</span>
          <input
            value={ttsSettings.voiceId}
            onChange={(e) => onTtsSettingsChange({ ...ttsSettings, voiceId: e.target.value })}
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text font-mono focus:border-atlas-accent focus:outline-none"
          />
        </div>
      )}

      {engineMode === "voice_design" && (
        <div className="flex items-start gap-2 rounded-xl border border-atlas-warning/20 bg-atlas-warning/5 p-2">
          <AlertTriangle className="h-3 w-3 text-atlas-warning shrink-0 mt-0.5" />
          <p className="text-xs text-atlas-text-dim">
            Voice Design generates a fictional character voice from description.
          </p>
        </div>
      )}

      {/* Influence slider (SFX-only) — uses the same AtlasSlider as /generate */}
      {engineMode === "sfx" && (
        <div className="atlas-card p-3">
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
      )}
    </>
  );
}
