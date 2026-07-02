"use client";

import { SONIC_STRATEGIES, SonicStrategy } from "@/lib/sfx/image-to-sound-taxonomy";
import { Sparkles } from "lucide-react";

interface SonicStrategySelectorProps {
  strategy: SonicStrategy;
  onStrategyChange: (strategy: SonicStrategy) => void;
  suggestedStrategy?: SonicStrategy;
}

export function SonicStrategySelector({ strategy, onStrategyChange, suggestedStrategy }: SonicStrategySelectorProps) {
  return (
    <div className="atlas-card p-5 animate-slide-up space-y-4" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-atlas-text mb-1">
            Sonic Strategy
          </h2>
          <p className="text-xs text-atlas-text-dim">
            The structural approach for this image.
          </p>
        </div>
        {suggestedStrategy && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-atlas-accent bg-atlas-accent/10 px-2 py-1 rounded-md">
            <Sparkles className="h-3 w-3" />
            AI Suggests: {SONIC_STRATEGIES.find(s => s.id === suggestedStrategy)?.label}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SONIC_STRATEGIES.map((s) => (
          <button
            key={s.id}
            onClick={() => onStrategyChange(s.id)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
              ${strategy === s.id
                ? "bg-atlas-text text-atlas-bg border-atlas-text"
                : "bg-atlas-bg text-atlas-text-muted border-atlas-border-subtle hover:border-atlas-border hover:text-atlas-text"}
            `}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
