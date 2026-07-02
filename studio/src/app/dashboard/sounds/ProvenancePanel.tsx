"use client";

import { useState, useRef } from "react";
import {
  X, Copy, Check, Hash, Clock, Coins, Sliders,
  FileText, Music, Tag, AlertTriangle, Fingerprint,
  ChevronDown, ChevronRight, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

export interface ProvenanceGeneration {
  id: string;
  prompt_card_id: string | null;
  project_id: string | null;
  status: string;
  request_payload: Record<string, unknown>;
  elevenlabs_model_id: string | null;
  audio_storage_path: string | null;
  audio_signed_url: string | null;
  duration_seconds: number | null;
  output_format: string | null;
  character_cost: number | null;
  app_credit_cost: number;
  error_message: string | null;
  api_route: string;
  request_id: string | null;
  user_verdict: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProvenancePanelProps {
  generation: ProvenanceGeneration;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  favorite: { bg: "bg-green-400/10", text: "text-green-400", label: "Favorite" },
  usable: { bg: "bg-blue-400/10", text: "text-blue-400", label: "Usable" },
  needs_retry: { bg: "bg-orange-400/10", text: "text-orange-400", label: "Needs Retry" },
  rejected: { bg: "bg-red-400/10", text: "text-red-400", label: "Rejected" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  succeeded: { bg: "bg-green-400/10", text: "text-green-400" },
  failed: { bg: "bg-red-400/10", text: "text-red-400" },
  pending: { bg: "bg-yellow-400/10", text: "text-yellow-400" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Provenance Panel Component ───────────────────────────────

export function ProvenancePanel({ generation: gen, onClose }: ProvenancePanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["prompt", "settings", "cost", "identity"])
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Extract values from request_payload
  const payload = gen.request_payload ?? {};
  const originalPrompt = String(payload.text ?? "—");
  const exclusions = Array.isArray(payload.exclusion_constraints)
    ? (payload.exclusion_constraints as string[])
    : [];
  const promptInfluence = payload.prompt_influence as number | undefined;
  const loop = payload.loop as boolean | undefined;
  const requestedDuration = payload.duration_seconds as number | undefined;
  const requestedFormat = payload.output_format as string | undefined;
  const requestedModel = payload.model_id as string | undefined;

  // Extract metadata
  const meta = gen.metadata ?? {};
  const scene = meta.scene as string | undefined;
  const cue = meta.cueId as string | undefined;
  const version = meta.version as number | undefined;
  const batchType = meta.batchType as string | undefined;
  const category = (payload.category as string) ?? (meta.category as string);

  const statusStyle = STATUS_STYLES[gen.status] ?? STATUS_STYLES.pending;
  const verdictStyle = gen.user_verdict ? VERDICT_STYLES[gen.user_verdict] : null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-atlas-bg border-l border-atlas-border shadow-2xl overflow-y-auto animate-slide-in-right"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-atlas-bg/95 backdrop-blur-sm border-b border-atlas-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-atlas-accent" />
            <h2 className="text-sm font-bold text-atlas-text">Prompt Provenance</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-atlas-text-dim hover:text-atlas-text hover:bg-atlas-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusStyle.bg, statusStyle.text)}>
            {gen.status}
          </span>
          {verdictStyle && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", verdictStyle.bg, verdictStyle.text)}>
              {verdictStyle.label}
            </span>
          )}
          {category && (
            <span className="rounded-full bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text-dim">
              {category}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-1">
        {/* ── Prompt Chain ──────────────────────────────── */}
        <ProvenanceSection
          id="prompt"
          title="Prompt Chain"
          icon={<FileText className="h-3.5 w-3.5" />}
          expanded={expandedSections.has("prompt")}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            {/* Original prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Prompt Text</span>
                <CopyButton
                  text={originalPrompt}
                  field="prompt"
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              </div>
              <div className="rounded-lg bg-atlas-surface-hover/50 border border-atlas-border-subtle px-3 py-2 text-xs text-atlas-text font-mono leading-relaxed">
                {originalPrompt}
              </div>
            </div>

            {/* Exclusion constraints */}
            {exclusions.length > 0 && (
              <div>
                <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Exclusions</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {exclusions.map((ex) => (
                    <span key={ex} className="rounded-md bg-red-500/5 border border-red-500/10 px-2 py-0.5 text-xs text-red-400">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {gen.error_message && (
              <div>
                <span className="text-xs text-red-400 font-medium uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> Error
                </span>
                <div className="mt-1 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2 text-xs text-red-400 font-mono">
                  {gen.error_message}
                </div>
              </div>
            )}

            {/* Failure reason */}
            {gen.failure_reason && (
              <div>
                <span className="text-xs text-orange-400 font-medium uppercase tracking-wider">Failure Reason</span>
                <div className="mt-1 rounded-lg bg-orange-400/5 border border-orange-400/10 px-3 py-2 text-xs text-orange-400">
                  {gen.failure_reason}
                </div>
              </div>
            )}
          </div>
        </ProvenanceSection>

        {/* ── Generation Settings ───────────────────────── */}
        <ProvenanceSection
          id="settings"
          title="Generation Settings"
          icon={<Sliders className="h-3.5 w-3.5" />}
          expanded={expandedSections.has("settings")}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <MetadataField label="Model" value={gen.elevenlabs_model_id ?? requestedModel ?? "—"} mono />
            <MetadataField label="Duration" value={gen.duration_seconds != null ? `${gen.duration_seconds}s` : requestedDuration != null ? `${requestedDuration}s (req)` : "—"} />
            <MetadataField label="Prompt Influence" value={promptInfluence != null ? String(promptInfluence) : "—"} highlight={promptInfluence != null} />
            <MetadataField label="Loop" value={loop != null ? (loop ? "Yes" : "No") : "—"} />
            <MetadataField label="Output Format" value={gen.output_format ?? requestedFormat ?? "—"} mono />
            <MetadataField label="API Route" value={gen.api_route ?? "—"} mono />
          </div>
        </ProvenanceSection>

        {/* ── Cost & Usage ──────────────────────────────── */}
        <ProvenanceSection
          id="cost"
          title="Cost & Usage"
          icon={<Coins className="h-3.5 w-3.5" />}
          expanded={expandedSections.has("cost")}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <MetadataField label="Character Cost" value={gen.character_cost != null ? String(gen.character_cost) : "—"} />
            <MetadataField label="Credit Cost" value={`${gen.app_credit_cost} credit${gen.app_credit_cost !== 1 ? "s" : ""}`} highlight />
            <MetadataField label="User Verdict" value={gen.user_verdict ?? "Not rated"} />
            <MetadataField label="Final Status" value={gen.status} />
          </div>
        </ProvenanceSection>

        {/* ── Identity & Lineage ─────────────────────────── */}
        <ProvenanceSection
          id="identity"
          title="Identity & Lineage"
          icon={<Hash className="h-3.5 w-3.5" />}
          expanded={expandedSections.has("identity")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            <MetadataFieldFull label="Generation ID" value={gen.id} mono copyable onCopy={copyToClipboard} copiedField={copiedField} />
            <MetadataFieldFull label="Request ID" value={gen.request_id ?? "—"} mono copyable onCopy={copyToClipboard} copiedField={copiedField} />
            <MetadataFieldFull label="Prompt Card" value={gen.prompt_card_id ?? "None"} mono copyable={!!gen.prompt_card_id} onCopy={copyToClipboard} copiedField={copiedField} />
            <MetadataFieldFull label="Project" value={gen.project_id ?? "None"} mono copyable={!!gen.project_id} onCopy={copyToClipboard} copiedField={copiedField} />
            {scene && <MetadataFieldFull label="Scene" value={scene} onCopy={copyToClipboard} copiedField={copiedField} />}
            {cue && <MetadataFieldFull label="Cue" value={cue} mono onCopy={copyToClipboard} copiedField={copiedField} />}
            {version != null && <MetadataFieldFull label="Version" value={String(version)} onCopy={copyToClipboard} copiedField={copiedField} />}
            {batchType && <MetadataFieldFull label="Batch Type" value={batchType} onCopy={copyToClipboard} copiedField={copiedField} />}
          </div>
        </ProvenanceSection>

        {/* ── Timestamps ──────────────────────────────────── */}
        <ProvenanceSection
          id="timestamps"
          title="Timestamps"
          icon={<Clock className="h-3.5 w-3.5" />}
          expanded={expandedSections.has("timestamps")}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-1 gap-2">
            <MetadataField label="Created" value={formatDate(gen.created_at)} />
            <MetadataField label="Updated" value={formatDate(gen.updated_at)} />
          </div>
        </ProvenanceSection>

        {/* ── Storage ─────────────────────────────────────── */}
        {gen.audio_storage_path && (
          <ProvenanceSection
            id="storage"
            title="Storage"
            icon={<Music className="h-3.5 w-3.5" />}
            expanded={expandedSections.has("storage")}
            onToggle={toggleSection}
          >
            <MetadataFieldFull label="Storage Path" value={gen.audio_storage_path} mono copyable onCopy={copyToClipboard} copiedField={copiedField} />
            {gen.audio_signed_url && (
              <div className="mt-2">
                <span className="text-xs text-atlas-text-dim font-medium">Audio Preview</span>
                <audio controls src={gen.audio_signed_url} className="w-full h-8 mt-1" preload="none" />
              </div>
            )}
          </ProvenanceSection>
        )}

        {/* ── Raw Payload ─────────────────────────────────── */}
        <ProvenanceSection
          id="raw"
          title="Raw Request Payload"
          icon={<Layers className="h-3.5 w-3.5" />}
          expanded={expandedSections.has("raw")}
          onToggle={toggleSection}
        >
          <div className="relative">
            <CopyButton
              text={JSON.stringify(payload, null, 2)}
              field="raw_payload"
              copiedField={copiedField}
              onCopy={copyToClipboard}
              className="absolute top-2 right-2 z-10"
            />
            <pre className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-3 text-xs text-atlas-text-muted overflow-auto max-h-48 font-mono whitespace-pre-wrap">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </ProvenanceSection>

        {/* ── Raw Metadata ─────────────────────────────────── */}
        {Object.keys(meta).length > 0 && (
          <ProvenanceSection
            id="raw_meta"
            title="Raw Metadata"
            icon={<Tag className="h-3.5 w-3.5" />}
            expanded={expandedSections.has("raw_meta")}
            onToggle={toggleSection}
          >
            <div className="relative">
              <CopyButton
                text={JSON.stringify(meta, null, 2)}
                field="raw_metadata"
                copiedField={copiedField}
                onCopy={copyToClipboard}
                className="absolute top-2 right-2 z-10"
              />
              <pre className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-3 text-xs text-atlas-text-muted overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </div>
          </ProvenanceSection>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function ProvenanceSection({
  id, title, icon, expanded, onToggle, children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-atlas-border-subtle overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-atlas-surface-hover/30 transition-colors"
      >
        <span className="text-atlas-accent">{icon}</span>
        <span className="text-xs font-semibold text-atlas-text flex-1">{title}</span>
        {expanded ? <ChevronDown className="h-3 w-3 text-atlas-text-dim" /> : <ChevronRight className="h-3 w-3 text-atlas-text-dim" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-atlas-border-subtle">
          {children}
        </div>
      )}
    </div>
  );
}

function MetadataField({
  label, value, mono = false, highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">{label}</span>
      <div className={cn(
        "text-xs mt-0.5",
        mono ? "font-mono" : "",
        highlight ? "text-atlas-accent font-medium" : "text-atlas-text"
      )}>
        {value}
      </div>
    </div>
  );
}

function MetadataFieldFull({
  label, value, mono = false, copyable = false, onCopy, copiedField,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-atlas-border-subtle/50 last:border-0">
      <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider shrink-0 w-24">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={cn(
          "text-xs truncate",
          mono ? "font-mono text-atlas-text-muted" : "text-atlas-text"
        )}>
          {value}
        </span>
        {copyable && value !== "None" && value !== "—" && (
          <CopyButton text={value} field={label} copiedField={copiedField} onCopy={onCopy} />
        )}
      </div>
    </div>
  );
}

function CopyButton({
  text, field, copiedField, onCopy, className = "",
}: {
  text: string;
  field: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCopy(text, field); }}
      className={cn(
        "rounded p-1 text-atlas-text-dim hover:text-atlas-accent transition-colors",
        className
      )}
      title="Copy to clipboard"
    >
      {copiedField === field ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
    </button>
  );
}
