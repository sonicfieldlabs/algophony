"use client";

/**
 * Algophony Studio — Global Audio Player
 *
 * Persistent bottom-of-page player available across every dashboard page.
 * Listens for `atlas:generation` events (new sound generated) and
 * `atlas:audio:play` events (user clicked play on a library card) and
 * keeps a recents playlist in localStorage so it survives reload.
 *
 * Pages that want to provide their own larger player can call
 *   window.dispatchEvent(new CustomEvent("atlas:player:expand", { detail: { generationId } }))
 * to focus a specific track in the expanded view.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Library,
  ChevronUp,
  ChevronDown,
  ListMusic,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Waveform } from "./waveform";
import { SendToToolMenu } from "@/app/dashboard/sounds/SendToToolMenu";
import { installExclusiveMediaPlayback } from "@/lib/audio/exclusive-playback";
import { autoFilename } from "@/lib/sfx/auto-name";

/**
 * Map a PlayerTrack into the loose generation-shaped record that
 * `route-to-tool` expects (request_payload.text, metadata.category, …).
 * Pulled out as a helper so the conversion stays local to the player.
 */
function trackToGeneration(track: PlayerTrack): Record<string, unknown> {
  return {
    id: track.id,
    audio_signed_url: track.url,
    audio_storage_path: track.url,
    duration_seconds: track.duration,
    api_route: track.apiRoute,
    request_payload: {
      text: track.prompt,
      category: track.category,
    },
    metadata: {
      category: track.category,
    },
  };
}

const STORAGE_KEY = "atlas-recent-playlist";
const MAX_RECENT = 20;

export interface PlayerTrack {
  id: string;
  url: string;
  title: string;
  filename?: string;
  longName?: string;
  prompt: string;
  category: string;
  duration: number | null;
  createdAt: number;
  /** Original generation route (for "reprompt"). */
  apiRoute?: string;
}

interface PlayerContextValue {
  playlist: PlayerTrack[];
  current: PlayerTrack | null;
  playing: boolean;
  expanded: boolean;
  play: (track: PlayerTrack) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  clear: () => void;
  setExpanded: (v: boolean) => void;
  removeTrack: (id: string) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function useGlobalPlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    // Defensive default — keep components safe if mounted outside the provider.
    return {
      playlist: [],
      current: null,
      playing: false,
      expanded: false,
      play: () => {},
      toggle: () => {},
      next: () => {},
      prev: () => {},
      clear: () => {},
      setExpanded: () => {},
      removeTrack: () => {},
    };
  }
  return ctx;
}

function loadPlaylist(): PlayerTrack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayerTrack[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function savePlaylist(list: PlayerTrack[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // localStorage may be full; ignore.
  }
}

export function GlobalAudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<PlayerTrack[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Hydration guard — keep server-rendered output empty so it matches the
  // first client render, then fill from localStorage once mounted.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => installExclusiveMediaPlayback(), []);

  useEffect(() => {
    // Defer to next frame so we don't trigger a cascading render during
    // the same effect tick (matches the project's pattern in audio-player.tsx).
    const id = requestAnimationFrame(() => {
      setPlaylist(loadPlaylist());
      setHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const current = useMemo(
    () => playlist.find((t) => t.id === currentId) ?? null,
    [playlist, currentId]
  );

  // Persist playlist on change.
  useEffect(() => {
    if (!hydrated) return;
    savePlaylist(playlist);
  }, [playlist, hydrated]);

  // Audio element wiring — single shared element managed by this provider.
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }
    const audio = audioRef.current;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      // Auto-advance to next track if there is one.
      setCurrentId((cid) => {
        if (!cid) return cid;
        const idx = playlist.findIndex((t) => t.id === cid);
        const nextTrack = playlist[idx + 1];
        if (nextTrack) {
          audio.src = nextTrack.url;
          audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          return nextTrack.id;
        }
        return cid;
      });
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
    };
  }, [playlist]);

  const play = useCallback((track: PlayerTrack) => {
    setPlaylist((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, MAX_RECENT);
    });
    setCurrentId(track.id);
    const audio = audioRef.current;
    if (audio) {
      audio.src = track.url;
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [current]);

  const next = useCallback(() => {
    if (!current) return;
    const idx = playlist.findIndex((t) => t.id === current.id);
    const nextTrack = playlist[idx + 1];
    if (nextTrack) play(nextTrack);
  }, [current, playlist, play]);

  const prev = useCallback(() => {
    if (!current) return;
    const idx = playlist.findIndex((t) => t.id === current.id);
    const prevTrack = playlist[idx - 1];
    if (prevTrack) play(prevTrack);
  }, [current, playlist, play]);

  const clear = useCallback(() => {
    audioRef.current?.pause();
    setPlaylist([]);
    setCurrentId(null);
    setPlaying(false);
  }, []);

  const removeTrack = useCallback((id: string) => {
    setPlaylist((prev) => prev.filter((t) => t.id !== id));
    setCurrentId((cid) => (cid === id ? null : cid));
  }, []);

  // Listen for app-wide events.
  useEffect(() => {
    function onGeneration(e: Event) {
      const detail = (e as CustomEvent<PlayerTrack>).detail;
      if (!detail?.url || !detail?.id) return;
      // Add to playlist + auto-play.
      play(detail);
    }
    function onExternalPlay(e: Event) {
      const detail = (e as CustomEvent<PlayerTrack>).detail;
      if (!detail?.url || !detail?.id) return;
      play(detail);
    }
    function onMuteToggle() {
      setMuted((m) => {
        if (audioRef.current) audioRef.current.muted = !m;
        return !m;
      });
    }
    window.addEventListener("atlas:generation", onGeneration as EventListener);
    window.addEventListener("atlas:audio:play", onExternalPlay as EventListener);
    window.addEventListener("atlas:player:mute", onMuteToggle as EventListener);
    return () => {
      window.removeEventListener("atlas:generation", onGeneration as EventListener);
      window.removeEventListener("atlas:audio:play", onExternalPlay as EventListener);
      window.removeEventListener("atlas:player:mute", onMuteToggle as EventListener);
    };
  }, [play]);

  const value = useMemo<PlayerContextValue>(() => ({
    playlist,
    current,
    playing,
    expanded,
    play,
    toggle,
    next,
    prev,
    clear,
    setExpanded,
    removeTrack,
  }), [playlist, current, playing, expanded, play, toggle, next, prev, clear, removeTrack]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {hydrated && current && (
        <GlobalAudioPlayerBar
          current={current}
          playing={playing}
          muted={muted}
          currentTime={currentTime}
          duration={duration}
          expanded={expanded}
          playlist={playlist}
          onToggle={toggle}
          onNext={next}
          onPrev={prev}
          onSeek={(pos) => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            audio.currentTime = pos * duration;
          }}
          onMuteToggle={() => {
            setMuted((m) => {
              if (audioRef.current) audioRef.current.muted = !m;
              return !m;
            });
          }}
          onExpand={() => setExpanded((v) => !v)}
          onPlayTrack={play}
          onRemoveTrack={removeTrack}
          onClear={clear}
        />
      )}
    </PlayerContext.Provider>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function downloadNameForTrack(track: PlayerTrack): string {
  if (track.filename) return track.filename;
  if (track.prompt.trim()) return autoFilename({ prompt: track.prompt, category: "sfx" }, "mp3");
  return `sfx-${track.id.slice(0, 8)}.mp3`;
}

interface BarProps {
  current: PlayerTrack;
  playing: boolean;
  muted: boolean;
  currentTime: number;
  duration: number;
  expanded: boolean;
  playlist: PlayerTrack[];
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pos: number) => void;
  onMuteToggle: () => void;
  onExpand: () => void;
  onPlayTrack: (t: PlayerTrack) => void;
  onRemoveTrack: (id: string) => void;
  onClear: () => void;
}

function GlobalAudioPlayerBar({
  current,
  playing,
  muted,
  currentTime,
  duration,
  expanded,
  playlist,
  onToggle,
  onNext,
  onPrev,
  onSeek,
  onMuteToggle,
  onExpand,
  onPlayTrack,
  onRemoveTrack,
  onClear,
}: BarProps) {
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <>
      {/* Expanded playlist drawer */}
      {expanded && (
        <div className="fixed inset-x-0 bottom-[68px] z-40 lg:left-[var(--atlas-sidebar-w,220px)] border-t border-atlas-border-subtle bg-atlas-bg shadow-lg animate-slide-up">
          <div className="max-h-72 overflow-y-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-atlas-text-muted">
                <ListMusic className="h-3.5 w-3.5" />
                Recently generated · {playlist.length}
              </span>
              <button
                onClick={onClear}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-atlas-text-muted hover:text-atlas-danger hover:bg-atlas-danger/5 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            </div>
            <div className="space-y-1">
              {playlist.map((track) => {
                const isCur = track.id === current.id;
                return (
                  <div
                    key={track.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
                      isCur ? "bg-atlas-accent-muted" : "hover:bg-atlas-surface-hover"
                    )}
                  >
                    <button
                      onClick={() => onPlayTrack(track)}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all",
                        isCur && playing
                          ? "bg-atlas-accent text-white"
                          : "bg-atlas-surface text-atlas-text-muted hover:text-atlas-accent"
                      )}
                    >
                      {isCur && playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-atlas-text truncate">{track.title}</div>
                      <div className="text-xs text-atlas-text-muted truncate">
                        {track.category} · {track.duration ? `${track.duration}s` : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Send-to-tool — routes this sound to Variation Lab,
                          Atmosphere, Export, etc. with the full payload. */}
                      <SendToToolMenu generation={trackToGeneration(track)} />
                      <Link
                        href={`/dashboard/generate?text=${encodeURIComponent(track.prompt)}&category=${encodeURIComponent(track.category)}`}
                        className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-surface hover:text-atlas-text transition-colors"
                        title="Open prompt in Generate"
                      >
                        <RefreshCcw className="h-3 w-3" />
                      </Link>
                      <Link
                        href="/dashboard/sounds"
                        className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-surface hover:text-atlas-text transition-colors"
                        title="Open library"
                      >
                        <Library className="h-3 w-3" />
                      </Link>
                      <a
                        href={track.url}
                        download={downloadNameForTrack(track)}
                        className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-surface hover:text-atlas-text transition-colors"
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => onRemoveTrack(track.id)}
                        className="rounded-md p-1.5 text-atlas-text-muted hover:bg-atlas-danger/10 hover:text-atlas-danger transition-colors"
                        title="Remove from playlist"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:left-[var(--atlas-sidebar-w,220px)] border-t border-atlas-border bg-atlas-bg shadow-lg">
        <div className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5">
          {/* Track meta */}
          <div className="min-w-0 flex-1 max-w-xs">
            <div className="text-[13px] font-medium text-atlas-text truncate">{current.title}</div>
            <div className="text-xs text-atlas-text-muted truncate">
              {current.category}
              {current.duration ? ` · ${current.duration}s` : ""}
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              className="rounded-lg p-1.5 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              title="Previous"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={onToggle}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-atlas-accent text-white hover:bg-atlas-accent-hover active:scale-95 transition-all shadow-sm shadow-atlas-accent/20"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={onNext}
              className="rounded-lg p-1.5 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              title="Next"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Waveform scrubber + time. The Waveform component decodes the
              currently-playing track's audio once and downsamples it to
              ~2000 peaks, so the bar reflects the real envelope of the
              generated sound rather than a generic progress line. */}
          <div className="hidden sm:flex flex-1 items-center gap-2 min-w-0">
            <span className="text-xs tabular-nums text-atlas-text-muted shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 min-w-0">
              <Waveform
                audioUrl={current.url}
                progress={progress}
                height={32}
                onSeek={onSeek}
              />
            </div>
            <span className="text-xs tabular-nums text-atlas-text-muted shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Secondary controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onMuteToggle}
              className="rounded-lg p-1.5 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <a
              href={current.url}
              download={downloadNameForTrack(current)}
              className="rounded-lg p-1.5 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <Link
              href="/dashboard/sounds"
              className="hidden sm:inline-flex rounded-lg p-1.5 text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text transition-colors"
              title="Open library"
            >
              <Library className="h-4 w-4" />
            </Link>
            <button
              onClick={onExpand}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                expanded
                  ? "bg-atlas-accent-muted text-atlas-accent"
                  : "text-atlas-text-muted hover:bg-atlas-surface-hover hover:text-atlas-text"
              )}
              title={expanded ? "Collapse playlist" : "Show recent playlist"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
