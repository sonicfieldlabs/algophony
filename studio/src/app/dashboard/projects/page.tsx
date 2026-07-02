"use client";

import { useState, useCallback } from "react";
import { useAbortableFetch } from "@/lib/hooks/use-abortable-fetch";
import { FolderKanban, Plus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { ReferencePaletteBuilder } from "./ReferencePaletteBuilder";

interface Project {
  id: string;
  name: string;
  medium: string | null;
  description: string | null;
  tags: string[];
  defaultExclusions: string[];
  favoriteCategories: string[];
  defaultPromptInfluence: number;
  defaultDuration: number;
  sonicBrief: string;
  created_at: string;
  updated_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeProject(row: Record<string, unknown>): Project {
  const settings = isRecord(row.default_settings) ? row.default_settings : {};
  const sonicBrief = isRecord(row.sonic_brief) && typeof row.sonic_brief.text === "string"
    ? row.sonic_brief.text
    : "";

  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "Untitled project"),
    medium: typeof row.medium === "string" ? row.medium : null,
    description: typeof row.description === "string" ? row.description : null,
    tags: stringArray(settings.tags),
    defaultExclusions: stringArray(settings.defaultExclusions),
    favoriteCategories: stringArray(settings.favoriteCategories),
    defaultPromptInfluence: typeof settings.defaultPromptInfluence === "number" ? settings.defaultPromptInfluence : 0.3,
    defaultDuration: typeof settings.defaultDuration === "number" ? settings.defaultDuration : 4,
    sonicBrief,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

const MEDIUMS = ["film", "game", "podcast", "animation", "music", "installation", "app", "theater", "other"];

export default function ProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newMedium, setNewMedium] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [newSonicBrief, setNewSonicBrief] = useState("");

  useAbortableFetch(async (signal) => {
    try {
      const r = await fetch("/api/projects", { signal });
      const data = await r.json();
      if (signal.aborted) return;
      setProjects(Array.isArray(data.projects) ? data.projects.map(normalizeProject) : []);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("[projects] fetch failed:", err);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  const addTag = () => {
    const t = newTagInput.trim().toLowerCase();
    if (t && !newTags.includes(t)) setNewTags([...newTags, t]);
    setNewTagInput("");
  };

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          medium: newMedium || undefined,
          description: newDescription || undefined,
          sonic_brief: { text: newSonicBrief },
          default_settings: {
            tags: newTags,
            defaultExclusions: ["no music", "no dialogue"],
            favoriteCategories: [],
            defaultPromptInfluence: 0.3,
            defaultDuration: 4,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects([normalizeProject(data.project), ...projects]);
        toast.success(`Project "${newName}" created`);
      } else {
        toast.error(data.error || "Failed to create project");
      }
    } catch { toast.error("Network error"); }

    setNewName(""); setNewMedium(""); setNewDescription(""); setNewTags([]); setNewSonicBrief("");
    setShowCreate(false);
    setCreating(false);
  }, [newName, newMedium, newDescription, newTags, newSonicBrief, projects, toast]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
        toast.success("Project deleted");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete project");
      }
    } catch {
      toast.error("Network error");
    }
  }, [projects, toast]);

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-atlas-accent" />
          <h1 className="text-xl font-semibold text-atlas-text">Projects</h1>
          <span className="text-xs text-atlas-text-dim atlas-card px-2 py-0.5">{projects.length} projects</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-atlas-accent px-3 py-1.5 text-xs text-white hover:bg-atlas-accent-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Project
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="atlas-card p-5 mb-5 space-y-4 animate-expand-down">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">New Project</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-atlas-text-dim mb-1">Name *</label>
              <input
                value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-atlas-text-dim mb-1">Medium</label>
              <div className="flex flex-wrap gap-1">
                {MEDIUMS.map((m) => (
                  <button
                    key={m} onClick={() => setNewMedium(newMedium === m ? "" : m)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                      newMedium === m
                        ? "bg-atlas-accent-muted text-atlas-accent ring-1 ring-atlas-accent/30"
                        : "bg-atlas-bg text-atlas-text-dim hover:text-atlas-text-muted border border-atlas-border-subtle"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-atlas-text-dim mb-1">Description</label>
            <textarea
              value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What is this project about..."
              rows={2}
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim resize-none focus:border-atlas-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-atlas-text-dim mb-1">Sonic Brief</label>
            <textarea
              value={newSonicBrief} onChange={(e) => setNewSonicBrief(e.target.value)}
              placeholder="Overall sonic direction, aesthetic goals, references..."
              rows={2}
              className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder-atlas-text-dim resize-none focus:border-atlas-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-atlas-text-dim mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {newTags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-atlas-surface-hover px-2 py-0.5 text-xs text-atlas-text ring-1 ring-atlas-border">
                  {t}
                  <button onClick={() => setNewTags(newTags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Add tag..."
                className="flex-1 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim"
              />
              <button onClick={addTag} className="rounded-lg bg-atlas-surface-hover px-3 py-1.5 text-xs text-atlas-text-muted hover:text-atlas-text">Add</button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate} disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-atlas-accent px-4 py-2 text-xs font-medium text-white hover:bg-atlas-accent-hover disabled:opacity-40 transition-colors"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Project
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-atlas-border px-4 py-2 text-xs text-atlas-text-muted hover:text-atlas-text transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-atlas-text-dim" /></div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <FolderKanban className="h-10 w-10 text-atlas-text-dim mb-3" />
          <p className="text-sm text-atlas-text-muted">No projects yet. Create one to organize your cards, sounds, and tags.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-stagger>
          {projects.map((p) => (
            <div key={p.id} className="atlas-card atlas-card-interactive p-4 group relative">
              <Link href={`/dashboard/projects/${p.id}`} className="block">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-atlas-text group-hover:text-atlas-accent transition-colors">{p.name}</h3>
                    {p.medium && <span className="text-xs text-atlas-text-dim capitalize">{p.medium}</span>}
                  </div>
                  <span className="text-xs text-atlas-text-dim">{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
                {p.description && <p className="text-xs text-atlas-text-muted line-clamp-2 mb-2">{p.description}</p>}
                {p.sonicBrief && <p className="text-xs text-atlas-text-dim italic line-clamp-1 mb-2">&ldquo;{p.sonicBrief}&rdquo;</p>}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tags.slice(0, 5).map((t) => (
                      <span key={t} className="rounded-full bg-atlas-surface-hover px-1.5 py-0.5 text-xs text-atlas-text ring-1 ring-atlas-border-subtle">{t}</span>
                    ))}
                    {p.tags.length > 5 && <span className="text-xs text-atlas-text-dim">+{p.tags.length - 5}</span>}
                  </div>
                )}
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); void deleteProject(p.id); }}
                className="absolute top-3 right-3 p-1 text-atlas-text-dim hover:text-atlas-danger opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sonic Palettes */}
      <div className="mt-6">
        <ReferencePaletteBuilder />
      </div>
    </div>
  );
}
