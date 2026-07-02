"use client";

import { memo, useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SFX_CATEGORIES } from "@/lib/sfx/taxonomy";

/**
 * Generate a unique HSL color for each category based on its index.
 * Uses golden-angle distribution for maximum visual separation.
 */
function categoryColorMuted(index: number): string {
  const hue = (index * 137.508) % 360;
  return `hsla(${hue}, 45%, 45%, 0.15)`;
}

function categoryColorBorder(index: number): string {
  const hue = (index * 137.508) % 360;
  return `hsla(${hue}, 50%, 50%, 0.35)`;
}

interface CategoryBrowserProps {
  selected: string;
  onSelect: (category: string) => void;
  onSubcategoryClick?: (word: string) => void;
}

function CategoryBrowserInner({ selected, onSelect, onSubcategoryClick }: CategoryBrowserProps) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return SFX_CATEGORIES;
    const q = filter.toLowerCase();
    return SFX_CATEGORIES.filter(
      (c) =>
        c.category.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.includes(q))
    );
  }, [filter]);

  const selectedDef = useMemo(
    () => SFX_CATEGORIES.find((c) => c.category === selected),
    [selected]
  );

  const selectedIndex = SFX_CATEGORIES.findIndex((c) => c.category === selected);

  const handlePillClick = (cat: string) => {
    if (cat === selected) {
      onSelect(""); // deselect
    } else {
      onSelect(cat);
    }
  };

  const handleChipClick = (word: string) => {
    onSubcategoryClick?.(word);
  };

  return (
    <div className="space-y-3">
      {/* Clear button */}
      {selected && (
        <div className="flex justify-end">
          <button
            onClick={() => onSelect("")}
            className="flex items-center gap-1 text-xs text-atlas-text-dim hover:text-atlas-text-muted transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-atlas-text-dim" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter categories..."
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg pl-8 pr-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
        />
      </div>

      {/* Category pill grid */}
      <div className="flex flex-wrap gap-1.5" data-stagger>
        {filtered.map((cat) => {
          const idx = SFX_CATEGORIES.indexOf(cat);
          const isActive = cat.category === selected;
          const colorMuted = categoryColorMuted(idx);
          const colorBorder = categoryColorBorder(idx);

          return (
            <button
              key={cat.category}
              onClick={() => handlePillClick(cat.category)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
                "hover:scale-105 active:scale-95",
                isActive
                  ? "ring-1 shadow-sm text-atlas-text"
                  : "hover:shadow-sm text-atlas-text-muted"
              )}
              style={{
                backgroundColor: isActive ? colorMuted : "var(--color-atlas-surface)",
                border: `1px solid ${isActive ? colorBorder : "var(--color-atlas-border-subtle)"}`,
                ...(isActive ? { boxShadow: `0 0 8px ${colorMuted}`, ringColor: colorBorder } : {}),
              }}
            >
              {cat.category}
            </button>
          );
        })}
      </div>

      {/* Subcategory expansion panel */}
      {selectedDef && (
        <div
          className="animate-slide-up rounded-xl border border-atlas-border-subtle bg-atlas-surface p-4 space-y-3"
          style={{
            borderColor: categoryColorBorder(selectedIndex),
            background: `linear-gradient(135deg, var(--color-atlas-surface) 0%, ${categoryColorMuted(selectedIndex)} 100%)`,
          }}
        >
          {/* Subcategories */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">
              Subcategories
            </span>
            <div className="flex flex-wrap gap-1" data-stagger>
              {selectedDef.subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => handleChipClick(sub)}
                  className="rounded-md px-2 py-0.5 text-xs text-atlas-text-muted hover:text-atlas-text transition-all duration-150 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: categoryColorMuted(selectedIndex),
                    border: `1px solid ${categoryColorBorder(selectedIndex)}`,
                  }}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Surfaces */}
          {selectedDef.surfaces && selectedDef.surfaces.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">
                Surfaces
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedDef.surfaces.map((surface) => (
                  <button
                    key={surface}
                    onClick={() => handleChipClick(surface)}
                    className="rounded-md bg-atlas-bg px-2 py-0.5 text-xs text-atlas-text-dim border border-atlas-border-subtle transition-colors hover:text-atlas-text-muted hover:border-atlas-border"
                  >
                    {surface}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Environments */}
          {selectedDef.environments && selectedDef.environments.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim mb-1.5 block">
                Environments
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedDef.environments.map((env) => (
                  <button
                    key={env}
                    onClick={() => handleChipClick(env)}
                    className="rounded-md bg-atlas-bg px-2 py-0.5 text-xs text-atlas-text-dim border border-atlas-border-subtle transition-colors hover:text-atlas-text-muted hover:border-atlas-border"
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const CategoryBrowser = memo(CategoryBrowserInner);
