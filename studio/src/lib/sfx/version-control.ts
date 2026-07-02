/**
 * Algophony Studio — Sonic Version Control
 *
 * Treats sound design as versioned creative work.
 * Builds lineage trees from generation history, tracking
 * prompt evolution, verdicts, and version status.
 *
 * Placement: Sounds / Library page
 */

// ── Version Statuses ─────────────────────────────────────────

export type VersionStatus =
  | "rough"
  | "wip"
  | "candidate"
  | "approved"
  | "final"
  | "rejected"
  | "archived";

export const VERSION_STATUSES: Array<{
  id: VersionStatus;
  label: string;
  color: string;
  bg: string;
}> = [
  { id: "rough", label: "Rough", color: "text-slate-400", bg: "bg-slate-400/10" },
  { id: "wip", label: "WIP", color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "candidate", label: "Candidate", color: "text-purple-400", bg: "bg-purple-400/10" },
  { id: "approved", label: "Approved", color: "text-green-400", bg: "bg-green-400/10" },
  { id: "final", label: "Final", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { id: "rejected", label: "Rejected", color: "text-red-400", bg: "bg-red-400/10" },
  { id: "archived", label: "Archived", color: "text-atlas-text-dim", bg: "bg-atlas-surface-hover" },
];

// ── Version Node ─────────────────────────────────────────────

export interface VersionNode {
  id: string;
  generationId: string;
  prompt: string;
  versionLabel: string;
  status: VersionStatus;
  notes: string;
  parentId: string | null;
  children: VersionNode[];
  createdAt: string;
  verdict: string | null;
  failureReason: string | null;
  promptInfluence: number | null;
  duration: number | null;
}

export interface VersionTree {
  id: string;
  familyName: string;
  rootPrompt: string;
  nodes: VersionNode[];
  createdAt: string;
  updatedAt: string;
}

// ── Tree Builder ─────────────────────────────────────────────

/**
 * Build a version tree from related generations.
 * Groups by prompt similarity and parent-child relationships.
 */
export function buildVersionTree(
  familyName: string,
  generations: Array<{
    id: string;
    request_payload: Record<string, unknown>;
    user_verdict: string | null;
    failure_reason: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    duration_seconds: number | null;
  }>
): VersionTree {
  // Sort by creation time
  const sorted = [...generations].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const nodes: VersionNode[] = sorted.map((gen, i) => {
    const payload = gen.request_payload ?? {};
    const meta = gen.metadata ?? {};
    const prompt = String(payload.text ?? "");
    const parentGenId = String(meta.parentGenerationId ?? meta.sourceGenerationId ?? "");

    return {
      id: `vn-${gen.id}`,
      generationId: gen.id,
      prompt,
      versionLabel: `v${String(i + 1).padStart(2, "0")}`,
      status: inferStatus(gen.user_verdict, gen.failure_reason),
      notes: String(meta.versionNotes ?? ""),
      parentId: parentGenId
        ? sorted.find((s) => s.id === parentGenId) ? `vn-${parentGenId}` : null
        : null,
      children: [],
      createdAt: gen.created_at,
      verdict: gen.user_verdict,
      failureReason: gen.failure_reason,
      promptInfluence: payload.prompt_influence != null ? Number(payload.prompt_influence) : null,
      duration: gen.duration_seconds,
    };
  });

  // Build parent-child relationships
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    }
  }

  const now = new Date().toISOString();
  return {
    id: `vt-${crypto.randomUUID().slice(0, 8)}`,
    familyName,
    rootPrompt: nodes[0]?.prompt ?? "",
    nodes,
    createdAt: sorted[0]?.created_at ?? now,
    updatedAt: sorted[sorted.length - 1]?.created_at ?? now,
  };
}

function inferStatus(
  verdict: string | null,
  failureReason: string | null
): VersionStatus {
  if (verdict === "rejected" || failureReason) return "rejected";
  if (verdict === "approved" || verdict === "accepted") return "approved";
  if (verdict === "final") return "final";
  return "rough";
}

// ── Version Diff ─────────────────────────────────────────────

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  promptChanges: string[];
  settingChanges: string[];
  statusChange: string | null;
}

/**
 * Compute a human-readable diff between two versions.
 */
export function diffVersions(a: VersionNode, b: VersionNode): VersionDiff {
  const promptChanges: string[] = [];
  const settingChanges: string[] = [];

  // Prompt text diff
  if (a.prompt !== b.prompt) {
    // Find words added/removed
    const aWords = new Set(a.prompt.toLowerCase().split(/[\s,]+/).filter(Boolean));
    const bWords = new Set(b.prompt.toLowerCase().split(/[\s,]+/).filter(Boolean));
    const added = [...bWords].filter((w) => !aWords.has(w));
    const removed = [...aWords].filter((w) => !bWords.has(w));
    if (added.length > 0) promptChanges.push(`Added: ${added.slice(0, 5).join(", ")}`);
    if (removed.length > 0) promptChanges.push(`Removed: ${removed.slice(0, 5).join(", ")}`);
  }

  if (a.promptInfluence !== b.promptInfluence) {
    settingChanges.push(`PI: ${a.promptInfluence ?? "?"} → ${b.promptInfluence ?? "?"}`);
  }
  if (a.duration !== b.duration) {
    settingChanges.push(`Duration: ${a.duration ?? "?"}s → ${b.duration ?? "?"}s`);
  }

  return {
    fromVersion: a.versionLabel,
    toVersion: b.versionLabel,
    promptChanges,
    settingChanges,
    statusChange: a.status !== b.status ? `${a.status} → ${b.status}` : null,
  };
}

// ── Persistence ──────────────────────────────────────────────

const TREES_KEY = "algophony-studio-version-trees";

export function loadVersionTrees(): VersionTree[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TREES_KEY) ?? "[]");
  } catch { return []; }
}

export function saveVersionTree(tree: VersionTree): void {
  const trees = loadVersionTrees();
  const idx = trees.findIndex((t) => t.id === tree.id);
  if (idx >= 0) trees[idx] = tree; else trees.push(tree);
  localStorage.setItem(TREES_KEY, JSON.stringify(trees));
}

export function deleteVersionTree(id: string): void {
  const trees = loadVersionTrees().filter((t) => t.id !== id);
  localStorage.setItem(TREES_KEY, JSON.stringify(trees));
}

/**
 * Update a node's status within a tree.
 */
export function updateNodeStatus(
  treeId: string,
  nodeId: string,
  status: VersionStatus,
  notes?: string
): VersionTree | null {
  const trees = loadVersionTrees();
  const tree = trees.find((t) => t.id === treeId);
  if (!tree) return null;
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  node.status = status;
  if (notes !== undefined) node.notes = notes;
  tree.updatedAt = new Date().toISOString();
  localStorage.setItem(TREES_KEY, JSON.stringify(trees));
  return tree;
}
