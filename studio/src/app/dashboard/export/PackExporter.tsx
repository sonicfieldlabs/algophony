"use client";

import { useState } from "react";
import { Package, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PackType, PACK_TYPE_LABELS } from "@/lib/sfx/export-taxonomy";
import { buildPackManifest } from "@/lib/sfx/export-builders";

const PACK_KEYS = Object.keys(PACK_TYPE_LABELS) as PackType[];

interface PackExporterProps {
  cards: Record<string, unknown>[];
  generations: Record<string, unknown>[];
}

export function PackExporter({ cards, generations: _generations }: PackExporterProps) {
  const [packType, setPackType] = useState<PackType>("prompt_pack");
  const [packName, setPackName] = useState("My Sound Pack");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  // Filter cards by pack type category
  const categoryMap: Record<PackType, string[]> = {
    prompt_pack: [],
    foley_pack: ["Foley", "Footsteps", "Props", "Doors", "Cloth"],
    ui_sound_set: ["UI"],
    atmosphere_set: ["Atmosphere", "Ambience"],
    creature_pack: ["Creature"],
    human_pack: ["Human", "Crowds", "Body sounds"],
    round_robin_pack: [],
    game_event_pack: [],
    daw_scene_pack: [],
  };

  const relevantCards = categoryMap[packType].length > 0
    ? cards.filter((c) => categoryMap[packType].some((cat) =>
      String(c.category ?? "").toLowerCase().includes(cat.toLowerCase())))
    : cards;

  const items = relevantCards.map((c, i) => ({
    file: `${String(c.title ?? "sound").replace(/\s+/g, "_")}_${String(i + 1).padStart(2, "0")}.mp3`,
    prompt_card_id: String(c.id ?? ""),
    category: String(c.category ?? ""),
  }));

  const handleExport = () => {
    const manifest = buildPackManifest(packName, packType, items);
    const blob = new Blob([manifest], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${packName.replace(/\s+/g, "_")}_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Pack Export</h3>
        </div>

        {/* Pack type selector */}
        <div className="mb-3">
          <label className="text-xs text-atlas-text-dim mb-1.5 block">Pack Type</label>
          <div className="flex flex-wrap gap-1.5">
            {PACK_KEYS.map((pt) => (
              <button key={pt} onClick={() => setPackType(pt)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  packType === pt ? "bg-atlas-accent text-white" : "bg-atlas-surface-hover text-atlas-text-muted hover:text-atlas-text"
                )}
              >
                {PACK_TYPE_LABELS[pt]}
              </button>
            ))}
          </div>
        </div>

        {/* Pack name */}
        <div className="mb-3">
          <label className="text-xs text-atlas-text-dim mb-1 block">Pack Name</label>
          <input value={packName} onChange={(e) => setPackName(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none" />
        </div>

        {/* Include options */}
        <div className="flex gap-4 mb-3">
          {[
            { label: "Audio files", checked: includeAudio, set: setIncludeAudio },
            { label: "Metadata", checked: includeMetadata, set: setIncludeMetadata },
            { label: "Notes", checked: includeNotes, set: setIncludeNotes },
          ].map(({ label, checked, set }) => (
            <label key={label} className="flex items-center gap-1.5 text-xs text-atlas-text-muted cursor-pointer">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)}
                className="h-3.5 w-3.5 accent-atlas-accent rounded" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Pack contents */}
      <div className="atlas-card p-4">
        <h3 className="text-sm font-semibold text-atlas-text mb-2">Pack Contents ({items.length} items)</h3>
        {items.length === 0 ? (
          <p className="text-xs text-atlas-text-muted py-4 text-center">No items match this pack type</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {items.slice(0, 20).map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs px-2 py-1 rounded hover:bg-atlas-surface-hover/30">
                <span className="text-atlas-text-dim font-mono w-6 text-right">{i + 1}</span>
                <span className="text-atlas-text flex-1 truncate">{item.file}</span>
                <span className="text-atlas-text-dim">{item.category}</span>
              </div>
            ))}
            {items.length > 20 && (
              <div className="text-xs text-atlas-text-dim text-center py-1">
                +{items.length - 20} more items
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export */}
      <button onClick={handleExport} disabled={items.length === 0}
        className="flex items-center gap-2 rounded-xl bg-atlas-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
      >
        <Download className="h-4 w-4" /> Export Pack Manifest
      </button>
    </div>
  );
}
