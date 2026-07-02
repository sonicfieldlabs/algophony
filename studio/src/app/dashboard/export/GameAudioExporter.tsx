"use client";

import { useState, useMemo } from "react";
import { Gamepad2, Download, Plus, Trash2, Code, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type GameEngine } from "@/lib/sfx/export-taxonomy";
import { buildJsonExport } from "@/lib/sfx/export-builders";
import {
  type ImplementationEvent, type ImplementationType,
  IMPLEMENTATION_TYPES, IMPLEMENTATION_TYPE_LABELS,
  inferEventStructure, buildImplementationPack,
  buildWwiseSoundBankXml, buildFmodBankManifest,
  buildUnityAudioManifest, buildUnrealSoundCueManifest,
} from "@/lib/game-audio/implementation-pack";

const ENGINES: Array<{ id: GameEngine; label: string; color: string }> = [
  { id: "wwise", label: "Wwise", color: "#00B4D8" },
  { id: "fmod", label: "FMOD", color: "#FF6B35" },
  { id: "unity", label: "Unity", color: "#7C7C7C" },
  { id: "unreal", label: "Unreal", color: "#2563EB" },
  { id: "custom", label: "Custom", color: "#8B5CF6" },
];

const PREVIEW_TABS = ["manifest", "wwise", "fmod", "unity", "unreal"] as const;
type PreviewTab = (typeof PREVIEW_TABS)[number];

interface GameAudioExporterProps {
  cards: Record<string, unknown>[];
  generations: Record<string, unknown>[];
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function GameAudioExporter({ cards, generations: _generations }: GameAudioExporterProps) {
  const [engine, setEngine] = useState<GameEngine>("wwise");
  const [projectName, setProjectName] = useState("ExampleGame");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("manifest");
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  // Auto-infer events from cards
  const [events, setEvents] = useState<ImplementationEvent[]>(() =>
    inferEventStructure(cards)
  );

  // Build pack
  const pack = useMemo(
    () => buildImplementationPack(projectName, engine, events),
    [projectName, engine, events]
  );

  // Preview content per tab
  const previewContent = useMemo(() => {
    switch (previewTab) {
      case "manifest": return buildJsonExport(pack);
      case "wwise": return buildWwiseSoundBankXml(pack);
      case "fmod": return buildJsonExport(buildFmodBankManifest(pack));
      case "unity": return buildJsonExport(buildUnityAudioManifest(pack));
      case "unreal": return buildJsonExport(buildUnrealSoundCueManifest(pack));
    }
  }, [pack, previewTab]);

  const handleRemoveEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
    if (expandedEvent === index) setExpandedEvent(null);
  };

  const handleAddEvent = () => {
    setEvents((prev) => [
      ...prev,
      {
        eventPath: "new/event",
        displayName: "New Event",
        category: "misc",
        implementationType: "single",
        randomization: false,
        noRepeat: false,
        maxInstances: 4,
        cooldownMs: 0,
        priority: 50,
        variations: [{ file: "new_sound_01.mp3", label: "Variation 1" }],
        parameters: {},
        rtpcSuggestions: [],
        metadata: {},
      },
    ]);
  };

  const handleUpdateEvent = (index: number, updates: Partial<ImplementationEvent>) => {
    setEvents((prev) => prev.map((e, i) => i === index ? { ...e, ...updates } : e));
  };

  const handleExport = () => {
    const ext = previewTab === "wwise" ? "xml" : "json";
    const filename = `${projectName}_${previewTab === "manifest" ? "implementation_pack" : previewTab}.${ext}`;
    const mime = previewTab === "wwise" ? "application/xml" : "application/json";
    downloadFile(previewContent, filename, mime);
  };

  return (
    <div className="space-y-4">
      {/* Engine + Project */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Game Audio Implementation Pack</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-atlas-text-dim mb-1.5 block">Target Middleware</label>
            <div className="flex gap-1.5 flex-wrap">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEngine(e.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-medium transition-all border",
                    engine === e.id
                      ? "text-white border-transparent"
                      : "bg-atlas-surface-hover border-atlas-border-subtle text-atlas-text-muted hover:text-atlas-text"
                  )}
                  style={engine === e.id ? { background: e.color } : undefined}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-atlas-text-dim mb-1.5 block">Project Name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="atlas-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-atlas-text">
            Implementation Events ({events.length})
          </h3>
          <button
            onClick={handleAddEvent}
            className="flex items-center gap-1 text-xs text-atlas-accent hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Event
          </button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {events.map((event, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border transition-all",
                expandedEvent === i ? "border-atlas-accent bg-atlas-accent/5" : "border-atlas-border-subtle hover:border-atlas-border"
              )}
            >
              {/* Event row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button
                  onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                  className="text-atlas-text-dim hover:text-atlas-text"
                >
                  {expandedEvent === i ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                  <input
                    value={event.eventPath}
                    onChange={(e) => handleUpdateEvent(i, { eventPath: e.target.value })}
                    className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text font-mono focus:border-atlas-accent focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <select
                    value={event.implementationType}
                    onChange={(e) => handleUpdateEvent(i, { implementationType: e.target.value as ImplementationType })}
                    className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                  >
                    {IMPLEMENTATION_TYPES.map((t) => (
                      <option key={t} value={t}>{IMPLEMENTATION_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 text-xs text-atlas-text-dim">
                    <span>{event.variations.length} var{event.variations.length !== 1 ? "s" : ""}</span>
                    {event.randomization && (
                      <span className="bg-atlas-accent/10 text-atlas-accent rounded px-1">random</span>
                    )}
                    {event.noRepeat && (
                      <span className="bg-orange-400/10 text-orange-400 rounded px-1">no-repeat</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-atlas-text-dim">
                    {event.rtpcSuggestions.length > 0 && (
                      <span className="bg-blue-400/10 text-blue-400 rounded px-1">
                        {event.rtpcSuggestions.length} RTPC
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEvent(i)}
                  className="text-atlas-text-dim hover:text-red-400 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expanded details */}
              {expandedEvent === i && (
                <div className="border-t border-atlas-border-subtle px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-atlas-text-dim">Max Instances</label>
                      <input
                        type="number"
                        value={event.maxInstances}
                        onChange={(e) => handleUpdateEvent(i, { maxInstances: Number(e.target.value) })}
                        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-atlas-text-dim">Cooldown (ms)</label>
                      <input
                        type="number"
                        value={event.cooldownMs}
                        onChange={(e) => handleUpdateEvent(i, { cooldownMs: Number(e.target.value) })}
                        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-atlas-text-dim">Priority (0–100)</label>
                      <input
                        type="number"
                        value={event.priority}
                        min={0} max={100}
                        onChange={(e) => handleUpdateEvent(i, { priority: Number(e.target.value) })}
                        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs text-atlas-text focus:border-atlas-accent focus:outline-none"
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-1 text-xs text-atlas-text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={event.randomization}
                          onChange={(e) => handleUpdateEvent(i, { randomization: e.target.checked })}
                          className="h-3 w-3 accent-atlas-accent"
                        /> Random
                      </label>
                      <label className="flex items-center gap-1 text-xs text-atlas-text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={event.noRepeat}
                          onChange={(e) => handleUpdateEvent(i, { noRepeat: e.target.checked })}
                          className="h-3 w-3 accent-atlas-accent"
                        /> No Repeat
                      </label>
                    </div>
                  </div>

                  {/* Parameters */}
                  {event.parameters && Object.keys(event.parameters).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-atlas-text mb-1 flex items-center gap-1">
                        <Settings2 className="h-3 w-3" /> Parameters
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {event.parameters.surface?.map((s) => (
                          <span key={s} className="rounded-md bg-green-400/10 text-green-400 px-1.5 py-0.5 text-xs">surface: {s}</span>
                        ))}
                        {event.parameters.intensity?.map((s) => (
                          <span key={s} className="rounded-md bg-orange-400/10 text-orange-400 px-1.5 py-0.5 text-xs">intensity: {s}</span>
                        ))}
                        {event.parameters.speed?.map((s) => (
                          <span key={s} className="rounded-md bg-blue-400/10 text-blue-400 px-1.5 py-0.5 text-xs">speed: {s}</span>
                        ))}
                        {event.parameters.distance?.map((s) => (
                          <span key={s} className="rounded-md bg-purple-400/10 text-purple-400 px-1.5 py-0.5 text-xs">distance: {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RTPC Suggestions */}
                  {event.rtpcSuggestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-atlas-text mb-1">RTPC Suggestions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {event.rtpcSuggestions.map((rtpc) => (
                          <div key={rtpc.name} className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-2 text-xs">
                            <span className="font-mono text-atlas-accent">{rtpc.name}</span>
                            <div className="text-atlas-text-dim mt-0.5">
                              {rtpc.min}–{rtpc.max} {rtpc.unit ? `(${rtpc.unit})` : ""} → {rtpc.mappedTo}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SoundBank Suggestions */}
      {pack.bankSuggestions.length > 0 && (
        <div className="atlas-card p-4">
          <h3 className="text-sm font-semibold text-atlas-text mb-2">SoundBank Suggestions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pack.bankSuggestions.map((bank) => (
              <div key={bank.bankName} className="rounded-lg border border-atlas-border-subtle p-2.5 text-xs">
                <span className="font-medium text-atlas-text font-mono">{bank.bankName}</span>
                <div className="flex gap-2 mt-1 text-xs text-atlas-text-dim">
                  <span>~{bank.estimatedSizeMb} MB</span>
                  <span className={cn(
                    "rounded px-1",
                    bank.loadStrategy === "always" ? "bg-green-400/10 text-green-400" :
                    bank.loadStrategy === "prefetch" ? "bg-blue-400/10 text-blue-400" :
                    "bg-atlas-surface-hover text-atlas-text-dim"
                  )}>
                    {bank.loadStrategy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview tabs */}
      <div className="atlas-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Code className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Export Preview</h3>
        </div>

        <div className="flex gap-1 mb-3 rounded-lg bg-atlas-surface-hover/50 p-1">
          {PREVIEW_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setPreviewTab(tab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                previewTab === tab
                  ? "bg-atlas-surface text-atlas-accent shadow-xs"
                  : "text-atlas-text-muted hover:text-atlas-text"
              )}
            >
              {tab === "manifest" ? "Full Pack" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <pre className="rounded-lg bg-atlas-bg border border-atlas-border-subtle p-3 text-xs text-atlas-text-muted overflow-auto max-h-64 font-mono whitespace-pre-wrap">
          {previewContent.slice(0, 3000)}
          {previewContent.length > 3000 && "\n\n... (truncated)"}
        </pre>
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-3 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all hover:shadow-lg hover:shadow-atlas-accent/20"
      >
        <Download className="h-4 w-4" />
        Export {previewTab === "manifest" ? "Implementation Pack" : previewTab.charAt(0).toUpperCase() + previewTab.slice(1) + " Manifest"}
      </button>
    </div>
  );
}
