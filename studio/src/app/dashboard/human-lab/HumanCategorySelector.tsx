"use client";

import { Wind, Dumbbell, Smile, HeartPulse, Sparkles, Swords, Wand2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HumanCategory } from "@/lib/sfx/human-taxonomy";
import { HUMAN_CATEGORY_DEFS } from "@/lib/sfx/human-taxonomy";

const ICONS: Record<string, React.ElementType> = {
  Wind, Dumbbell, Smile, HeartPulse, Sparkles, Swords, Wand2, Users,
};

interface HumanCategorySelectorProps {
  selected: HumanCategory;
  onSelect: (c: HumanCategory) => void;
}

export function HumanCategorySelector({ selected, onSelect }: HumanCategorySelectorProps) {
  const activeDef = HUMAN_CATEGORY_DEFS.find((c) => c.id === selected);

  return (
    // Compact icon-led grid: each category is a square icon tile, and the
    // active category's blurb is shown once below the grid instead of being
    // repeated under every option.
    <div className="atlas-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim flex items-center gap-1">
          <Users className="h-3 w-3" />
          Human Category
        </span>
        {activeDef && (
          <span className="text-[11px] text-atlas-text-dim truncate ml-3 min-w-0">{activeDef.description}</span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {HUMAN_CATEGORY_DEFS.map((cat) => {
          const isActive = selected === cat.id;
          const Icon = ICONS[cat.icon] ?? Users;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              title={`${cat.label} — ${cat.description}`}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-lg border py-2 px-1 transition-all",
                isActive
                  ? "border-atlas-accent bg-atlas-accent-muted"
                  : "border-atlas-border-subtle bg-atlas-bg hover:border-atlas-border"
              )}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={1.5}
                style={{ color: isActive ? `hsl(${cat.hue}, 55%, 50%)` : undefined }}
              />
              <span className={cn("text-[10px] font-medium leading-none truncate w-full text-center", isActive ? "text-atlas-accent" : "text-atlas-text-muted")}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
