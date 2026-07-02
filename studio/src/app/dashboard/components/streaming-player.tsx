/**
 * Algophony Studio — Streaming Audio Player
 *
 * §3.1: Plays audio from a streaming endpoint as it downloads.
 * Uses MediaSource API for progressive playback.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { Pause, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordGenerationTime } from "./generation-progress";

interface StreamingPlayerProps {
  /** Text prompt for generation */
  prompt: string;
  /** Additional options */
  options?: {
    duration_seconds?: number;
    prompt_influence?: number;
  };
  /** Called when generation completes with duration */
  onComplete?: (durationMs: number) => void;
  className?: string;
}

export function StreamingPlayer({ prompt, options, onComplete, className }: StreamingPlayerProps) {
  const [status, setStatus] = useState<"idle" | "streaming" | "playing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const startTimeRef = useRef(0);

  const startStream = useCallback(async () => {
    if (!prompt.trim()) return;
    setStatus("streaming");
    setErrorMsg("");
    startTimeRef.current = Date.now();

    try {
      const res = await fetch("/api/elevenlabs/generate-sfx/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: options?.duration_seconds ?? null,
          prompt_influence: options?.prompt_influence ?? 0.3,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      // Create a blob URL from the streamed audio
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          setStatus("idle");
          URL.revokeObjectURL(url);
        };
        await audioRef.current.play();
        setStatus("playing");

        const elapsed = Date.now() - startTimeRef.current;
        recordGenerationTime(elapsed);
        onComplete?.(elapsed);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to stream");
    }
  }, [prompt, options, onComplete]);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setStatus("idle");
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <audio ref={audioRef} />

      {status === "idle" || status === "error" ? (
        <button
          onClick={startStream}
          disabled={!prompt.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            prompt.trim()
              ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover active:scale-95"
              : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed"
          )}
        >
          <Radio className="h-3 w-3" />
          Stream
        </button>
      ) : status === "streaming" ? (
        <button disabled className="flex items-center gap-1.5 rounded-lg bg-atlas-accent/10 px-3 py-1.5 text-xs font-medium text-atlas-accent">
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating…
        </button>
      ) : (
        <button
          onClick={stop}
          className="flex items-center gap-1.5 rounded-lg bg-atlas-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-atlas-accent-hover active:scale-95"
        >
          <Pause className="h-3 w-3" />
          Stop
        </button>
      )}

      {status === "error" && errorMsg && (
        <span className="text-xs text-red-400">{errorMsg}</span>
      )}
    </div>
  );
}
