"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, Download, Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioCleanupPanelProps {
  /** Label context — where is this panel embedded */
  context?: string;
  /** Optional callback when cleaned audio is ready */
  onCleanedAudio?: (url: string, blob: Blob) => void;
  /** Compact mode for embedding in other panels */
  compact?: boolean;
}

/**
 * AudioCleanupPanel — reusable audio isolation / noise removal.
 * Calls /api/elevenlabs/isolate-audio to separate voice from background.
 * Can be embedded in Listen, Human Lab, Stacker, or any workflow.
 */
export function AudioCleanupPanel({ context = "Reference", onCleanedAudio, compact }: AudioCleanupPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"voice" | "background">("voice");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setCleanedUrl(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
  }, []);

  const handleClean = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      const res = await fetch("/api/elevenlabs/isolate-audio", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Isolation failed" }));
        throw new Error(data.error || "Isolation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setCleanedUrl(url);
      onCleanedAudio?.(url, blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setProcessing(false);
    }
  }, [file, mode, onCleanedAudio]);

  return (
    <div className={cn("atlas-card", compact ? "p-4" : "p-5")}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "hsla(160, 50%, 50%, 0.1)" }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(160, 55%, 50%)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-atlas-text">Audio Cleanup</h3>
          {!compact && <p className="text-xs text-atlas-text-dim">Remove noise, isolate voice or background from {context.toLowerCase()} audio</p>}
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-3">
        {([
          { id: "voice" as const, label: "Isolate Voice", icon: Volume2, desc: "Remove background noise" },
          { id: "background" as const, label: "Isolate Background", icon: VolumeX, desc: "Remove vocal content" },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              mode === m.id
                ? "bg-atlas-accent-muted text-atlas-accent border border-atlas-accent/30"
                : "atlas-card hover:border-atlas-border text-atlas-text-muted"
            )}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* File upload */}
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="atlas-card px-3 py-2 text-xs font-medium text-atlas-text-muted hover:border-atlas-accent hover:text-atlas-accent transition-all"
        >
          {file ? file.name : "Choose audio file"}
        </button>

        <button
          onClick={handleClean}
          disabled={!file || processing}
          className="flex items-center gap-2 rounded-xl bg-atlas-accent px-4 py-2 text-xs font-medium text-white transition-all hover:bg-atlas-accent-hover disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {processing ? "Cleaning..." : "Clean Audio"}
        </button>
      </div>

      {error && <div className="mt-2 text-xs text-atlas-danger">{error}</div>}

      {/* Results */}
      {cleanedUrl && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-atlas-text-muted">Original</span>
            {originalUrl && <audio src={originalUrl} controls className="h-8 flex-1" />}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-atlas-accent">Cleaned</span>
            <audio src={cleanedUrl} controls className="h-8 flex-1" />
          </div>
          <a href={cleanedUrl} download={`cleaned_${file?.name || "audio.wav"}`} className="inline-flex items-center gap-2 text-xs text-atlas-accent hover:underline">
            <Download className="h-3.5 w-3.5" /> Download cleaned audio
          </a>
        </div>
      )}
    </div>
  );
}
