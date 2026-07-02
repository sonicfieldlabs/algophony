"use client";

import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Database,
  Edit3,
  FolderMinus,
  FolderPlus,
  Loader2,
  Pause,
  Play,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  Square,
  Star,
  Tags,
  Wand2,
} from "lucide-react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import { useToast } from "@/app/dashboard/toast";
import { cn } from "@/lib/utils";
import {
  FREQUENCY_ROLES,
  STACKER_LAYER_TYPES,
  type FrequencyRoleId,
  type StackerLayerType,
} from "@/lib/sfx/stacker-taxonomy";

type UserMetadata = {
  favorite: boolean;
  title: string | null;
  prompt: string | null;
  notes: string | null;
  category: string | null;
  subcategory: string | null;
  action: string | null;
  material: string | null;
  mood: string | null;
  acousticSpace: string | null;
  layerType: StackerLayerType | null;
  frequencyRole: FrequencyRoleId | null;
  rating: number | null;
  tags: string[];
  updatedAt: string | null;
};

type LocalSound = {
  id: string;
  fileName: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  promptCandidate: string;
  audioUrl?: string;
  tags: string[];
  userMetadata: UserMetadata;
  metadata: {
    durationSeconds: number | null;
    sampleRate: number | null;
    channels: number | null;
    codec: string | null;
  };
};

type WorkspaceResponse = {
  workspace: {
    libraryRoots: string[];
  };
  library: {
    scannedAt: string | null;
    summary: {
      roots: number;
      sounds: number;
      favorites: number;
      totalBytes: number;
      formats: Record<string, number>;
    };
  };
};

type SoundsResponse = {
  sounds: LocalSound[];
  summary: WorkspaceResponse["library"]["summary"];
};

type PromptToolResult = {
  result?: {
    prompt?: string;
    metadata?: Partial<UserMetadata> & { tags?: string[] };
  };
  results?: Array<{
    assetId: string;
    result?: {
      prompt: string;
      metadata: Partial<UserMetadata> & { tags?: string[] };
    };
  }>;
};

type FilterMode = "all" | "favorites" | "edited";

const EMPTY_EDIT: UserMetadata = {
  favorite: false,
  title: null,
  prompt: null,
  notes: null,
  category: null,
  subcategory: null,
  action: null,
  material: null,
  mood: null,
  acousticSpace: null,
  layerType: null,
  frequencyRole: null,
  rating: null,
  tags: [],
  updatedAt: null,
};

export function LocalLibraryWorkspace() {
  const toast = useToast();
  const [folderPath, setFolderPath] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [sounds, setSounds] = useState<LocalSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edit, setEdit] = useState<UserMetadata>(EMPTY_EDIT);
  const [batchTags, setBatchTags] = useState("");
  const [batchCategory, setBatchCategory] = useState("");
  const [toolPrompt, setToolPrompt] = useState("");
  const [toolMetadata, setToolMetadata] = useState("{\n  \"category\": \"\",\n  \"tags\": []\n}");
  const [toolOutput, setToolOutput] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeSound = sounds.find((sound) => sound.id === activeId) ?? null;

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!signal?.aborted) setLoading(true);
    try {
      const [workspaceResponse, soundsResponse] = await Promise.all([
        fetch("/api/local/workspace", { signal }),
        fetch("/api/local/sounds?limit=500", { signal }),
      ]);
      const workspaceData = await workspaceResponse.json();
      const soundsData = await soundsResponse.json();
      if (!workspaceResponse.ok) throw new Error(workspaceData.error ?? "Unable to load workspace.");
      if (!soundsResponse.ok) throw new Error(soundsData.error ?? "Unable to load sounds.");

      if (!signal?.aborted) {
        setWorkspace(workspaceData as WorkspaceResponse);
        const nextSounds = (soundsData as SoundsResponse).sounds;
        setSounds(nextSounds);
        if (!activeId && nextSounds[0]) {
          setActiveId(nextSounds[0].id);
          setEdit(nextSounds[0].userMetadata);
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Unable to load library.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [activeId, toast]);

  useAbortableFetch(load, [load]);

  const roots = workspace?.workspace.libraryRoots ?? [];
  const summary = workspace?.library.summary;

  const filteredSounds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sounds.filter((sound) => {
      if (filterMode === "favorites" && !sound.userMetadata.favorite) return false;
      if (filterMode === "edited" && !sound.userMetadata.updatedAt) return false;
      if (!q) return true;
      const haystack = [
        sound.fileName,
        sound.relativePath,
        sound.promptCandidate,
        sound.tags.join(" "),
        sound.userMetadata.tags.join(" "),
        sound.userMetadata.title,
        sound.userMetadata.category,
        sound.userMetadata.prompt,
        sound.userMetadata.notes,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [filterMode, query, sounds]);

  const selectSound = (sound: LocalSound) => {
    setActiveId(sound.id);
    setEdit(sound.userMetadata);
  };

  const indexFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/local/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to add folder.");
      setFolderPath("");
      toast.success(`Indexed ${data.summary?.sounds ?? 0} sounds`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add folder.");
    } finally {
      setBusy(false);
    }
  };

  const rescan = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/local/libraries", { method: "PUT" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to rescan folders.");
      toast.success(`Rescanned ${data.summary?.sounds ?? 0} sounds`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rescan folders.");
    } finally {
      setBusy(false);
    }
  };

  const removeRoot = async (root: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/local/libraries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: root }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to remove folder.");
      toast.success("Folder removed");
      setSelectedIds(new Set());
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove folder.");
    } finally {
      setBusy(false);
    }
  };

  const patchSound = async (soundId: string, updates: Partial<UserMetadata>) => {
    const response = await fetch(`/api/local/sounds/${encodeURIComponent(soundId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to update sound.");
    setSounds((prev) => prev.map((sound) => sound.id === soundId ? data.sound : sound));
    if (soundId === activeId) setEdit(data.sound.userMetadata);
    return data.sound as LocalSound;
  };

  const saveActive = async () => {
    if (!activeSound) return;
    setBusy(true);
    try {
      await patchSound(activeSound.id, edit);
      toast.success("Sound metadata saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save metadata.");
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async (sound: LocalSound) => {
    try {
      await patchSound(sound.id, { favorite: !sound.userMetadata.favorite });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update favorite.");
    }
  };

  const batchApply = async () => {
    const soundIds = Array.from(selectedIds);
    if (soundIds.length === 0) return;
    const updates: Partial<UserMetadata> = {};
    const tags = parseTags(batchTags);
    if (tags.length > 0) updates.tags = tags;
    if (batchCategory.trim()) updates.category = batchCategory.trim();
    if (Object.keys(updates).length === 0) return;

    setBusy(true);
    try {
      const response = await fetch("/api/local/sounds/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundIds, updates }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to batch edit sounds.");
      const updatedById = new Map((data.sounds as LocalSound[]).map((sound) => [sound.id, sound]));
      setSounds((prev) => prev.map((sound) => updatedById.get(sound.id) ?? sound));
      setBatchTags("");
      setBatchCategory("");
      toast.success(`Updated ${data.sounds.length} sounds`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to batch edit sounds.");
    } finally {
      setBusy(false);
    }
  };

  const derivePromptFromActive = async () => {
    if (!activeSound) return;
    setBusy(true);
    try {
      const response = await fetch("/api/local/assets/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "metadata-to-prompt", assetIds: [`local:${activeSound.id}`] }),
      });
      const data = await response.json() as PromptToolResult;
      if (!response.ok) throw new Error("Unable to derive prompt.");
      const prompt = data.results?.[0]?.result?.prompt ?? activeSound.promptCandidate;
      setEdit((prev) => ({ ...prev, prompt }));
      toast.success("Prompt updated from metadata");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to derive prompt.");
    } finally {
      setBusy(false);
    }
  };

  const deriveMetadataFromActivePrompt = async () => {
    const prompt = edit.prompt?.trim() || activeSound?.promptCandidate || "";
    if (!prompt) return;
    setBusy(true);
    try {
      const response = await fetch("/api/local/assets/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "prompt-to-metadata", prompt }),
      });
      const data = await response.json() as PromptToolResult;
      if (!response.ok) throw new Error("Unable to derive metadata.");
      const metadata = data.result?.metadata ?? {};
      setEdit((prev) => ({
        ...prev,
        category: metadata.category ?? prev.category,
        subcategory: metadata.subcategory ?? prev.subcategory,
        action: metadata.action ?? prev.action,
        material: metadata.material ?? prev.material,
        mood: metadata.mood ?? prev.mood,
        acousticSpace: metadata.acousticSpace ?? prev.acousticSpace,
        layerType: metadata.layerType ?? prev.layerType,
        frequencyRole: metadata.frequencyRole ?? prev.frequencyRole,
        tags: metadata.tags?.length ? metadata.tags : prev.tags,
      }));
      toast.success("Metadata filled from prompt");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to derive metadata.");
    } finally {
      setBusy(false);
    }
  };

  const runPromptTool = async (direction: "metadata-to-prompt" | "prompt-to-metadata") => {
    setBusy(true);
    try {
      let body: Record<string, unknown>;
      if (direction === "prompt-to-metadata") {
        body = { direction, prompt: toolPrompt };
      } else {
        body = { direction, metadata: JSON.parse(toolMetadata || "{}") };
      }
      const response = await fetch("/api/local/assets/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Tool failed.");
      setToolOutput(JSON.stringify(data.result, null, 2));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to run prompt tool.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const play = (sound: LocalSound) => {
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Folders" value={summary?.roots ?? 0} />
        <Metric label="Sounds" value={summary?.sounds ?? 0} />
        <Metric label="Favorites" value={summary?.favorites ?? 0} />
        <Metric label="Size" value={formatBytes(summary?.totalBytes ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="atlas-card p-4">
            <form onSubmit={indexFolder} className="flex flex-col gap-2 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <FolderPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atlas-text-dim" />
                <input
                  value={folderPath}
                  onChange={(event) => setFolderPath(event.target.value)}
                  placeholder="/path/to/Sounds/library"
                  className="w-full rounded-xl border border-atlas-border bg-atlas-bg py-2.5 pl-9 pr-3 text-sm text-atlas-text outline-none transition-colors placeholder:text-atlas-text-dim focus:border-atlas-accent"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !folderPath.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                Add Folder
              </button>
              <button
                type="button"
                onClick={rescan}
                disabled={busy || roots.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-atlas-border bg-atlas-surface px-4 py-2.5 text-sm font-semibold text-atlas-text transition-colors hover:border-atlas-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Rescan
              </button>
            </form>

            {roots.length > 0 && (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {roots.map((root) => (
                  <div key={root} className="flex min-w-0 items-center gap-2 rounded-lg border border-atlas-border-subtle bg-atlas-bg px-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-atlas-text-muted">{root}</span>
                    <button
                      type="button"
                      onClick={() => removeRoot(root)}
                      className="rounded-md p-1.5 text-atlas-text-dim transition-colors hover:bg-atlas-surface-hover hover:text-atlas-danger"
                      aria-label="Remove folder"
                    >
                      <FolderMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="atlas-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-atlas-border-subtle p-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-atlas-text-dim" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search filenames, tags, prompts, notes"
                  className="w-full rounded-lg border border-atlas-border bg-atlas-bg py-2 pl-8 pr-3 text-xs text-atlas-text outline-none placeholder:text-atlas-text-dim focus:border-atlas-accent"
                />
              </div>
              <div className="flex gap-1 rounded-lg bg-atlas-surface-hover/50 p-0.5">
                {(["all", "favorites", "edited"] as FilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                      filterMode === mode ? "bg-atlas-surface text-atlas-accent" : "text-atlas-text-muted hover:text-atlas-text",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="grid gap-2 border-b border-atlas-border-subtle bg-atlas-accent-muted/20 p-3 md:grid-cols-[auto_1fr_1fr_auto] md:items-center">
                <div className="text-xs font-semibold text-atlas-accent tabular-nums">{selectedIds.size} selected</div>
                <input
                  value={batchTags}
                  onChange={(event) => setBatchTags(event.target.value)}
                  placeholder="batch tags, comma separated"
                  className="rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text outline-none focus:border-atlas-accent"
                />
                <input
                  value={batchCategory}
                  onChange={(event) => setBatchCategory(event.target.value)}
                  placeholder="batch category"
                  className="rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text outline-none focus:border-atlas-accent"
                />
                <button
                  type="button"
                  onClick={batchApply}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-atlas-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Tags className="h-3.5 w-3.5" />
                  Apply
                </button>
              </div>
            )}

            <div className="max-h-[720px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center p-12 text-sm text-atlas-text-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading library
                </div>
              ) : filteredSounds.length === 0 ? (
                <div className="p-12 text-center">
                  <Database className="mx-auto mb-3 h-9 w-9 text-atlas-text-dim" />
                  <div className="text-sm font-semibold text-atlas-text">No local sounds indexed</div>
                  <div className="mt-1 text-sm text-atlas-text-muted">Add a folder or adjust filters.</div>
                </div>
              ) : (
                <table className="w-full min-w-[920px]">
                  <thead className="sticky top-0 z-[1] bg-atlas-bg">
                    <tr className="border-b border-atlas-border-subtle">
                      <th className="w-9 px-2 py-2 text-left"></th>
                      <th className="w-10 px-2 py-2 text-left"></th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-dim">Sound</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-dim">Tags</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-dim">Metadata</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-atlas-text-dim">Tech</th>
                      <th className="w-24 px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-atlas-text-dim">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atlas-border-subtle">
                    {filteredSounds.map((sound) => {
                      const active = sound.id === activeId;
                      const selected = selectedIds.has(sound.id);
                      return (
                        <tr key={sound.id} className={cn("transition-colors hover:bg-atlas-surface-hover/40", active && "bg-atlas-accent-muted/20")}>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => toggleSelected(sound.id)} className="text-atlas-text-dim hover:text-atlas-accent" aria-label="Select sound">
                              {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => play(sound)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-accent text-white transition-colors hover:bg-atlas-accent-hover"
                              aria-label={playingId === sound.id ? "Pause sound" : "Play sound"}
                            >
                              {playingId === sound.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                          <td className="max-w-[320px] px-2 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleFavorite(sound)}
                                className={cn("text-atlas-text-dim transition-colors hover:text-atlas-accent", sound.userMetadata.favorite && "text-atlas-accent")}
                                aria-label="Toggle favorite"
                              >
                                <Star className={cn("h-3.5 w-3.5", sound.userMetadata.favorite && "fill-current")} />
                              </button>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-atlas-text">{sound.userMetadata.title ?? sound.fileName}</div>
                                <div className="truncate font-mono text-[10px] text-atlas-text-dim">{sound.relativePath}</div>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-[260px] px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              {[...sound.userMetadata.tags, ...sound.tags].slice(0, 6).map((tag) => (
                                <span key={tag} className="rounded bg-atlas-surface-hover px-1.5 py-0.5 text-[10px] text-atlas-text-muted">{tag}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              {sound.userMetadata.category && <Badge>{sound.userMetadata.category}</Badge>}
                              {sound.userMetadata.layerType && <Badge>{sound.userMetadata.layerType.replace(/_/g, " ")}</Badge>}
                              {sound.userMetadata.frequencyRole && <Badge>{sound.userMetadata.frequencyRole.replace(/_/g, " ")}</Badge>}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="text-[10px] text-atlas-text-muted">
                              <span className="uppercase">{sound.extension.replace(".", "")}</span>
                              {sound.metadata.durationSeconds ? <span className="ml-2 tabular-nums">{sound.metadata.durationSeconds.toFixed(1)}s</span> : null}
                              {sound.metadata.sampleRate ? <span className="ml-2 tabular-nums">{Math.round(sound.metadata.sampleRate / 1000)}k</span> : null}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => selectSound(sound)}
                              className="inline-flex items-center gap-1 rounded-lg border border-atlas-border px-2 py-1 text-[10px] font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent"
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="atlas-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
                <Edit3 className="h-3.5 w-3.5" />
                Sound Metadata
              </span>
              {activeSound && <span className="text-[10px] text-atlas-text-dim">{activeSound.extension.replace(".", "").toUpperCase()}</span>}
            </div>
            {activeSound ? (
              <div className="space-y-3">
                <Field label="Title" value={edit.title ?? ""} onChange={(value) => setEdit((prev) => ({ ...prev, title: value || null }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Category" value={edit.category ?? ""} onChange={(value) => setEdit((prev) => ({ ...prev, category: value || null }))} />
                  <Field label="Action" value={edit.action ?? ""} onChange={(value) => setEdit((prev) => ({ ...prev, action: value || null }))} />
                  <Field label="Material" value={edit.material ?? ""} onChange={(value) => setEdit((prev) => ({ ...prev, material: value || null }))} />
                  <Field label="Mood" value={edit.mood ?? ""} onChange={(value) => setEdit((prev) => ({ ...prev, mood: value || null }))} />
                </div>
                <SelectField label="Layer" value={edit.layerType ?? ""} options={STACKER_LAYER_TYPES} onChange={(value) => setEdit((prev) => ({ ...prev, layerType: value as StackerLayerType || null }))} />
                <SelectField label="Frequency" value={edit.frequencyRole ?? ""} options={FREQUENCY_ROLES} onChange={(value) => setEdit((prev) => ({ ...prev, frequencyRole: value as FrequencyRoleId || null }))} />
                <Field label="Tags" value={edit.tags.join(", ")} onChange={(value) => setEdit((prev) => ({ ...prev, tags: parseTags(value) }))} />
                <TextArea label="Prompt" value={edit.prompt ?? ""} rows={4} onChange={(value) => setEdit((prev) => ({ ...prev, prompt: value || null }))} />
                <TextArea label="Notes" value={edit.notes ?? ""} rows={3} onChange={(value) => setEdit((prev) => ({ ...prev, notes: value || null }))} />

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={derivePromptFromActive} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-atlas-border px-3 py-2 text-xs font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-50">
                    <Wand2 className="h-3.5 w-3.5" />
                    Metadata to Prompt
                  </button>
                  <button type="button" onClick={deriveMetadataFromActivePrompt} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-atlas-border px-3 py-2 text-xs font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-50">
                    <Sparkles className="h-3.5 w-3.5" />
                    Prompt to Metadata
                  </button>
                </div>
                <button type="button" onClick={saveActive} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-atlas-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-atlas-accent-hover disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Sound
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-atlas-border-subtle p-5 text-sm text-atlas-text-muted">Select a sound to edit.</div>
            )}
          </div>

          <div className="atlas-card p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">
              <Wand2 className="h-3.5 w-3.5" />
              Prompt Tools
            </div>
            <div className="space-y-3">
              <TextArea label="Prompt Input" value={toolPrompt} rows={4} onChange={setToolPrompt} />
              <button type="button" onClick={() => runPromptTool("prompt-to-metadata")} disabled={busy || !toolPrompt.trim()} className="w-full rounded-lg border border-atlas-border px-3 py-2 text-xs font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-50">
                Prompt to Metadata
              </button>
              <TextArea label="Metadata JSON" value={toolMetadata} rows={5} onChange={setToolMetadata} />
              <button type="button" onClick={() => runPromptTool("metadata-to-prompt")} disabled={busy} className="w-full rounded-lg border border-atlas-border px-3 py-2 text-xs font-semibold text-atlas-text-muted transition-colors hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-50">
                Metadata to Prompt
              </button>
              <TextArea label="Output" value={toolOutput} rows={7} onChange={setToolOutput} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-atlas-border-subtle bg-atlas-bg/70 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</div>
      <div className="mt-1 text-lg font-semibold text-atlas-text tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text outline-none focus:border-atlas-accent" />
    </label>
  );
}

function TextArea({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full resize-none rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 font-mono text-xs leading-relaxed text-atlas-text outline-none focus:border-atlas-accent" />
    </label>
  );
}

function SelectField<T extends readonly string[]>({ label, value, options, onChange }: { label: string; value: string; options: T; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-text-dim">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-xs text-atlas-text outline-none focus:border-atlas-accent">
        <option value="">Auto</option>
        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-atlas-accent-muted px-1.5 py-0.5 text-[10px] text-atlas-accent">{children}</span>;
}

function parseTags(value: string): string[] {
  return Array.from(new Set(value.split(/[,;|]/).map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 48);
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
