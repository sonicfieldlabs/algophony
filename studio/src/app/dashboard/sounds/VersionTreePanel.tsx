"use client";

import { useState } from "react";
import {
  GitBranch, ChevronDown, ChevronRight, Plus, Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VERSION_STATUSES,
  buildVersionTree, loadVersionTrees, saveVersionTree,
  deleteVersionTree, updateNodeStatus, diffVersions,
  type VersionTree, type VersionNode, type VersionStatus,
} from "@/lib/sfx/version-control";

interface VersionTreePanelProps {
  generations: Array<{
    id: string;
    request_payload: Record<string, unknown>;
    user_verdict: string | null;
    failure_reason: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    duration_seconds: number | null;
  }>;
}

export function VersionTreePanel({ generations }: VersionTreePanelProps) {
  const [trees, setTrees] = useState<VersionTree[]>(loadVersionTrees);
  const [expandedTree, setExpandedTree] = useState<string | null>(null);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [selectedGens, setSelectedGens] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [diffPair, setDiffPair] = useState<[string, string] | null>(null);

  const handleCreate = () => {
    if (!newFamilyName.trim() || selectedGens.size < 2) return;
    const gens = generations.filter((g) => selectedGens.has(g.id));
    const tree = buildVersionTree(newFamilyName, gens);
    saveVersionTree(tree);
    setTrees(loadVersionTrees());
    setNewFamilyName("");
    setSelectedGens(new Set());
    setShowCreate(false);
    setExpandedTree(tree.id);
  };

  const handleDelete = (id: string) => {
    deleteVersionTree(id);
    setTrees(loadVersionTrees());
    if (expandedTree === id) setExpandedTree(null);
  };

  const handleStatusChange = (treeId: string, nodeId: string, status: VersionStatus) => {
    const updated = updateNodeStatus(treeId, nodeId, status);
    if (updated) setTrees(loadVersionTrees());
  };

  const toggleGen = (id: string) => {
    setSelectedGens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="atlas-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-atlas-border-subtle">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-atlas-accent" />
          <h3 className="text-sm font-semibold text-atlas-text">Version Control</h3>
          <span className="text-xs text-atlas-text-dim">{trees.length} families</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-atlas-accent text-white hover:bg-atlas-accent-hover transition-all"
        >
          <Plus className="h-3 w-3" /> New Family
        </button>
      </div>

      {/* Create family */}
      {showCreate && (
        <div className="border-b border-atlas-border-subtle p-4 space-y-3 bg-atlas-surface-hover/30">
          <input
            value={newFamilyName}
            onChange={(e) => setNewFamilyName(e.target.value)}
            placeholder="Family name (e.g. Door_MetalCreak, UI_PrimaryTap)"
            className="w-full rounded-lg border border-atlas-border bg-atlas-bg px-3 py-2 text-sm text-atlas-text placeholder:text-atlas-text-dim/40 focus:border-atlas-accent focus:outline-none"
          />
          <div>
            <span className="text-xs text-atlas-text-dim font-medium uppercase tracking-wider">Select generations ({selectedGens.size})</span>
            <div className="mt-1.5 max-h-48 overflow-y-auto space-y-1">
              {generations.slice(0, 50).map((gen) => {
                const prompt = String((gen.request_payload as Record<string, unknown>).text ?? "").slice(0, 60);
                return (
                  <label key={gen.id} className="flex items-center gap-2 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedGens.has(gen.id)}
                      onChange={() => toggleGen(gen.id)}
                      className="h-3 w-3 rounded accent-atlas-accent"
                    />
                    <span className="text-xs text-atlas-text-muted group-hover:text-atlas-text truncate flex-1">
                      {prompt || "No prompt"}
                    </span>
                    <span className="text-xs text-atlas-text-dim shrink-0">{gen.user_verdict ?? "—"}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!newFamilyName.trim() || selectedGens.size < 2}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-atlas-accent py-2.5 text-sm font-medium text-white hover:bg-atlas-accent-hover transition-all disabled:opacity-50"
          >
            <GitBranch className="h-4 w-4" /> Create Family ({selectedGens.size} versions)
          </button>
        </div>
      )}

      {/* Trees */}
      <div className="divide-y divide-atlas-border-subtle">
        {trees.length === 0 && !showCreate && (
          <div className="p-8 text-center text-xs text-atlas-text-dim">
            No version families yet. Group related generations into a tree.
          </div>
        )}

        {trees.map((tree) => {
          const isExpanded = expandedTree === tree.id;
          const finalCount = tree.nodes.filter((n) => n.status === "final" || n.status === "approved").length;

          return (
            <div key={tree.id}>
              <button
                onClick={() => setExpandedTree(isExpanded ? null : tree.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-atlas-surface-hover/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-left">
                  <GitBranch className="h-3.5 w-3.5 text-atlas-accent shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-atlas-text">{tree.familyName}</span>
                    <p className="text-xs text-atlas-text-dim">{tree.nodes.length} versions · {finalCount} approved</p>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-atlas-text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-atlas-text-dim" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  {/* Version tree */}
                  <div className="space-y-0.5">
                    {tree.nodes.map((node, idx) => {
                      const statusDef = VERSION_STATUSES.find((s) => s.id === node.status);
                      const depth = getNodeDepth(node, tree.nodes);
                      const isLast = idx === tree.nodes.length - 1 || getNodeDepth(tree.nodes[idx + 1], tree.nodes) <= depth;

                      return (
                        <div key={node.id} className="flex items-start gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                          {/* Tree connector */}
                          <div className="flex flex-col items-center shrink-0 w-4 pt-1">
                            {depth > 0 && (
                              <div className={cn("w-px h-3", isLast ? "bg-atlas-border-subtle" : "bg-atlas-border-subtle")} />
                            )}
                            <div className={cn("w-2 h-2 rounded-full shrink-0", statusDef?.bg ?? "bg-atlas-surface-hover")} />
                          </div>

                          <div className="flex-1 min-w-0 rounded-lg border border-atlas-border-subtle/50 p-2 hover:bg-atlas-surface-hover/20 transition-colors">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-mono font-bold text-atlas-text">{node.versionLabel}</span>
                              {/* Status selector */}
                              <select
                                value={node.status}
                                onChange={(e) => handleStatusChange(tree.id, node.id, e.target.value as VersionStatus)}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-xs font-medium uppercase border-0 cursor-pointer",
                                  statusDef?.bg, statusDef?.color
                                )}
                              >
                                {VERSION_STATUSES.map((s) => (
                                  <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                              </select>
                              {node.promptInfluence != null && (
                                <span className="text-xs text-atlas-text-dim">PI {node.promptInfluence}</span>
                              )}
                              {node.duration != null && (
                                <span className="text-xs text-atlas-text-dim">{node.duration}s</span>
                              )}
                            </div>
                            <p className="text-xs text-atlas-text-muted font-mono truncate">{node.prompt.slice(0, 80)}</p>
                            {node.notes && <p className="text-xs text-atlas-text-dim italic mt-0.5">{node.notes}</p>}
                            {node.failureReason && (
                              <p className="text-xs text-red-400 mt-0.5">Rejected: {node.failureReason}</p>
                            )}

                            {/* Diff with previous */}
                            {idx > 0 && (
                              <button
                                onClick={() => {
                                  const prev = tree.nodes[idx - 1];
                                  const diff = diffVersions(prev, node);
                                  setDiffPair(null); // reset
                                  // Show diff inline
                                  setDiffPair([
                                    diff.promptChanges.join(" | ") + (diff.settingChanges.length ? " • " + diff.settingChanges.join(", ") : ""),
                                    diff.statusChange ?? "",
                                  ]);
                                }}
                                className="text-xs text-atlas-accent hover:underline mt-0.5 flex items-center gap-0.5"
                              >
                                <ArrowRight className="h-2.5 w-2.5" /> diff from {tree.nodes[idx - 1].versionLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Diff result */}
                  {diffPair && (diffPair[0] || diffPair[1]) && (
                    <div className="mt-2 rounded-lg bg-atlas-accent/5 border border-atlas-accent/20 p-2">
                      {diffPair[0] && <p className="text-xs text-atlas-text font-mono">{diffPair[0]}</p>}
                      {diffPair[1] && <p className="text-xs text-atlas-accent">{diffPair[1]}</p>}
                    </div>
                  )}

                  <button onClick={() => handleDelete(tree.id)} className="mt-2 flex items-center gap-1.5 text-xs text-red-400 hover:underline">
                    <Trash2 className="h-3 w-3" /> Delete Family
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getNodeDepth(node: VersionNode, allNodes: VersionNode[]): number {
  let depth = 0;
  let current = node;
  while (current.parentId) {
    const parent = allNodes.find((n) => n.id === current.parentId);
    if (!parent) break;
    current = parent;
    depth++;
  }
  return depth;
}
