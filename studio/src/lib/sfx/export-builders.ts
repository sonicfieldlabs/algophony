/**
 * Algophony Studio — Export Builders
 *
 * Core utility functions for building export data in all supported formats.
 * Used by API routes and client-side preview.
 */

import type {
  ExportFilter,
  CueSheetEntry,
  NamingTemplate,
  GameAudioEvent,
  GameAudioManifest,
  GameEngine,
  PackType,
} from "./export-taxonomy";

/* ── CSV ─────────────────────────────────────────────────────── */

/** Build CSV string from an array of objects with specified column order */
export function buildCsvFromRows(
  rows: Record<string, unknown>[],
  columns: string[],
  delimiter = ","
): string {
  const header = columns.join(delimiter);
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(delimiter)
  );
  return [header, ...lines].join("\n");
}

/* ── JSON ────────────────────────────────────────────────────── */

export function buildJsonExport(data: unknown, pretty = true): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/* ── Markdown ────────────────────────────────────────────────── */

/** Build a markdown table from rows */
export function buildMarkdownTable(
  rows: Record<string, unknown>[],
  columns: string[]
): string {
  if (rows.length === 0) return "*No data*";
  const header = `| ${columns.join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((c) => String(row[c] ?? "")).join(" | ")} |`
  );
  return [header, separator, ...body].join("\n");
}

/** Build a full markdown document with sections */
export function buildMarkdownDocument(sections: Array<{ title: string; content: string }>): string {
  return sections
    .map((s) => `# ${s.title}\n\n${s.content}`)
    .join("\n\n---\n\n");
}

/** Build a markdown prompt card */
export function buildPromptCardMarkdown(card: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`# Prompt Card: ${card.title || "Untitled"}`);
  lines.push("");
  lines.push(`**Category:** ${card.category || "—"}${card.subcategory ? ` / ${card.subcategory}` : ""}`);
  if (card.status) lines.push(`**Status:** ${card.status}`);
  if (card.duration_seconds) lines.push(`**Duration:** ${card.duration_seconds}s`);
  lines.push(`**Loop:** ${card.loop ? "yes" : "no"}`);
  if (card.model_id) lines.push(`**Model:** ${card.model_id}`);
  lines.push("");
  lines.push("## Prompt");
  lines.push("");
  lines.push(String(card.generated_prompt || card.prompt || "—"));
  if (Array.isArray(card.exclusions) && card.exclusions.length > 0) {
    lines.push("");
    lines.push("## Exclusions");
    lines.push("");
    card.exclusions.forEach((e: string) => lines.push(`- ${e}`));
  }
  return lines.join("\n");
}

/* ── YAML ────────────────────────────────────────────────────── */

function quoteYamlString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

export function buildYamlExport(data: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (data === null || data === undefined) return `${pad}null`;
  if (typeof data === "string") return `${pad}${quoteYamlString(data)}`;
  if (typeof data === "number" || typeof data === "boolean") return `${pad}${data}`;
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}[]`;
    return data.map((item) => `${pad}- ${buildYamlExport(item, 0).trim()}`).join("\n");
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}`;
    return entries
      .map(([key, val]) => {
        const valStr = buildYamlExport(val, indent + 1);
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return `${pad}${key}:\n${valStr}`;
        }
        if (Array.isArray(val) && val.length > 0) {
          return `${pad}${key}:\n${valStr}`;
        }
        return `${pad}${key}: ${valStr.trim()}`;
      })
      .join("\n");
  }
  return `${pad}${String(data)}`;
}

/* ── Filters ─────────────────────────────────────────────────── */

/** Apply export filters to an array of data rows */
export function applyExportFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: ExportFilter
): T[] {
  let result = [...rows];

  if (filters.categories.length > 0) {
    result = result.filter((r) => filters.categories.includes(String(r.category ?? "")));
  }
  if (filters.statuses.length > 0) {
    result = result.filter((r) => filters.statuses.includes(String(r.status ?? "")));
  }
  if (filters.verdicts.length > 0) {
    result = result.filter((r) => filters.verdicts.includes(String(r.user_verdict ?? "")));
  }
  if (filters.projects.length > 0) {
    result = result.filter((r) => filters.projects.includes(String(r.project_id ?? "")));
  }
  if (filters.modelIds.length > 0) {
    result = result.filter((r) => filters.modelIds.includes(String(r.model_id ?? r.elevenlabs_model_id ?? "")));
  }
  if (filters.outputFormats.length > 0) {
    result = result.filter((r) => filters.outputFormats.includes(String(r.output_format ?? "")));
  }
  if (filters.loop !== "all") {
    const wantLoop = filters.loop === "loop";
    result = result.filter((r) => Boolean(r.loop) === wantLoop);
  }
  if (filters.durationMin !== null) {
    result = result.filter((r) => Number(r.duration_seconds ?? 0) >= filters.durationMin!);
  }
  if (filters.durationMax !== null) {
    result = result.filter((r) => Number(r.duration_seconds ?? 0) <= filters.durationMax!);
  }
  if (filters.dateFrom) {
    result = result.filter((r) => String(r.created_at ?? "") >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    result = result.filter((r) => String(r.created_at ?? "") <= filters.dateTo!);
  }
  if (filters.costMin !== null) {
    result = result.filter((r) => Number(r.app_credit_cost ?? 0) >= filters.costMin!);
  }
  if (filters.costMax !== null) {
    result = result.filter((r) => Number(r.app_credit_cost ?? 0) <= filters.costMax!);
  }

  return result;
}

/* ── Naming ──────────────────────────────────────────────────── */

/** Generate a filename from a naming template and row data */
export function generateFileName(
  template: NamingTemplate,
  data: Record<string, unknown>,
  ext = "mp3"
): string {
  let name = template.template;

  for (const varName of template.variables) {
    const val = String(data[varName] ?? "");
    const formatted = applyCase(val.replace(/[^\w\s-]/g, "").replace(/\s+/g, template.separator), template.caseStyle);
    name = name.replace(`{${varName}}`, formatted || "unknown");
  }

  // Clean up consecutive separators
  name = name.replace(new RegExp(`${escapeRegex(template.separator)}{2,}`, "g"), template.separator);
  name = name.replace(/^[_-]+|[_-]+$/g, "");

  return `${name}.${ext}`;
}

function applyCase(str: string, style: NamingTemplate["caseStyle"]): string {
  switch (style) {
    case "upper": return str.toUpperCase();
    case "lower": return str.toLowerCase();
    case "pascal": return str.split(/[\s_-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "camel": {
      const parts = str.split(/[\s_-]+/);
      return parts.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    }
    default: return str;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ── Cue Sheet ───────────────────────────────────────────────── */

/** Convert prompt card rows to cue sheet entries */
export function buildCueSheet(
  cards: Record<string, unknown>[],
  projectCode = "PRJ"
): CueSheetEntry[] {
  return cards.map((card, i) => ({
    cue_id: `${projectCode}_${String(card.category ?? "SFX").toUpperCase().slice(0, 4)}_${String(i + 1).padStart(3, "0")}`,
    scene: String(card.scene ?? ""),
    timecode_in: "00:00:00:00",
    timecode_out: "00:00:00:00",
    sound_name: String(card.title ?? `Sound ${i + 1}`),
    category: String(card.category ?? ""),
    layer_role: String(card.layer_role ?? "foreground"),
    prompt: String(card.generated_prompt ?? card.prompt ?? ""),
    duration: Number(card.duration_seconds ?? 0),
    loop: Boolean(card.loop),
    model: String(card.model_id ?? ""),
    output_format: String(card.output_format ?? "mp3_44100_128"),
    status: String(card.status ?? "draft"),
    notes: "",
    file_name: generateFileName(
      { template: `${projectCode}_{category}_{sound_name}_v01`, variables: ["category", "sound_name"], separator: "_", caseStyle: "pascal" },
      { category: card.category, sound_name: card.title },
      "mp3"
    ),
    project_id: card.project_id as string | undefined,
    prompt_card_id: card.id as string | undefined,
    created_at: card.created_at as string | undefined,
    usage_cost: card.app_credit_cost as number | undefined,
  }));
}

export const CUE_SHEET_COLUMNS = [
  "cue_id", "scene", "timecode_in", "timecode_out", "sound_name",
  "category", "layer_role", "prompt", "duration", "loop",
  "model", "output_format", "status", "notes", "file_name",
];

/* ── Prompt Database ─────────────────────────────────────────── */

export const PROMPT_DB_COLUMNS = [
  "id", "title", "category", "subcategory", "generated_prompt",
  "duration_seconds", "loop", "prompt_influence", "model_id",
  "output_format", "exclusions", "critic_score", "created_at",
];

export function buildPromptDatabaseExport(cards: Record<string, unknown>[]): Record<string, unknown>[] {
  return cards.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    subcategory: c.subcategory ?? "",
    generated_prompt: c.generated_prompt,
    duration_seconds: c.duration_seconds ?? "",
    loop: c.loop ? "true" : "false",
    prompt_influence: c.prompt_influence ?? "",
    model_id: c.model_id,
    output_format: c.output_format ?? "",
    exclusions: Array.isArray(c.exclusions) ? (c.exclusions as string[]).join("; ") : "",
    critic_score: c.critic_score ?? "",
    created_at: c.created_at ?? "",
  }));
}

/* ── Metadata ────────────────────────────────────────────────── */

export const SOUND_METADATA_COLUMNS = [
  "id", "status", "api_route", "elevenlabs_model_id", "output_format",
  "duration_seconds", "character_cost", "app_credit_cost", "user_verdict",
  "created_at",
];

export function buildSoundMetadataExport(generations: Record<string, unknown>[]): Record<string, unknown>[] {
  return generations.map((g) => ({
    id: g.id,
    status: g.status,
    api_route: g.api_route ?? "",
    elevenlabs_model_id: g.elevenlabs_model_id ?? "",
    output_format: g.output_format ?? "",
    duration_seconds: g.duration_seconds ?? "",
    character_cost: g.character_cost ?? "",
    app_credit_cost: g.app_credit_cost ?? "",
    user_verdict: g.user_verdict ?? "",
    created_at: g.created_at ?? "",
  }));
}

/* ── Usage Report ────────────────────────────────────────────── */

export const USAGE_REPORT_COLUMNS = [
  "created_at", "api_route", "model_id", "request_id",
  "character_cost", "app_credit_cost", "output_format",
  "project_id", "generated_sound_id",
];

export function buildUsageReport(events: Record<string, unknown>[]): Record<string, unknown>[] {
  return events.map((e) => ({
    created_at: e.created_at ?? "",
    api_route: e.api_route ?? "",
    model_id: e.model_id ?? "",
    request_id: e.request_id ?? "",
    character_cost: e.character_cost ?? "",
    app_credit_cost: e.app_credit_cost ?? "",
    output_format: e.output_format ?? "",
    project_id: e.project_id ?? "",
    generated_sound_id: e.generated_sound_id ?? "",
  }));
}

/* ── Agent Archive ───────────────────────────────────────────── */

export function buildAgentManifest(
  projectName: string,
  opts: { hasAudio: boolean; hasPrompts: boolean; hasUsage: boolean }
): string {
  return buildJsonExport({
    project: projectName,
    purpose: "sound_design_archive",
    format: "algophony_studio_agent_archive_v1",
    contains_audio: opts.hasAudio,
    contains_prompts: opts.hasPrompts,
    contains_usage_data: opts.hasUsage,
    recommended_agent_tasks: [
      "analyze rejected prompts and suggest improvements",
      "suggest new Foley variations based on existing cards",
      "prepare DAW cue list from prompt database",
      "create game audio manifest from round-robin sets",
      "generate usage cost analysis",
      "identify gaps in sound coverage",
    ],
  });
}

export function buildAgentArchive(
  projectName: string,
  cards: Record<string, unknown>[],
  generations: Record<string, unknown>[],
  usageEvents: Record<string, unknown>[]
): Record<string, string> {
  const files: Record<string, string> = {};

  files["README.md"] = [
    `# ${projectName} — Algophony Studio Agent Archive`,
    "",
    `Exported: ${new Date().toISOString()}`,
    `Prompt cards: ${cards.length}`,
    `Generated sounds: ${generations.length}`,
    `Usage events: ${usageEvents.length}`,
    "",
    "## Contents",
    "- `project_context.md` — project overview",
    "- `prompt_cards.md` — all prompt cards",
    "- `cue_sheet.md` — cue sheet from prompts",
    "- `generated_sounds.json` — generation metadata",
    "- `usage_report.md` — usage summary",
    "- `agent_manifest.json` — agent-readable manifest",
  ].join("\n");

  files["project_context.md"] = [
    `# Project: ${projectName}`,
    "",
    `Total prompt cards: ${cards.length}`,
    `Total generations: ${generations.length}`,
    `Categories: ${[...new Set(cards.map((c) => c.category))].join(", ")}`,
  ].join("\n");

  files["prompt_cards.md"] = cards
    .map((c) => buildPromptCardMarkdown(c))
    .join("\n\n---\n\n");

  const cueEntries = buildCueSheet(cards, projectName.slice(0, 3).toUpperCase());
  files["cue_sheet.md"] = buildMarkdownTable(
    cueEntries as unknown as Record<string, unknown>[],
    ["cue_id", "sound_name", "category", "duration", "status"]
  );

  files["generated_sounds.json"] = buildJsonExport(
    buildSoundMetadataExport(generations)
  );

  files["usage_report.md"] = buildMarkdownTable(
    buildUsageReport(usageEvents),
    ["created_at", "api_route", "app_credit_cost"]
  );

  files["agent_manifest.json"] = buildAgentManifest(projectName, {
    hasAudio: generations.some((g) => g.audio_storage_path),
    hasPrompts: cards.length > 0,
    hasUsage: usageEvents.length > 0,
  });

  return files;
}

/* ── Game Audio Manifest ─────────────────────────────────────── */

export function buildGameAudioManifest(
  projectName: string,
  engine: GameEngine,
  events: GameAudioEvent[]
): GameAudioManifest {
  return {
    project: projectName,
    engine,
    export_type: "game_audio_manifest",
    events,
  };
}

/* ── Pack Manifest ───────────────────────────────────────────── */

export function buildPackManifest(
  packName: string,
  packType: PackType,
  items: Array<{ file: string; prompt_card_id?: string; category?: string; [key: string]: unknown }>
): string {
  return buildJsonExport({
    pack_name: packName,
    pack_type: packType,
    format: "algophony_studio_pack_v1",
    item_count: items.length,
    items,
    exported_at: new Date().toISOString(),
  });
}

/* ── DAW Folder Structure ────────────────────────────────────── */

export const DAW_AUDIO_FOLDERS = [
  "Foley", "Ambience", "UI", "Creature", "Human",
  "Impacts", "Transitions", "Misc",
];

export function mapCategoryToFolder(category: string): string {
  const lower = category.toLowerCase();
  if (/foley|footstep|cloth|props|door/.test(lower)) return "Foley";
  if (/ambi|atmosphere|room|weather/.test(lower)) return "Ambience";
  if (/ui|interface|notification/.test(lower)) return "UI";
  if (/creature|animal|monster/.test(lower)) return "Creature";
  if (/human|voice|breath|crowd/.test(lower)) return "Human";
  if (/impact|hit|crash|boom/.test(lower)) return "Impacts";
  if (/transition|whoosh|sweep/.test(lower)) return "Transitions";
  return "Misc";
}
