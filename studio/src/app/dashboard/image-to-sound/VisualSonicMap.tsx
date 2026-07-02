"use client";

import { VisualElement } from "@/lib/sfx/image-to-sound-taxonomy";
import { ArrowRight, Plus } from "lucide-react";

interface VisualSonicMapProps {
  elements: VisualElement[];
  onCreateCard?: (element: VisualElement) => void;
}

export function VisualSonicMap({ elements, onCreateCard }: VisualSonicMapProps) {
  if (!elements || elements.length === 0) return null;

  return (
    <div className="atlas-card p-5 animate-slide-up space-y-4" style={{ animationDelay: "150ms" }}>
      <div>
        <h2 className="text-sm font-semibold text-atlas-text mb-1">
          Visual Sonic Map
        </h2>
        <p className="text-xs text-atlas-text-dim">
          Translating detected visual objects into sonic potential.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {elements.map((el, i) => {
          const sounds = el.sonicPotential.split(",").map(s => s.trim()).filter(Boolean);

          return (
            <div key={i} className="group relative bg-atlas-bg rounded-xl border border-atlas-border-subtle p-3 hover:border-atlas-border transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold text-atlas-text truncate pr-2">
                  {el.element}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-atlas-accent bg-atlas-accent/10 px-1.5 py-0.5 rounded shrink-0">
                  {el.category.split('/')[0].trim()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-atlas-text-dim mb-2">
                <ArrowRight className="h-3 w-3 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {sounds.map((s, j) => (
                    <span key={j} className="text-xs bg-atlas-surface-hover px-1.5 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {onCreateCard && (
                <div className="absolute inset-0 bg-atlas-surface/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl border border-atlas-accent/30">
                  <button
                    onClick={() => onCreateCard(el)}
                    className="flex items-center gap-1.5 bg-atlas-bg border border-atlas-border shadow-sm text-atlas-text-muted hover:text-atlas-text text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Create Prompt Card
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
