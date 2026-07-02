"use client";

import { Footprints, Shirt, Package, Hammer, TreePine, Layers, Hand, DoorOpen, PersonStanding, Wrench, Droplets, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FoleyCategory } from "@/lib/sfx/foley-taxonomy";
import { FOLEY_CATEGORY_DEFS } from "@/lib/sfx/foley-taxonomy";

const ICONS: Record<string, React.ElementType> = {
  Footprints, Shirt, Hand, Package, DoorOpen, PersonStanding, Layers, Hammer, TreePine, Wrench, Droplets, Utensils,
};

interface FoleyCategorySelectorProps {
  selected: FoleyCategory;
  onSelect: (category: FoleyCategory) => void;
}

export function FoleyCategorySelector({ selected, onSelect }: FoleyCategorySelectorProps) {
  return (
    // Icon-grid: foley types are inherently graphic concepts (boots, cloth,
    // wood…), so we render a tight icon grid with the label underneath. No
    // descriptive text — the icon does the work, tooltip carries detail.
    <div className="atlas-card p-3 space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
        <Footprints className="h-3 w-3" />
        Foley Category
      </span>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {FOLEY_CATEGORY_DEFS.map((cat) => {
          const isActive = selected === cat.id;
          const Icon = ICONS[cat.icon] ?? Layers;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              title={cat.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border py-2 px-1 transition-all",
                isActive
                  ? "border-atlas-accent bg-atlas-accent-muted"
                  : "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
              )}
            >
              <Icon
                className="h-6 w-6 shrink-0"
                strokeWidth={1.5}
                style={{ color: isActive ? `hsl(${cat.hue}, 55%, 50%)` : undefined }}
              />
              <span className={cn("text-[11px] font-medium leading-tight w-full text-center", isActive ? "text-atlas-accent" : "text-atlas-text-muted")}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
