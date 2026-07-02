"use client";

import { useState } from "react";
import {
  LayoutTemplate, ChevronDown, ChevronRight, Zap,
  Layers, Download, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SOUND_SYSTEM_TEMPLATES,
  getTemplateSummary,
  templateToStackerPayload,
  type SoundSystemTemplate,
} from "@/lib/sfx/system-templates";

interface SystemTemplatePickerProps {
  onApply: (payload: Record<string, unknown>, template: SoundSystemTemplate) => void;
}

export function SystemTemplatePicker({ onApply }: SystemTemplatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const selected = SOUND_SYSTEM_TEMPLATES.find((t) => t.id === selectedId);
  const summary = selected ? getTemplateSummary(selected) : null;

  const handleApply = () => {
    if (!selected) return;
    const payload = templateToStackerPayload(selected);
    onApply(payload, selected);
  };

  const handleExportTemplate = () => {
    if (!selected) return;
    const content = JSON.stringify(templateToStackerPayload(selected), null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `algophony_studio_template_${selected.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="atlas-card overflow-hidden">
      <div className="px-4 py-3 border-b border-atlas-border-subtle flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-atlas-accent" />
        <h3 className="text-sm font-semibold text-atlas-text">Sound System Templates</h3>
        <span className="text-xs text-atlas-text-dim ml-auto">{SOUND_SYSTEM_TEMPLATES.length} templates</span>
      </div>

      {/* Template grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {SOUND_SYSTEM_TEMPLATES.map((template) => {
          const tmplSummary = getTemplateSummary(template);
          const isSelected = selectedId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => {
                setSelectedId(isSelected ? null : template.id);
                setExpandedTemplate(null);
              }}
              className={cn(
                "flex flex-col items-start rounded-xl p-3 text-left transition-all border",
                isSelected
                  ? "border-atlas-accent bg-atlas-accent/5 shadow-sm shadow-atlas-accent/10"
                  : "border-atlas-border-subtle bg-atlas-surface hover:border-atlas-border"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{template.icon}</span>
                <span className={cn("text-xs font-semibold", isSelected ? "text-atlas-accent" : "text-atlas-text")}>{template.name}</span>
              </div>
              <p className="text-xs text-atlas-text-dim leading-tight mb-2">{template.description}</p>
              <div className="flex items-center gap-3 text-xs text-atlas-text-dim mt-auto">
                <span>~{tmplSummary.totalAssets} assets</span>
                <span>~{template.estimatedCredits} provider calls</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected template detail */}
      {selected && summary && (
        <div className="border-t border-atlas-border-subtle p-4 space-y-3">
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-atlas-surface-hover/50 p-2.5 text-center">
              <div className="text-lg font-bold text-atlas-accent tabular-nums">{summary.totalAssets}</div>
              <div className="text-xs text-atlas-text-dim">Total Assets</div>
            </div>
            <div className="rounded-lg bg-atlas-surface-hover/50 p-2.5 text-center">
              <div className="text-lg font-bold text-atlas-text tabular-nums">{summary.totalCategories}</div>
              <div className="text-xs text-atlas-text-dim">Categories</div>
            </div>
            <div className="rounded-lg bg-atlas-surface-hover/50 p-2.5 text-center">
              <div className="text-lg font-bold text-atlas-text tabular-nums">{summary.promptCardCount}</div>
              <div className="text-xs text-atlas-text-dim">Prompt Cards</div>
            </div>
            <div className="rounded-lg bg-atlas-surface-hover/50 p-2.5 text-center">
              <div className="text-lg font-bold text-orange-400 tabular-nums">~{selected.estimatedCredits}</div>
              <div className="text-xs text-atlas-text-dim">Provider Calls</div>
            </div>
          </div>

          {/* Sonic style + avoid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-atlas-accent/20 bg-atlas-accent/5 p-3">
              <span className="text-xs text-atlas-accent font-medium uppercase tracking-wider">Sonic Style</span>
              <p className="text-xs text-atlas-text mt-1">{selected.sonicStyle}</p>
            </div>
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3">
              <span className="text-xs text-red-400 font-medium uppercase tracking-wider">Avoid</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selected.avoidList.map((a) => (
                  <span key={a} className="text-xs text-red-400">{a}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="rounded-xl border border-atlas-border-subtle overflow-hidden">
            <button
              onClick={() => setExpandedTemplate(expandedTemplate === "categories" ? null : "categories")}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-atlas-surface-hover/30 transition-colors"
            >
              <span className="text-xs font-semibold text-atlas-text flex items-center gap-1.5"><Layers className="h-3 w-3 text-atlas-accent" /> Categories ({selected.categories.length})</span>
              {expandedTemplate === "categories" ? <ChevronDown className="h-3 w-3 text-atlas-text-dim" /> : <ChevronRight className="h-3 w-3 text-atlas-text-dim" />}
            </button>
            {expandedTemplate === "categories" && (
              <div className="border-t border-atlas-border-subtle px-3 py-2 space-y-1">
                {selected.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 py-1 border-b border-atlas-border-subtle/50 last:border-0">
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium uppercase shrink-0",
                      cat.priority === "critical" ? "bg-red-400/10 text-red-400" :
                      cat.priority === "important" ? "bg-orange-400/10 text-orange-400" :
                      "bg-atlas-surface-hover text-atlas-text-dim"
                    )}>
                      {cat.priority}
                    </span>
                    <span className="text-xs text-atlas-text font-medium flex-1">{cat.name}</span>
                    <span className="text-xs text-atlas-text-dim">{cat.assetCount} × {cat.variationsPerAsset}</span>
                    <span className="text-xs text-atlas-text-dim">{cat.durationRange}</span>
                    {cat.loopable && <span className="text-xs text-atlas-accent">LOOP</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Cards */}
          <div className="rounded-xl border border-atlas-border-subtle overflow-hidden">
            <button
              onClick={() => setExpandedTemplate(expandedTemplate === "prompts" ? null : "prompts")}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-atlas-surface-hover/30 transition-colors"
            >
              <span className="text-xs font-semibold text-atlas-text flex items-center gap-1.5"><BookOpen className="h-3 w-3 text-atlas-accent" /> Prompt Cards ({selected.promptCards.length})</span>
              {expandedTemplate === "prompts" ? <ChevronDown className="h-3 w-3 text-atlas-text-dim" /> : <ChevronRight className="h-3 w-3 text-atlas-text-dim" />}
            </button>
            {expandedTemplate === "prompts" && (
              <div className="border-t border-atlas-border-subtle px-3 py-2 space-y-2">
                {selected.promptCards.map((card) => (
                  <div key={card.title} className="rounded-lg bg-atlas-surface-hover/50 p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-atlas-text font-semibold">{card.title}</span>
                      <span className="text-xs bg-atlas-surface-hover text-atlas-text-dim rounded px-1">{card.category}</span>
                      <span className="text-xs text-atlas-text-dim ml-auto">{card.durationTarget}s × {card.variations}</span>
                    </div>
                    <p className="text-xs text-atlas-text-muted font-mono leading-relaxed">{card.prompt}</p>
                    {card.exclusions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {card.exclusions.map((e) => (
                          <span key={e} className="text-xs text-red-400 bg-red-400/5 rounded px-1">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export rules */}
          <div className="rounded-lg bg-atlas-surface-hover/50 p-2.5 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-atlas-text-dim">Format:</span>
              <span className="text-atlas-text ml-1">{selected.exportRules.preferredFormat}</span>
            </div>
            <div>
              <span className="text-atlas-text-dim">DAW:</span>
              <span className="text-atlas-text ml-1">{selected.exportRules.dawPreset}</span>
            </div>
            <div>
              <span className="text-atlas-text-dim">Naming:</span>
              <span className="text-atlas-text ml-1 font-mono">{selected.exportRules.namingConvention}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all"
            >
              <Zap className="h-4 w-4" /> Apply Template
            </button>
            <button
              onClick={handleExportTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-atlas-border px-4 py-2.5 text-xs font-medium text-atlas-text-muted hover:text-atlas-text transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
