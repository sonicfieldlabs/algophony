"use client";

import { useState, useMemo, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VOCAB_MODES, suggestVocabulary, loadVocabMode, saveVocabMode,
  type VocabMode,
} from "@/lib/sfx/vocab-trainer";

interface VocabTrainerProps {
  prompt: string;
  onApplySuggestion: (replacement: string) => void;
}

export function VocabTrainer({ prompt, onApplySuggestion }: VocabTrainerProps) {
  const [mode, setMode] = useState<VocabMode>(loadVocabMode);
  const [showModes, setShowModes] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => { saveVocabMode(mode); }, [mode]);

  const suggestions = useMemo(
    () => suggestVocabulary(prompt, mode).filter((s) => !dismissedIds.has(s.originalPhrase)),
    [prompt, mode, dismissedIds]
  );

  if (suggestions.length === 0 || prompt.length < 3) return null;

  const dismiss = (phrase: string) => {
    setDismissedIds((prev) => new Set([...prev, phrase]));
  };

  return (
    <div className="rounded-xl border border-purple-400/15 bg-purple-400/5 p-3 space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Vocabulary Trainer</span>
        </div>
        <button
          onClick={() => setShowModes(!showModes)}
          className="flex items-center gap-1 text-xs text-purple-400/70 hover:text-purple-400"
        >
          {VOCAB_MODES.find((m) => m.id === mode)?.label}
          {showModes ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
        </button>
      </div>

      {/* Mode selector */}
      {showModes && (
        <div className="flex flex-wrap gap-1">
          {VOCAB_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setShowModes(false); }}
              className={cn(
                "rounded-lg px-2 py-1 text-xs font-medium transition-all border",
                mode === m.id
                  ? "bg-purple-400/15 border-purple-400/30 text-purple-400"
                  : "border-atlas-border-subtle text-atlas-text-dim hover:text-atlas-text"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="space-y-1.5">
        {suggestions.map((s) => (
          <div key={s.originalPhrase} className="rounded-lg bg-atlas-bg/50 p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs text-atlas-text-dim">Instead of</span>
              <span className="text-xs text-red-400/80 font-medium line-through">&ldquo;{s.originalPhrase}&rdquo;</span>
              <span className="text-xs text-atlas-text-dim">try:</span>
              <button onClick={() => dismiss(s.originalPhrase)} className="ml-auto text-xs text-atlas-text-dim hover:text-atlas-text">
                dismiss
              </button>
            </div>
            <div className="space-y-1">
              {s.alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => onApplySuggestion(alt)}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-purple-400/10 group"
                >
                  <Sparkles className="h-2.5 w-2.5 text-purple-400 shrink-0 opacity-60 group-hover:opacity-100" />
                  <span className="text-xs text-atlas-text-muted group-hover:text-atlas-text font-mono leading-snug">{alt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
