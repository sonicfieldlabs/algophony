"use client";

import { useMemo } from "react";
import {
  AlertTriangle, Info, XCircle, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  analyzeLayerCompatibility,
  type WarningSuggestion,
} from "@/lib/sfx/layer-warnings";

interface LayerWarningsPanelProps {
  prompt: string;
  duration: number;
  loop: boolean;
  promptInfluence: number;
  exclusions: string[];
  category?: string;
  onAddExclusion: (text: string) => void;
  onSetDuration: (d: number) => void;
  onToggleLoop: (loop: boolean) => void;
}

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const SEVERITY_COLORS = {
  info: { border: "border-blue-400/20", bg: "bg-blue-400/5", text: "text-blue-400", icon: "text-blue-400" },
  warning: { border: "border-orange-400/20", bg: "bg-orange-400/5", text: "text-orange-400", icon: "text-orange-400" },
  error: { border: "border-red-400/20", bg: "bg-red-400/5", text: "text-red-400", icon: "text-red-400" },
};

export function LayerWarningsPanel({
  prompt, duration, loop, promptInfluence, exclusions, category,
  onAddExclusion, onSetDuration, onToggleLoop,
}: LayerWarningsPanelProps) {
  const warnings = useMemo(
    () => analyzeLayerCompatibility(prompt, duration, loop, promptInfluence, exclusions, category ?? ""),
    [prompt, duration, loop, promptInfluence, exclusions, category]
  );

  if (warnings.length === 0 || prompt.length < 5) return null;

  const handleSuggestion = (s: WarningSuggestion) => {
    switch (s.action) {
      case "add_exclusion":
        onAddExclusion(s.value);
        break;
      case "reduce_duration":
        onSetDuration(parseFloat(s.value));
        break;
      case "toggle_loop":
        onToggleLoop(s.value === "true");
        break;
      case "split_layer":
      case "change_role":
        // Show suggestion text only — no automated action
        break;
    }
  };

  return (
    <div className="space-y-1.5 animate-fade-in">
      {warnings.map((w) => {
        const colors = SEVERITY_COLORS[w.severity];
        const Icon = SEVERITY_ICONS[w.severity];

        return (
          <div
            key={w.id}
            className={cn("rounded-xl border p-3", colors.border, colors.bg)}
          >
            <div className="flex items-start gap-2">
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", colors.icon)} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold", colors.text)}>{w.title}</p>
                <p className="text-xs text-atlas-text-muted mt-0.5">{w.description}</p>

                {w.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {w.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestion(s)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all border",
                          s.action === "split_layer" || s.action === "change_role"
                            ? "border-atlas-border-subtle text-atlas-text-dim cursor-default"
                            : "border-atlas-accent/30 text-atlas-accent hover:bg-atlas-accent/10 cursor-pointer"
                        )}
                      >
                        <Lightbulb className="h-2.5 w-2.5" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
