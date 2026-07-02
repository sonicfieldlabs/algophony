"use client";

import { useState, useCallback } from "react";
import { Clock, Download, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────── */

export interface TimingCharacter {
  character: string;
  start: number;
  end: number;
}

export interface TimingWord {
  word: string;
  start: number;
  end: number;
  characters: TimingCharacter[];
}

export interface TimingData {
  words: TimingWord[];
  totalDuration: number;
  text: string;
}

/* ── Export formats ───────────────────────────────────────────── */

function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function exportCsvCueSheet(data: TimingData): string {
  const lines = ["Index,Type,Start,End,Duration,Content"];
  data.words.forEach((w, i) => {
    lines.push(`${i + 1},word,${w.start.toFixed(3)},${w.end.toFixed(3)},${(w.end - w.start).toFixed(3)},"${w.word}"`);
  });
  return lines.join("\n");
}

export function exportJsonCueSheet(data: TimingData): string {
  return JSON.stringify({
    format: "algophony-studio-timing-v1",
    totalDuration: data.totalDuration,
    text: data.text,
    cues: data.words.map((w, i) => ({
      index: i,
      type: "word",
      content: w.word,
      start: w.start,
      end: w.end,
      duration: +(w.end - w.start).toFixed(3),
      characters: w.characters,
    })),
  }, null, 2);
}

export function exportReaperMarkers(data: TimingData): string {
  return data.words.map((w, i) => `M ${i} ${w.start.toFixed(6)} "${w.word}" 0`).join("\n");
}

export function exportDawRegions(data: TimingData): string {
  return data.words.map((w, i) =>
    `R ${i + 1} ${w.start.toFixed(6)} ${w.end.toFixed(6)} "${w.word}"`
  ).join("\n");
}

export function exportGameEngineManifest(data: TimingData): string {
  return JSON.stringify({
    format: "algophony-studio-events-v1",
    totalDuration: data.totalDuration,
    events: data.words.map((w, i) => ({
      id: `cue_${String(i).padStart(3, "0")}`,
      label: w.word,
      triggerTime: w.start,
      endTime: w.end,
      duration: +(w.end - w.start).toFixed(3),
    })),
  }, null, 2);
}

/* ── Export format definitions ───────────────────────────────── */

const EXPORT_FORMATS = [
  { id: "csv", label: "CSV Cue Sheet", ext: "csv", mime: "text/csv", fn: exportCsvCueSheet },
  { id: "json", label: "JSON Cue Sheet", ext: "json", mime: "application/json", fn: exportJsonCueSheet },
  { id: "reaper", label: "Reaper Markers", ext: "txt", mime: "text/plain", fn: exportReaperMarkers },
  { id: "daw", label: "DAW Regions", ext: "txt", mime: "text/plain", fn: exportDawRegions },
  { id: "game", label: "Game Engine Events", ext: "json", mime: "application/json", fn: exportGameEngineManifest },
] as const;

/* ── Panel Props ─────────────────────────────────────────────── */

interface TimingSyncPanelProps {
  /** Pre-loaded timing data (if already available from TTS response) */
  timingData?: TimingData | null;
  /** Optional callback to request timing from a TTS generation */
  onRequestTiming?: (text: string, voiceId: string) => Promise<TimingData>;
  /** Compact mode */
  compact?: boolean;
}

/**
 * TimingSyncPanel — extract and export character/word-level timing data.
 * Works with ElevenLabs TTS with-timestamps endpoint.
 * Exports to CSV, JSON, Reaper, DAW regions, and game engine manifests.
 */
export function TimingSyncPanel({ timingData: externalData, onRequestTiming, compact }: TimingSyncPanelProps) {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localData, setLocalData] = useState<TimingData | null>(null);

  const data = externalData ?? localData;

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (onRequestTiming) {
        const result = await onRequestTiming(text, voiceId);
        setLocalData(result);
      } else {
        const res = await fetch("/api/elevenlabs/tts-with-timing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice_id: voiceId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Generation failed");
        setLocalData(json.timing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [text, voiceId, onRequestTiming]);

  const handleExport = useCallback((formatId: string) => {
    if (!data) return;
    const format = EXPORT_FORMATS.find((f) => f.id === formatId);
    if (!format) return;
    const content = format.fn(data);
    const blob = new Blob([content], { type: format.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timing_cues.${format.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className={cn("atlas-card", compact ? "p-4" : "p-5")}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "hsla(30, 50%, 50%, 0.1)" }}>
          <Clock className="h-3.5 w-3.5" style={{ color: "hsl(30, 55%, 50%)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-atlas-text">Timing & Sync</h3>
          {!compact && <p className="text-xs text-atlas-text-dim">Extract word/character-level timing for cue sheets, subtitles, and game events</p>}
        </div>
      </div>

      {/* Input — only show if no external data */}
      {!externalData && (
        <div className="space-y-3 mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to generate timing data from TTS..."
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2.5 text-sm text-atlas-text placeholder:text-atlas-text-dim focus:border-atlas-accent focus:outline-none resize-none"
            rows={3}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-atlas-text-dim mb-1 block">Voice ID</label>
              <input
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text font-mono focus:border-atlas-accent focus:outline-none"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || loading}
              className="flex items-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-atlas-accent-hover disabled:opacity-50 mt-4"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
              {loading ? "Generating..." : "Generate Timing"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-xs text-atlas-danger mb-3">{error}</div>}

      {/* Timeline visualization */}
      {data && (
        <div className="space-y-4">
          {/* Word timeline */}
          <div>
            <h4 className="text-xs font-semibold text-atlas-text-dim uppercase tracking-wider mb-2">Word Timeline</h4>
            <div className="relative h-12 rounded-lg bg-atlas-surface-hover overflow-hidden">
              {data.words.map((w, i) => {
                const left = (w.start / data.totalDuration) * 100;
                const width = Math.max(((w.end - w.start) / data.totalDuration) * 100, 0.5);
                const hue = (i * 37) % 360;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-white overflow-hidden transition-all hover:brightness-110 cursor-default"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: `hsl(${hue}, 50%, 50%)`,
                      borderRight: "1px solid var(--color-atlas-bg)",
                    }}
                    title={`${w.word}: ${w.start.toFixed(3)}s → ${w.end.toFixed(3)}s`}
                  >
                    <span className="truncate px-0.5">{w.word}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-atlas-text-dim mt-1">
              <span>0:00.000</span>
              <span>{formatTimecode(data.totalDuration)}</span>
            </div>
          </div>

          {/* Word table */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-atlas-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-atlas-surface">
                <tr className="border-b border-atlas-border-subtle">
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">#</th>
                  <th className="px-3 py-2 text-left text-atlas-text-dim font-medium">Word</th>
                  <th className="px-3 py-2 text-right text-atlas-text-dim font-medium">Start</th>
                  <th className="px-3 py-2 text-right text-atlas-text-dim font-medium">End</th>
                  <th className="px-3 py-2 text-right text-atlas-text-dim font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.words.map((w, i) => (
                  <tr key={i} className="border-b border-atlas-border-subtle last:border-0 hover:bg-atlas-surface-hover">
                    <td className="px-3 py-1.5 text-atlas-text-dim tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 text-atlas-text font-medium">{w.word}</td>
                    <td className="px-3 py-1.5 text-right text-atlas-text-muted tabular-nums">{w.start.toFixed(3)}s</td>
                    <td className="px-3 py-1.5 text-right text-atlas-text-muted tabular-nums">{w.end.toFixed(3)}s</td>
                    <td className="px-3 py-1.5 text-right text-atlas-text tabular-nums">{(w.end - w.start).toFixed(3)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export buttons */}
          <div>
            <h4 className="text-xs font-semibold text-atlas-text-dim uppercase tracking-wider mb-2">Export</h4>
            <div className="flex flex-wrap gap-2">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleExport(f.id)}
                  className="flex items-center gap-1.5 atlas-card px-3 py-2 text-xs font-medium text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-all"
                >
                  {f.id === "game" ? <FileText className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
