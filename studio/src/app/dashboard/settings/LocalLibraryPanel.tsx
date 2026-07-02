"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { Database, FileAudio, FolderPlus, Loader2, Pause, Play, RefreshCcw, Wand2 } from "lucide-react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import { useToast } from "@/app/dashboard/toast";
import { cn } from "@/lib/utils";

type WorkspaceResponse = {
  workspace: {
    libraryRoots: string[];
  };
  library: {
    scannedAt: string | null;
    summary: {
      roots: number;
      sounds: number;
      totalBytes: number;
      formats: Record<string, number>;
    };
  };
};

type LocalSound = {
  id: string;
  fileName: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  promptCandidate: string;
  audioUrl?: string;
  tags: string[];
  metadata: {
    durationSeconds: number | null;
    sampleRate: number | null;
    channels: number | null;
    codec: string | null;
  };
};

type SoundsResponse = {
  sounds: LocalSound[];
};

export function LocalLibraryPanel() {
  const toast = useToast();
  const [folderPath, setFolderPath] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [sounds, setSounds] = useState<LocalSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [promptOpen, setPromptOpen] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadWorkspace = useCallback(async (signal?: AbortSignal) => {
    if (!signal?.aborted) setLoading(true);
    try {
      const [workspaceResponse, soundsResponse] = await Promise.all([
        fetch("/api/local/workspace", { signal }),
        fetch("/api/local/sounds?limit=8", { signal }),
      ]);
      const workspaceData = await workspaceResponse.json();
      const soundsData = await soundsResponse.json();
      if (!workspaceResponse.ok) throw new Error(workspaceData.error ?? "Unable to load workspace.");
      if (!soundsResponse.ok) throw new Error(soundsData.error ?? "Unable to load local sounds.");
      if (!signal?.aborted) {
        setWorkspace(workspaceData as WorkspaceResponse);
        setSounds((soundsData as SoundsResponse).sounds);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Unable to load local workspace.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useAbortableFetch(loadWorkspace, [loadWorkspace]);

  const indexFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIndexing(true);
    try {
      const response = await fetch("/api/local/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to index folder.");
      setFolderPath("");
      toast.success(`Indexed ${data.summary?.sounds ?? 0} local sounds.`);
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to index folder.");
    } finally {
      setIndexing(false);
    }
  };

  const rescan = async () => {
    setIndexing(true);
    try {
      const response = await fetch("/api/local/libraries", { method: "PUT" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to rescan folders.");
      toast.success(`Rescanned ${data.summary?.sounds ?? 0} local sounds.`);
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rescan folders.");
    } finally {
      setIndexing(false);
    }
  };

  const playSound = (sound: LocalSound) => {
    if (!sound.audioUrl) return;
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(sound.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onpause = () => {
      if (!audio.ended) setPlayingId(null);
    };
    audioRef.current = audio;
    void audio.play();
    setPlayingId(sound.id);
  };

  const summary = workspace?.library.summary;
  const roots = workspace?.workspace.libraryRoots ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Roots", summary?.roots ?? 0],
          ["Sounds", summary?.sounds ?? 0],
          ["Size", formatBytes(summary?.totalBytes ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</div>
            <div className="text-lg font-semibold text-atlas-text mt-1 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <form onSubmit={indexFolder} className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Local sound folder</span>
          <input
            value={folderPath}
            onChange={(event) => setFolderPath(event.target.value)}
                  placeholder="/path/to/Sounds/library"
            className="mt-2 w-full rounded-xl border border-atlas-border bg-atlas-bg px-3 py-2.5 text-sm text-atlas-text outline-none transition-colors placeholder:text-atlas-text-dim focus:border-atlas-accent"
          />
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-atlas-text-dim leading-relaxed">
            The index stores metadata and local file references. It does not copy audio files by default.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={rescan}
              disabled={indexing || roots.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-atlas-border bg-atlas-surface px-4 py-2.5 text-sm font-semibold text-atlas-text transition-colors hover:border-atlas-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Rescan
            </button>
            <button
              type="submit"
              disabled={indexing || folderPath.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-atlas-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              Index folder
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Indexed roots</div>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-atlas-text-dim" />}
        </div>
        {roots.length === 0 ? (
          <p className="text-sm text-atlas-text-muted">No local folders indexed yet.</p>
        ) : (
          <div className="space-y-2">
            {roots.map((root) => (
              <div key={root} className="font-mono text-xs text-atlas-text rounded-lg border border-atlas-border-subtle bg-atlas-surface px-3 py-2 break-all">
                {root}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-atlas-accent" />
          <div className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Recent indexed sounds</div>
        </div>
        {sounds.length === 0 ? (
          <p className="text-sm text-atlas-text-muted">Indexed sounds will appear here with metadata-derived prompt candidates.</p>
        ) : (
          <div className="divide-y divide-atlas-border-subtle">
            {sounds.map((sound) => (
              <div key={sound.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => playSound(sound)}
                    disabled={!sound.audioUrl}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-atlas-border-subtle bg-atlas-surface text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
                    aria-label={playingId === sound.id ? "Pause local sound" : "Play local sound"}
                  >
                    {!sound.audioUrl ? <FileAudio className="h-4 w-4" /> : playingId === sound.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-atlas-text truncate">{sound.fileName}</div>
                      <span className="rounded bg-atlas-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase text-atlas-text-dim">
                        {sound.extension.replace(".", "")}
                      </span>
                    </div>
                    <div className="text-xs text-atlas-text-dim mt-1 truncate">{sound.relativePath}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sound.tags.slice(0, 6).map((tag) => (
                        <span key={tag} className="rounded-md bg-atlas-accent-muted px-2 py-0.5 text-[10px] text-atlas-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromptOpen(promptOpen === sound.id ? null : sound.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                      promptOpen === sound.id
                        ? "border-atlas-accent bg-atlas-accent-muted text-atlas-accent"
                        : "border-atlas-border bg-atlas-surface text-atlas-text-muted hover:border-atlas-accent"
                    )}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Prompt
                  </button>
                </div>
                {promptOpen === sound.id && (
                  <div className="mt-3 rounded-lg border border-atlas-border-subtle bg-atlas-surface px-3 py-2 font-mono text-xs text-atlas-text-muted leading-relaxed">
                    {sound.promptCandidate}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
