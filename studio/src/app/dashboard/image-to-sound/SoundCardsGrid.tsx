"use client";

import { SoundCard, LAYER_ROLES } from "@/lib/sfx/image-to-sound-taxonomy";
import { Trash2, Copy, PlayCircle } from "lucide-react";

interface SoundCardsGridProps {
  cards: SoundCard[];
  onUpdateCard: (id: string, updates: Partial<SoundCard>) => void;
  onRemoveCard: (id: string) => void;
  onDuplicateCard: (id: string) => void;
}

export function SoundCardsGrid({ cards, onUpdateCard, onRemoveCard, onDuplicateCard }: SoundCardsGridProps) {
  if (cards.length === 0) return null;

  return (
    <div className="space-y-4 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-atlas-text">Prompt Cards</h2>
        <span className="text-xs text-atlas-text-dim">
          {cards.filter(c => c.selected).length} selected for generation
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-stagger>
        {cards.map((card) => {
          const roleDef = LAYER_ROLES.find((r) => r.id === card.layerRole);
          const roleColor = roleDef?.color ?? "var(--color-atlas-text-dim)";

          return (
            <div
              key={card.id}
              className={`
                atlas-card flex flex-col p-4 transition-all
                ${card.selected ? "border-atlas-accent/50 shadow-atlas-glow" : "border-atlas-border-subtle opacity-70"}
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={card.selected}
                    onChange={(e) => onUpdateCard(card.id, { selected: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-atlas-border text-atlas-accent focus:ring-atlas-accent focus:ring-offset-atlas-bg"
                  />
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => onUpdateCard(card.id, { title: e.target.value })}
                    className="text-xs font-semibold text-atlas-text bg-transparent border-none p-0 focus:ring-0 w-32 md:w-48 placeholder:text-atlas-text-dim"
                    placeholder="Card Title"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                  >
                    {roleDef?.label || card.layerRole}
                  </span>
                  <div className="h-3 w-px bg-atlas-border-subtle" />
                  <button onClick={() => onDuplicateCard(card.id)} className="text-atlas-text-dim hover:text-atlas-text transition-colors p-1" title="Duplicate">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onRemoveCard(card.id)} className="text-atlas-text-dim hover:text-atlas-danger transition-colors p-1" title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Source visual */}
              {card.visualSource && (
                <div className="text-xs text-atlas-text-dim mb-2 flex items-center gap-1">
                  <span className="font-semibold uppercase tracking-wider">Source:</span>
                  <span className="truncate">{card.visualSource}</span>
                </div>
              )}

              {/* Prompt Editor */}
              <textarea
                value={card.prompt}
                onChange={(e) => onUpdateCard(card.id, { prompt: e.target.value })}
                className="w-full bg-atlas-surface-hover border border-atlas-border rounded-lg p-2.5 text-xs text-atlas-text font-medium resize-none focus:ring-1 focus:ring-atlas-accent mb-3"
                rows={3}
                placeholder="ElevenLabs prompt..."
              />

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-3 border-t border-atlas-border-subtle">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-atlas-text-dim font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={card.loop}
                      onChange={(e) => onUpdateCard(card.id, { loop: e.target.checked })}
                      className="h-3 w-3 rounded border-atlas-border text-atlas-accent focus:ring-atlas-accent"
                    />
                    Loop
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-atlas-text-dim font-medium">Dur</span>
                    <select
                      value={card.durationSeconds}
                      onChange={(e) => onUpdateCard(card.id, { durationSeconds: Number(e.target.value) })}
                      className="bg-transparent border-none text-xs text-atlas-text p-0 pr-4 focus:ring-0 cursor-pointer"
                    >
                      <option value="1">1s</option>
                      <option value="2">2s</option>
                      <option value="4">4s</option>
                      <option value="8">8s</option>
                      <option value="15">15s</option>
                      <option value="30">30s (Max)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-atlas-text-dim font-medium">Inf</span>
                    <select
                      value={card.promptInfluence}
                      onChange={(e) => onUpdateCard(card.id, { promptInfluence: Number(e.target.value) })}
                      className="bg-transparent border-none text-xs text-atlas-text p-0 pr-4 focus:ring-0 cursor-pointer"
                    >
                      <option value="0.1">0.1 (Wild)</option>
                      <option value="0.3">0.3 (Default)</option>
                      <option value="0.5">0.5</option>
                      <option value="0.8">0.8</option>
                      <option value="1.0">1.0 (Strict)</option>
                    </select>
                  </div>
                </div>

                {card.status === "generated" && card.audioUrl && (
                  <div className="flex items-center gap-1 text-xs font-medium text-atlas-success">
                    <PlayCircle className="h-3.5 w-3.5" /> Generated
                  </div>
                )}
                {card.status === "generating" && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-atlas-accent">
                    <div className="flex items-end gap-[1px] h-2.5">
                      <div className="waveform-bar" />
                      <div className="waveform-bar" />
                      <div className="waveform-bar" />
                    </div>
                    Generating...
                  </div>
                )}
                {card.status === "failed" && (
                  <div className="text-xs font-medium text-atlas-danger truncate max-w-[100px]">
                    {card.errorMessage || "Failed"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
