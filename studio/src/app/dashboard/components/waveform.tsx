/**
 * Algophony Studio — Waveform Visualization
 *
 * §5.1: Canvas-based waveform with hover scrub, playback indicator,
 * and theme-aware colors. Decodes audio via WebAudio API and
 * downsamples to ~2000 peaks for fast rendering.
 */

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface WaveformProps {
  /** Audio URL to decode and visualize */
  audioUrl: string | null;
  /** Current playback position 0..1 */
  progress?: number;
  /** Height in pixels (default: 48) */
  height?: number;
  /** Called when user clicks/scrubs the waveform */
  onSeek?: (position: number) => void;
  /** Additional class names */
  className?: string;
}

/** Downsample audio to N peaks */
function extractPeaks(channelData: Float32Array, numPeaks: number): number[] {
  const peaks: number[] = new Array(numPeaks);
  const blockSize = Math.floor(channelData.length / numPeaks);

  for (let i = 0; i < numPeaks; i++) {
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);

    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }

  return peaks;
}

export function Waveform({
  audioUrl,
  progress = 0,
  height = 48,
  onSeek,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Decode audio and extract peaks
  useEffect(() => {
    if (!audioUrl) {
      setTimeout(() => setPeaks(null), 0);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();

        if (cancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const numPeaks = Math.min(2000, Math.floor(channelData.length / 100));
        const extracted = extractPeaks(channelData, Math.max(numPeaks, 100));
        setPeaks(extracted);
      } catch {
        if (!cancelled) setPeaks(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [audioUrl]);

  // Draw waveform
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const barWidth = Math.max(1, w / peaks.length - 0.5);
    const progressX = progress * w;
    const midY = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Get CSS custom properties for theming
    const computedStyle = getComputedStyle(canvas);
    const accentColor = computedStyle.getPropertyValue("--atlas-accent-raw")?.trim() || "260 65% 55%";
    const dimColor = computedStyle.getPropertyValue("--atlas-text-dim-raw")?.trim() || "0 0% 50%";

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * w;
      const barH = Math.max(1, peaks[i] * (h * 0.8));

      // Color: played portion uses accent, unplayed uses dim
      if (x <= progressX) {
        ctx.fillStyle = `hsl(${accentColor})`;
        ctx.globalAlpha = 0.9;
      } else {
        ctx.fillStyle = `hsl(${dimColor})`;
        ctx.globalAlpha = 0.35;
      }

      ctx.fillRect(x, midY - barH / 2, barWidth, barH);
    }

    // Hover indicator
    if (hoverX !== null) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = `hsl(${accentColor})`;
      ctx.fillRect(hoverX, 0, 1, h);
      ctx.globalAlpha = 1;
    }

    // Playhead
    if (progress > 0 && progress < 1) {
      ctx.fillStyle = `hsl(${accentColor})`;
      ctx.globalAlpha = 1;
      ctx.fillRect(progressX - 0.5, 0, 1.5, h);
    }
  }, [peaks, progress, hoverX]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setHoverX(e.clientX - rect.left);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && onSeek) {
      const pos = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(1, pos)));
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="waveform-bar" />
            ))}
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          "w-full h-full rounded cursor-pointer transition-opacity",
          peaks ? "opacity-100" : "opacity-0"
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
        onClick={handleClick}
      />
    </div>
  );
}
