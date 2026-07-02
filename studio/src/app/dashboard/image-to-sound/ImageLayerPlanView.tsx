"use client";

import { LayerPlan, LAYER_ROLES } from "@/lib/sfx/image-to-sound-taxonomy";

interface ImageLayerPlanViewProps {
  plan: LayerPlan;
}

export function ImageLayerPlanView({ plan }: ImageLayerPlanViewProps) {
  const sections = [
    { key: "foreground", label: "Foreground", items: plan.foreground },
    { key: "midground", label: "Midground", items: plan.midground },
    { key: "background", label: "Background", items: plan.background },
    { key: "space", label: "Space & Room", items: plan.space },
    { key: "texture", label: "Texture", items: plan.texture },
    { key: "emotion", label: "Emotion", items: plan.emotion },
    { key: "microEvents", label: "Micro Events", items: plan.microEvents },
  ] as const;

  const totalCards = sections.reduce((acc, s) => acc + s.items.length, 0);
  if (totalCards === 0) return null;

  return (
    <div className="atlas-card p-5 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <h2 className="text-sm font-semibold text-atlas-text mb-4">Structural Plan</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sections.map((section) => {
          if (section.items.length === 0) return null;

          return (
            <div key={section.key} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-atlas-text-dim border-b border-atlas-border-subtle pb-1">
                {section.label}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((card) => {
                  const roleDef = LAYER_ROLES.find(r => r.id === card.layerRole);
                  const dotColor = roleDef?.color || "var(--color-atlas-text-dim)";

                  return (
                    <div key={card.id} className="flex items-center gap-1.5 text-xs text-atlas-text">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className="truncate">{card.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
