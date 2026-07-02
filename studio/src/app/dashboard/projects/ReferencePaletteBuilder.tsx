"use client";

import { useState } from "react";
import {
  Palette, Plus, X, ChevronDown, ChevronRight, Copy, Check,
  Trash2, Sparkles, Shield,
} from "lucide-react";
import {
  type PaletteReference, type PaletteRefType, type SonicPalette,
  PALETTE_REF_TYPES,
  buildSonicPalette, loadPalettes, savePalette, deletePalette,
} from "@/lib/sfx/palette-builder";

export function ReferencePaletteBuilder() {
  const [palettes, setPalettes] = useState<SonicPalette[]>(loadPalettes);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [references, setReferences] = useState<PaletteReference[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedDna, setCopiedDna] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Add reference
  const addRef = (type: PaletteRefType) => {
    setReferences((prev) => [...prev, {
      id: crypto.randomUUID(),
      type,
      label: "",
      description: "",
      keywords: [],
    }]);
  };

  const updateRef = (id: string, patch: Partial<PaletteReference>) => {
    setReferences((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRef = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  const handleBuild = () => {
    if (!name.trim() || references.length === 0) return;
    const palette = buildSonicPalette(name, references, notes);
    savePalette(palette);
    setPalettes(loadPalettes());
    setName("");
    setNotes("");
    setReferences([]);
    setShowBuilder(false);
    setExpanded(palette.id);
  };

  const handleDelete = (id: string) => {
    deletePalette(id);
    setPalettes(loadPalettes());
    if (expanded === id) setExpanded(null);
  };

  const copyDna = async (dna: string) => {
    await navigator.clipboard.writeText(dna);
    setCopiedDna(true);
    setTimeout(() => setCopiedDna(false), 2000);
  };

  return (
    <div className="atlas-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-atlas-border-subtle">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Sonic Palettes</h3>
          <span className="text-xs text-atlas-text-dim">{palettes.length}</span>
        </div>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-all"
        >
          <Plus className="h-3 w-3" /> New Palette
        </button>
      </div>

      {/* Builder */}
      {showBuilder && (
        <div className="border-b border-atlas-border-subtle p-4 space-y-3 bg-atlas-surface-hover/30">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Palette name (e.g. Luxury App, Horror Forest, Sci-Fi Bridge)"
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
          />

          {/* Reference type picker */}
          <div>
            <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Add References</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {PALETTE_REF_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => addRef(rt.id)}
                  className="rounded-lg px-2.5 py-1.5 text-xs border border-atlas-border-subtle bg-atlas-surface text-atlas-text-muted hover:text-atlas-text hover:border-atlas-border transition-all"
                >
                  {rt.icon} {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference entries */}
          {references.map((ref) => {
            const rtDef = PALETTE_REF_TYPES.find((r) => r.id === ref.type);
            return (
              <div key={ref.id} className="rounded-xl border border-atlas-border-subtle p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-atlas-text">{rtDef?.icon} {rtDef?.label}</span>
                  <button onClick={() => removeRef(ref.id)} className="text-atlas-text-dim hover:text-red-400"><X className="h-3 w-3" /></button>
                </div>
                <input
                  value={ref.label}
                  onChange={(e) => updateRef(ref.id, { label: e.target.value })}
                  placeholder="Label (e.g. Apple Watch tap sounds)"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
                />
                <textarea
                  value={ref.description}
                  onChange={(e) => updateRef(ref.id, { description: e.target.value })}
                  placeholder="Describe the reference: cold, glassy, minimal, premium..."
                  rows={2}
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none"
                />
                <input
                  value={ref.keywords.join(", ")}
                  onChange={(e) => updateRef(ref.id, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                  placeholder="Keywords (comma-separated): glassy, warm, close-mic, minimal"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-2.5 py-1.5 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
                />
              </div>
            );
          })}

          {/* Additional notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about the sonic direction..."
            rows={2}
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none"
          />

          <button
            onClick={handleBuild}
            disabled={!name.trim() || references.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> Build Palette ({references.length} references)
          </button>
        </div>
      )}

      {/* Saved palettes */}
      <div className="divide-y divide-atlas-border-subtle">
        {palettes.length === 0 && !showBuilder && (
          <div className="p-8 text-center text-xs text-atlas-text-dim">
            No palettes yet. Create one from your references.
          </div>
        )}

        {palettes.map((palette) => {
          const isExpanded = expanded === palette.id;
          return (
            <div key={palette.id}>
              <button
                onClick={() => setExpanded(isExpanded ? null : palette.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-atlas-surface-hover/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-left">
                  <Palette className="h-3.5 w-3.5 text-atlas-accent shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-atlas-text">{palette.name}</span>
                    <p className="text-xs text-atlas-text-dim">{palette.references.length} refs · {palette.suggestedCategories.length} categories</p>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-dim" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Sonic DNA */}
                  <div className="rounded-xl border border-atlas-accent/20 bg-atlas-accent/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-atlas-accent font-medium uppercase tracking-wider">Sonic DNA</span>
                      <button onClick={() => copyDna(palette.sonicDna)} className="text-xs text-atlas-accent hover:underline flex items-center gap-1">
                        {copiedDna ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                        {copiedDna ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-xs text-atlas-text font-mono">{palette.sonicDna}</p>
                  </div>

                  {/* Vocabulary */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(palette.vocabulary).map(([dim, words]) => (
                      words.length > 0 && (
                        <div key={dim} className="rounded-lg bg-atlas-surface-hover/50 p-2">
                          <span className="text-xs text-atlas-text-dim font-medium uppercase">{dim}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(words as string[]).map((w) => (
                              <span key={w} className="rounded bg-atlas-accent/10 px-1.5 py-0.5 text-xs text-atlas-accent">{w}</span>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>

                  {/* Do / Don't */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-3">
                      <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Do</span>
                      <ul className="mt-1.5 space-y-1">
                        {palette.doList.map((d, i) => (
                          <li key={i} className="text-xs text-atlas-text flex items-start gap-1.5">
                            <Check className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3">
                      <span className="text-xs text-red-400 font-medium uppercase tracking-wider">Don&apos;t</span>
                      <ul className="mt-1.5 space-y-1">
                        {palette.dontList.map((d, i) => (
                          <li key={i} className="text-xs text-atlas-text flex items-start gap-1.5">
                            <X className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Prompt Templates */}
                  {palette.promptTemplates.length > 0 && (
                    <div className="rounded-xl border border-atlas-border-subtle p-3">
                      <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Prompt Templates</span>
                      <div className="mt-1.5 space-y-1">
                        {palette.promptTemplates.map((t, i) => (
                          <code key={i} className="block text-xs text-atlas-text-muted bg-atlas-bg rounded px-2 py-1 font-mono">{t}</code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exclusion constraints */}
                  {palette.exclusionConstraints.length > 0 && (
                    <div className="rounded-xl border border-atlas-border-subtle p-3">
                      <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider flex items-center gap-1"><Shield className="h-3 w-3" /> Exclusion Constraints</span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {palette.exclusionConstraints.map((c) => (
                          <span key={c} className="rounded-md bg-red-400/5 border border-red-400/20 px-2 py-0.5 text-xs text-red-400">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories + Variation Strategies */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-atlas-border-subtle p-3">
                      <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Categories</span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {palette.suggestedCategories.map((c) => (
                          <span key={c} className="rounded bg-atlas-surface-hover px-1.5 py-0.5 text-xs text-atlas-text-muted">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-atlas-border-subtle p-3">
                      <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Variation Strategies</span>
                      <ul className="mt-1.5 space-y-0.5">
                        {palette.variationStrategies.map((v, i) => (
                          <li key={i} className="text-xs text-atlas-text-muted">{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => handleDelete(palette.id)} className="flex items-center gap-1.5 text-xs text-red-400 hover:underline">
                    <Trash2 className="h-3 w-3" /> Delete Palette
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
