"use client";

import { useState, useMemo, useCallback } from "react";
import { Tags as TagsIcon, Plus, Trash2, Filter, LayoutGrid, List, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/dashboard/toast";
import { DEFAULT_EXCLUSIONS } from "@/lib/sfx/taxonomy";
import { EVALUATION_TAGS } from "@/lib/sfx/evaluations";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "atlas-tags";

interface UserTag {
  id: string;
  name: string;
  type: "category" | "exclusion" | "custom" | "evaluation";
  group?: string;
  frequency: number;
  createdAt: number;
}

// Grayscale tag pills — type is encoded with weight + outline, not hue.
// `category` is the "primary" type and gets the strongest treatment;
// custom/exclusion/evaluation are progressively lighter so the cloud still
// has visual hierarchy without color.
const TAG_TYPE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  category: { bg: "bg-atlas-text", text: "text-atlas-bg", ring: "ring-atlas-text/40" },
  exclusion: { bg: "bg-atlas-bg", text: "text-atlas-text", ring: "ring-atlas-text/40" },
  custom: { bg: "bg-atlas-surface-hover", text: "text-atlas-text", ring: "ring-atlas-border" },
  evaluation: { bg: "bg-atlas-surface", text: "text-atlas-text-muted", ring: "ring-atlas-border-subtle" },
};

function loadTags(): UserTag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Seed with defaults
  const seed: UserTag[] = [
    ...DEFAULT_EXCLUSIONS.map((name, i) => ({
      id: `excl-${i}`,
      name,
      type: "exclusion" as const,
      frequency: 0,
      createdAt: Date.now(),
    })),
    ...(EVALUATION_TAGS as readonly string[]).map((name, i) => ({
      id: `eval-${i}`,
      name,
      type: "evaluation" as const,
      frequency: 0,
      createdAt: Date.now(),
    })),
  ];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

function saveTags(tags: UserTag[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tags)); } catch {}
}

export default function TagsPage() {
  const toast = useToast();
  const router = useRouter();
  const [tags, setTags] = useState<UserTag[]>(() => loadTags());
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<UserTag["type"]>("custom");
  const [newTagGroup, setNewTagGroup] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [view, setView] = useState<"cloud" | "list">("cloud");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const groups = useMemo(() => {
    const g = new Set<string>();
    tags.forEach((t) => { if (t.group) g.add(t.group); });
    return [...g].sort();
  }, [tags]);

  const filtered = useMemo(() => {
    let result = tags;
    if (filterType !== "all") result = result.filter((t) => t.type === filterType);
    if (filterGroup !== "all") result = result.filter((t) => t.group === filterGroup);
    return result;
  }, [tags, filterType, filterGroup]);

  const maxFreq = useMemo(() => Math.max(1, ...filtered.map((t) => t.frequency)), [filtered]);

  const addTag = useCallback(() => {
    const name = newTagName.trim().toLowerCase();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      toast.error("Tag already exists");
      return;
    }
    const newTag: UserTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type: newTagType,
      group: newTagGroup.trim() || undefined,
      frequency: 0,
      createdAt: Date.now(),
    };
    const updated = [newTag, ...tags];
    setTags(updated);
    saveTags(updated);
    setNewTagName("");
    toast.success(`Tag "${name}" created`);
  }, [newTagName, newTagType, newTagGroup, tags, toast]);

  const deleteTag = useCallback((id: string) => {
    const updated = tags.filter((t) => t.id !== id);
    setTags(updated);
    saveTags(updated);
    toast.success("Tag deleted");
  }, [tags, toast]);

  const saveEdit = useCallback((id: string) => {
    const name = editName.trim().toLowerCase();
    if (!name) return;
    const updated = tags.map((t) => (t.id === id ? { ...t, name } : t));
    setTags(updated);
    saveTags(updated);
    setEditingId(null);
    toast.success("Tag renamed");
  }, [editName, tags, toast]);

  const handleTagClick = useCallback((tag: UserTag) => {
    if (tag.type === "exclusion") {
      router.push(`/dashboard/generate`);
    } else if (tag.type === "category") {
      router.push(`/dashboard/generate?category=${encodeURIComponent(tag.name)}`);
    } else {
      router.push(`/dashboard/generate?text=${encodeURIComponent(tag.name)}`);
    }
  }, [router]);

  const getTagSize = (freq: number): string => {
    const ratio = freq / maxFreq;
    if (ratio > 0.8) return "text-xl";
    if (ratio > 0.5) return "text-base";
    if (ratio > 0.2) return "text-sm";
    return "text-xs";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-atlas-accent-muted">
            <TagsIcon className="h-5 w-5 text-atlas-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-atlas-text">Tags</h1>
            <p className="text-xs text-atlas-text-dim">{filtered.length} tags</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("cloud")}
            className={cn("rounded-lg p-1.5 transition-colors", view === "cloud" ? "bg-atlas-accent-muted text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-text-muted")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("rounded-lg p-1.5 transition-colors", view === "list" ? "bg-atlas-accent-muted text-atlas-accent" : "text-atlas-text-dim hover:text-atlas-text-muted")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create tag */}
      <div className="atlas-card p-4 mb-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Create Tag</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Tag name..."
            className="flex-1 min-w-[180px] rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-sm text-atlas-text placeholder-atlas-text-dim focus:border-atlas-accent focus:outline-none"
          />
          <select
            value={newTagType}
            onChange={(e) => setNewTagType(e.target.value as UserTag["type"])}
            className="rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text"
          >
            <option value="custom">Custom</option>
            <option value="category">Category</option>
            <option value="exclusion">Exclusion</option>
            <option value="evaluation">Evaluation</option>
          </select>
          <input
            value={newTagGroup}
            onChange={(e) => setNewTagGroup(e.target.value)}
            placeholder="Group (optional)"
            className="w-36 rounded-lg border border-atlas-border bg-atlas-bg px-3 py-1.5 text-xs text-atlas-text placeholder-atlas-text-dim"
          />
          <button
            onClick={addTag}
            className="flex items-center gap-1 rounded-lg bg-atlas-accent px-3 py-1.5 text-xs text-white hover:bg-atlas-accent-hover transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-1.5 text-xs text-atlas-text-dim">
          <Filter className="h-3 w-3" /> Filter:
        </div>
        {["all", "category", "exclusion", "custom", "evaluation"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs transition-colors",
              filterType === t ? "bg-atlas-accent-muted text-atlas-accent" : "bg-atlas-surface text-atlas-text-dim hover:text-atlas-text-muted"
            )}
          >
            {t}
          </button>
        ))}
        {groups.length > 0 && (
          <>
            <span className="text-atlas-border">|</span>
            <button
              onClick={() => setFilterGroup("all")}
              className={cn("rounded-full px-2.5 py-0.5 text-xs transition-colors", filterGroup === "all" ? "bg-atlas-accent-muted text-atlas-accent" : "bg-atlas-surface text-atlas-text-dim")}
            >
              all groups
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={cn("rounded-full px-2.5 py-0.5 text-xs transition-colors", filterGroup === g ? "bg-atlas-accent-muted text-atlas-accent" : "bg-atlas-surface text-atlas-text-dim")}
              >
                {g}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Tag Cloud View */}
      {view === "cloud" && (
        <div className="atlas-card p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <TagsIcon className="h-8 w-8 text-atlas-text-dim mb-2" />
              <p className="text-sm text-atlas-text-muted">No tags yet.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center items-center" data-stagger>
              {filtered.map((tag) => {
                const colors = TAG_TYPE_COLORS[tag.type] || TAG_TYPE_COLORS.custom;
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag)}
                    className={cn(
                      "rounded-full px-3 py-1 font-medium transition-all duration-200",
                      "hover:scale-110 hover:shadow-sm active:scale-95",
                      "ring-1",
                      colors.bg,
                      colors.text,
                      colors.ring,
                      getTagSize(tag.frequency)
                    )}
                    title={`${tag.name} (${tag.type}${tag.group ? ` · ${tag.group}` : ""}) — ${tag.frequency} uses`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="overflow-hidden atlas-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-surface-hover/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Group</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-atlas-text-dim">Uses</th>
                <th className="px-4 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atlas-border-subtle">
              {filtered.map((tag) => {
                const colors = TAG_TYPE_COLORS[tag.type] || TAG_TYPE_COLORS.custom;
                return (
                  <tr key={tag.id} className="bg-atlas-bg hover:bg-atlas-surface transition-colors">
                    <td className="px-4 py-2.5">
                      {editingId === tag.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(tag.id); if (e.key === "Escape") setEditingId(null); }}
                          onBlur={() => saveEdit(tag.id)}
                          autoFocus
                          className="rounded border border-atlas-accent bg-atlas-bg px-2 py-0.5 text-sm text-atlas-text"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                          className="text-sm text-atlas-text hover:text-atlas-accent transition-colors"
                        >
                          {tag.name}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", colors.bg, colors.text)}>{tag.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-atlas-text-dim">{tag.group || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-atlas-text-muted tabular-nums">{tag.frequency}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleTagClick(tag)} className="p-1 text-atlas-text-dim hover:text-atlas-accent transition-colors" title="Use in Generate">
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteTag(tag.id)} className="p-1 text-atlas-text-dim hover:text-atlas-danger transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
