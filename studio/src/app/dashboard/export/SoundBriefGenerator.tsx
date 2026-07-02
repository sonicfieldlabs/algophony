"use client";

import { useState } from "react";
import {
  FileText, Download, ChevronDown, ChevronRight, Sparkles,
  AlertTriangle, Check, Copy, Layers, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRIEF_INPUT_TYPES,
  generateSoundBrief,
  type SoundBrief, type BriefInputType,
} from "@/lib/sfx/brief-generator";

export function SoundBriefGenerator() {
  const [title, setTitle] = useState("");
  const [inputType, setInputType] = useState<BriefInputType>("scene_summary");
  const [inputText, setInputText] = useState("");
  const [brief, setBrief] = useState<SoundBrief | null>(null);
  const [copiedSection, setCopiedSection] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["style", "assets", "avoid"]));

  const inputDef = BRIEF_INPUT_TYPES.find((t) => t.id === inputType)!;

  const toggleSection = (s: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const handleGenerate = () => {
    if (!inputText.trim()) return;
    const result = generateSoundBrief(title || "Untitled Brief", inputType, inputText);
    setBrief(result);
    setExpandedSections(new Set(["style", "assets", "avoid", "palette", "layers", "export"]));
  };

  const copySection = async (label: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(""), 2000);
  };

  const handleExportBrief = () => {
    if (!brief) return;
    const content = JSON.stringify(brief, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `algophony_studio_brief_${brief.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Input panel */}
      <div className="atlas-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Sound Brief Generator</h3>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title (optional)"
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
        />

        {/* Input type selector */}
        <div>
          <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Input Type</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {BRIEF_INPUT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setInputType(t.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all",
                  inputType === t.id
                    ? "bg-atlas-accent/10 border-atlas-accent/30 text-atlas-accent"
                    : "bg-atlas-surface border-atlas-border-subtle text-atlas-text-muted hover:text-atlas-text"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text input */}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={inputDef.placeholder}
          rows={6}
          className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none resize-none font-mono"
        />

        <button
          onClick={handleGenerate}
          disabled={!inputText.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> Generate Brief
        </button>
      </div>

      {/* Generated brief */}
      {brief && (
        <div className="space-y-3">
          {/* Sonic Style */}
          <BriefSection
            title="Sonic Style" icon={<Sparkles className="h-3.5 w-3.5 text-atlas-accent" />}
            expanded={expandedSections.has("style")} onToggle={() => toggleSection("style")}
            onCopy={() => copySection("style", brief.sonicStyle)} copied={copiedSection === "style"}
          >
            <p className="text-xs text-atlas-text font-mono">{brief.sonicStyle}</p>
          </BriefSection>

          {/* Required Assets */}
          <BriefSection
            title={`Required Assets (${brief.requiredAssets.length})`}
            icon={<Target className="h-3.5 w-3.5 text-atlas-accent" />}
            expanded={expandedSections.has("assets")} onToggle={() => toggleSection("assets")}
            onCopy={() => copySection("assets", brief.requiredAssets.map((a) => `${a.name}: ${a.description} [${a.priority}] ×${a.variations}`).join("\n"))}
            copied={copiedSection === "assets"}
          >
            <div className="space-y-1">
              {brief.requiredAssets.map((asset) => (
                <div key={asset.name} className="flex items-center gap-2 py-1 border-b border-atlas-border-subtle/50 last:border-0">
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium uppercase",
                    asset.priority === "critical" ? "bg-red-400/10 text-red-400" :
                    asset.priority === "important" ? "bg-orange-400/10 text-orange-400" :
                    "bg-atlas-surface-hover text-atlas-text-dim"
                  )}>
                    {asset.priority}
                  </span>
                  <span className="text-xs text-atlas-text font-medium flex-1">{asset.name.replace(/_/g, " ")}</span>
                  <span className="text-xs text-atlas-text-dim">×{asset.variations}</span>
                  <span className="text-xs text-atlas-text-dim">{asset.durationRange}</span>
                  {asset.loopable && <span className="text-xs text-atlas-accent">LOOP</span>}
                </div>
              ))}
            </div>
          </BriefSection>

          {/* Avoid List */}
          <BriefSection
            title="Avoid List" icon={<AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
            expanded={expandedSections.has("avoid")} onToggle={() => toggleSection("avoid")}
            onCopy={() => copySection("avoid", brief.avoidList.join(", "))} copied={copiedSection === "avoid"}
          >
            <div className="flex flex-wrap gap-1.5">
              {brief.avoidList.map((a) => (
                <span key={a} className="rounded-md bg-red-400/5 border border-red-400/20 px-2 py-0.5 text-xs text-red-400">{a}</span>
              ))}
            </div>
          </BriefSection>

          {/* Palette */}
          <BriefSection
            title="Palette" icon={<Sparkles className="h-3.5 w-3.5 text-purple-400" />}
            expanded={expandedSections.has("palette")} onToggle={() => toggleSection("palette")}
            onCopy={() => copySection("palette", brief.palette.join(", "))} copied={copiedSection === "palette"}
          >
            <div className="flex flex-wrap gap-1.5">
              {brief.palette.map((p) => (
                <span key={p} className="rounded-md bg-purple-400/5 border border-purple-400/20 px-2 py-0.5 text-xs text-purple-400">{p}</span>
              ))}
            </div>
          </BriefSection>

          {/* Layer Map */}
          {brief.layerMap.length > 0 && (
            <BriefSection
              title="Layer Map" icon={<Layers className="h-3.5 w-3.5 text-atlas-accent" />}
              expanded={expandedSections.has("layers")} onToggle={() => toggleSection("layers")}
              onCopy={() => copySection("layers", JSON.stringify(brief.layerMap, null, 2))} copied={copiedSection === "layers"}
            >
              <div className="space-y-2">
                {brief.layerMap.map((lm) => (
                  <div key={lm.scene} className="rounded-lg bg-atlas-surface-hover/50 p-2">
                    <span className="text-xs text-atlas-text-dim font-medium uppercase">{lm.scene}</span>
                    <div className="space-y-0.5 mt-1">
                      {lm.layers.map((l) => (
                        <div key={l.role} className="text-xs text-atlas-text-muted">
                          <span className="text-atlas-accent">{l.role}:</span> {l.description}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </BriefSection>
          )}

          {/* Export + Cost */}
          <BriefSection
            title="Export Target" icon={<Download className="h-3.5 w-3.5 text-atlas-accent" />}
            expanded={expandedSections.has("export")} onToggle={() => toggleSection("export")}
            onCopy={() => copySection("export", brief.exportTarget)} copied={copiedSection === "export"}
          >
            <p className="text-xs text-atlas-text">{brief.exportTarget}</p>
            <p className="text-xs text-atlas-text-dim mt-1">Estimated credit cost: ~{brief.estimatedCreditCost} credits</p>
          </BriefSection>

          {/* Export brief */}
          <button
            onClick={handleExportBrief}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-atlas-border py-2.5 text-xs font-medium text-atlas-text-muted hover:text-atlas-text transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export Brief as JSON
          </button>
        </div>
      )}
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────

function BriefSection({
  title, icon, expanded, onToggle, onCopy, copied, children,
}: {
  title: string; icon: React.ReactNode; expanded: boolean;
  onToggle: () => void; onCopy: () => void; copied: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="atlas-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          {icon}
          <span className="text-xs font-semibold text-atlas-text">{title}</span>
          {expanded ? <ChevronDown className="h-3 w-3 text-atlas-text-dim" /> : <ChevronRight className="h-3 w-3 text-atlas-text-dim" />}
        </button>
        <button onClick={onCopy} className="text-xs text-atlas-accent hover:underline flex items-center gap-1">
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {expanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
