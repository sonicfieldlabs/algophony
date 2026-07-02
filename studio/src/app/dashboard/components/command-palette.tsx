/**
 * Algophony Studio — Command Palette (⌘K)
 *
 * §5.4: Fuzzy search across navigation, generations, settings, supervisor.
 */

"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  section: string;
}

const NAV_ITEMS: Omit<PaletteItem, "action">[] = [
  { id: "nav-generate", label: "Generic", description: "Open-ended sound generation", section: "Design" },
  { id: "nav-creature", label: "Non-human", description: "Creature sound design", section: "Design" },
  { id: "nav-human", label: "Human", description: "Human sound events", section: "Design" },
  { id: "nav-foley", label: "Foley Room", description: "Foley recording & design", section: "Design" },
  { id: "nav-atmos", label: "Atmosphere", description: "Ambient layers", section: "Design" },
  { id: "nav-vehicle", label: "Vehicle", description: "Engines, brakes, rockets", section: "Design" },
  { id: "nav-ui", label: "UI Elements", description: "Interface sounds", section: "Design" },
  { id: "nav-candy", label: "Misc", description: "Whooshes, impacts, noise, artifacts", section: "Design" },
  { id: "nav-library", label: "Library", description: "Recipes, Sounds, Tags, Projects", section: "Workspace" },
  { id: "nav-chatsfx", label: "Agent", description: "Agent-assisted sound design", section: "Workspace" },
  { id: "nav-listen", label: "Sound to Prompt", description: "Reference audio analysis", section: "Tools" },
  { id: "nav-image-to-sound", label: "Image to Sound", description: "Visual-to-prompt design", section: "Tools" },
  { id: "nav-variation", label: "Variation Lab", description: "Generate variations", section: "Tools" },
  { id: "nav-stacker", label: "Stacker", description: "Layer stacking tool", section: "Tools" },
  { id: "nav-import", label: "Import", description: "Metadata CSV import", section: "Tools" },
  { id: "nav-export", label: "Export Center", description: "Export & packaging", section: "Tools" },
  { id: "nav-settings", label: "Settings", description: "Workspace, providers, appearance, models", section: "Settings" },
  { id: "nav-providers", label: "Providers", description: "Bring your own ElevenLabs key", section: "Settings" },
  { id: "nav-docs", label: "Docs", description: "Sound research guide", section: "Settings" },
];

const NAV_PATHS: Record<string, string> = {
  "nav-generate": "/dashboard/generate",
  "nav-creature": "/dashboard/creature-lab",
  "nav-human": "/dashboard/human-lab",
  "nav-foley": "/dashboard/foley-room",
  "nav-atmos": "/dashboard/atmosphere-builder",
  "nav-vehicle": "/dashboard/vehicle",
  "nav-ui": "/dashboard/ui-elements",
  "nav-candy": "/dashboard/candy",
  "nav-library": "/dashboard/library",
  "nav-chatsfx": "/dashboard/chatsfx",
  "nav-listen": "/dashboard/listen",
  "nav-image-to-sound": "/dashboard/image-to-sound",
  "nav-variation": "/dashboard/variation-lab",
  "nav-stacker": "/dashboard/stacker",
  "nav-import": "/dashboard/import",
  "nav-export": "/dashboard/export",
  "nav-settings": "/dashboard/settings",
  "nav-providers": "/dashboard/settings?tab=providers",
  "nav-docs": "/dashboard/docs",
};

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const items: PaletteItem[] = useMemo(() =>
    NAV_ITEMS.map((item) => ({
      ...item,
      action: () => {
        const path = NAV_PATHS[item.id];
        if (path) router.push(path);
        setOpen(false);
      },
    })),
  [router]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((i) =>
      fuzzyMatch(query, i.label) || fuzzyMatch(query, i.description ?? "")
    );
  }, [items, query]);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) {
            updateQuery("");
          }
          return !o;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [updateQuery]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard nav
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  }, [filtered, selectedIndex]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <dialog
        open
        className="fixed inset-0 z-[61] flex items-start justify-center pt-[20vh] bg-transparent"
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div className="w-full max-w-lg rounded-2xl border border-atlas-border bg-atlas-bg shadow-2xl shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-atlas-border-subtle px-4 py-3">
            <Search className="h-4 w-4 text-atlas-text-dim shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, pages, actions…"
              className="flex-1 bg-transparent text-sm text-atlas-text placeholder:text-atlas-text-dim/50 focus:outline-none"
            />
            <kbd className="rounded bg-atlas-surface-hover px-1.5 py-0.5 text-xs text-atlas-text-dim font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-atlas-text-dim">No results for &ldquo;{query}&rdquo;</div>
            ) : (
              filtered.map((item, i) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === selectedIndex ? "bg-atlas-accent/8 text-atlas-text" : "text-atlas-text-muted hover:bg-atlas-surface-hover"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{item.label}</div>
                    {item.description && <div className="text-xs text-atlas-text-dim truncate">{item.description}</div>}
                  </div>
                  <div className="text-xs text-atlas-text-dim uppercase tracking-wider shrink-0">{item.section}</div>
                  {i === selectedIndex && <ArrowRight className="h-3 w-3 text-atlas-accent shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-atlas-border-subtle px-4 py-2 text-xs text-atlas-text-dim">
            <span className="flex items-center gap-1"><Command className="h-2.5 w-2.5" />K to toggle</span>
            <span>↑↓ navigate</span>
            <span>↵ select</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
