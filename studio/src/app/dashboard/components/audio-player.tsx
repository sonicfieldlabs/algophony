"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Square, SkipBack, SkipForward, Repeat, Volume2, VolumeX, Gauge, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Waveform } from "./waveform";

export interface AudioPlayerProps {
  src: string | null;
  title?: string;
  downloadName?: string;
  compact?: boolean;
  className?: string;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, title, downloadName, compact, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const animRef = useRef(0);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const a = audioRef.current;
      if (a && !a.paused) {
        setCurrentTime(a.currentTime);
        setProgress(a.duration ? a.currentTime / a.duration : 0);
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onMeta = () => setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => { setPlaying(false); if (loop) { a.currentTime = 0; a.play(); } };
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, [loop]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPlaying(false);
      setCurrentTime(0);
      setProgress(0);
      setDuration(0);
      audioRef.current?.load();
    });
    return () => cancelAnimationFrame(frame);
  }, [src]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !src) return;
    if (playing) {
      a.pause();
    } else {
      void a.play();
    }
  };
  const stop = () => { const a = audioRef.current; if (!a) return; a.pause(); a.currentTime = 0; setPlaying(false); setCurrentTime(0); setProgress(0); };
  const seek = (pos: number) => { const a = audioRef.current; if (!a || !duration) return; a.currentTime = pos * duration; setCurrentTime(a.currentTime); setProgress(pos); };
  const skip = (d: number) => { const a = audioRef.current; if (!a) return; a.currentTime = Math.max(0, Math.min(a.currentTime + d, duration)); setCurrentTime(a.currentTime); setProgress(duration ? a.currentTime / duration : 0); };
  const cycleSpeed = () => { const i = SPEEDS.indexOf(rate); const n = SPEEDS[(i + 1) % SPEEDS.length]; setRate(n); if (audioRef.current) audioRef.current.playbackRate = n; };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {src && <audio ref={audioRef} src={src} preload="metadata" />}
        <button onClick={togglePlay} disabled={!src} className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-all", src ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover active:scale-95" : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed")}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-1 min-w-0"><Waveform audioUrl={src} progress={progress} height={28} onSeek={seek} /></div>
        <span className="text-xs text-atlas-text-dim tabular-nums whitespace-nowrap">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    );
  }

  return (
    <div className={cn("atlas-card p-4 space-y-3", className)}>
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      {title && <div className="text-xs font-medium text-atlas-text truncate">{title}</div>}
      <Waveform audioUrl={src} progress={progress} height={56} onSeek={seek} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={stop} disabled={!src} className="rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors disabled:opacity-30"><Square className="h-3.5 w-3.5" /></button>
          <button onClick={() => skip(-5)} disabled={!src} className="rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors disabled:opacity-30"><SkipBack className="h-3.5 w-3.5" /></button>
          <button onClick={togglePlay} disabled={!src} className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-all", src ? "bg-atlas-accent text-white hover:bg-atlas-accent-hover active:scale-95 shadow-sm shadow-atlas-accent/20" : "bg-atlas-surface-hover text-atlas-text-dim cursor-not-allowed")}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}</button>
          <button onClick={() => skip(5)} disabled={!src} className="rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors disabled:opacity-30"><SkipForward className="h-3.5 w-3.5" /></button>
          <button onClick={() => setLoop(!loop)} className={cn("rounded-lg p-1.5 transition-colors", loop ? "bg-atlas-accent/10 text-atlas-accent" : "text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text")}><Repeat className="h-3.5 w-3.5" /></button>
        </div>
        <div className="text-xs text-atlas-text-dim tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</div>
        <div className="flex items-center gap-1">
          <button onClick={cycleSpeed} className={cn("rounded-lg px-2 py-1 text-xs font-medium transition-colors", rate !== 1 ? "bg-atlas-accent/10 text-atlas-accent" : "text-atlas-text-dim hover:bg-atlas-surface-hover")}><Gauge className="inline h-3 w-3 mr-0.5" />{rate}×</button>
          <button onClick={() => { setMuted(!muted); if (audioRef.current) audioRef.current.muted = !muted; }} className="rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors">{muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button>
          {src && downloadName && <a href={src} download={downloadName} className="rounded-lg p-1.5 text-atlas-text-dim hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"><Download className="h-3.5 w-3.5" /></a>}
        </div>
      </div>
    </div>
  );
}
