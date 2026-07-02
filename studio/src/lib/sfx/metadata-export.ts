/**
 * Algophony Studio — Professional Metadata Export
 *
 * Exports metadata in industry-standard formats:
 * - CSV (spreadsheet)
 * - JSON (structured)
 * - BWF-style fields (Broadcast Wave Format)
 * - iXML-style fields (embedded production metadata)
 * - Soundminer-compatible spreadsheet
 * - UCS-compatible categories
 * - Game manifest
 * - DAW cue sheet
 */

// ── Field Registry ───────────────────────────────────────────

export const METADATA_FIELDS = [
  "filename",
  "description",
  "category",
  "subcategory",
  "project",
  "scene",
  "cue",
  "take",
  "variation",
  "layer_role",
  "material",
  "action",
  "space",
  "mood",
  "duration",
  "loopable",
  "prompt",
  "model",
  "generation_date",
  "usage_status",
  "user_verdict",
  "credit_cost",
  "character_cost",
  "prompt_influence",
  "output_format",
  "request_id",
  "generation_id",
  "project_id",
  "prompt_card_id",
] as const;

export type MetadataField = (typeof METADATA_FIELDS)[number];

// ── Export Format Definitions ────────────────────────────────

export type MetadataExportFormat =
  | "csv"
  | "json"
  | "bwf"
  | "ixml"
  | "soundminer"
  | "ucs"
  | "game_manifest"
  | "daw_cue_sheet";

export interface MetadataExportFormatDef {
  id: MetadataExportFormat;
  label: string;
  description: string;
  extension: string;
  mimeType: string;
  fields: MetadataField[];
}

export const METADATA_EXPORT_FORMATS: MetadataExportFormatDef[] = [
  {
    id: "csv",
    label: "CSV Spreadsheet",
    description: "Standard CSV with all metadata fields",
    extension: "csv",
    mimeType: "text/csv",
    fields: [...METADATA_FIELDS],
  },
  {
    id: "json",
    label: "JSON Structured",
    description: "Full JSON with nested metadata",
    extension: "json",
    mimeType: "application/json",
    fields: [...METADATA_FIELDS],
  },
  {
    id: "bwf",
    label: "BWF Metadata",
    description: "Broadcast Wave Format style fields (description, originator, date, time reference)",
    extension: "csv",
    mimeType: "text/csv",
    fields: ["filename", "description", "generation_date", "duration", "category", "project", "scene", "cue"],
  },
  {
    id: "ixml",
    label: "iXML Metadata",
    description: "iXML-compatible production metadata (scene, take, notes, project)",
    extension: "xml",
    mimeType: "application/xml",
    fields: ["filename", "project", "scene", "cue", "take", "variation", "description", "category", "duration", "prompt"],
  },
  {
    id: "soundminer",
    label: "Soundminer Spreadsheet",
    description: "Soundminer-compatible tab-separated metadata for sound library management",
    extension: "tsv",
    mimeType: "text/tab-separated-values",
    fields: ["filename", "description", "category", "subcategory", "material", "action", "space", "mood", "duration", "loopable", "project", "usage_status"],
  },
  {
    id: "ucs",
    label: "UCS Categories",
    description: "Universal Category System compatible metadata for professional sound libraries",
    extension: "csv",
    mimeType: "text/csv",
    fields: ["filename", "category", "subcategory", "description", "material", "action", "space", "duration"],
  },
  {
    id: "game_manifest",
    label: "Game Manifest",
    description: "Game engine manifest with event paths, variations, and implementation metadata",
    extension: "json",
    mimeType: "application/json",
    fields: ["filename", "category", "subcategory", "action", "material", "variation", "layer_role", "duration", "loopable", "prompt"],
  },
  {
    id: "daw_cue_sheet",
    label: "DAW Cue Sheet",
    description: "Timecoded cue sheet for DAW import with scene/cue/category/description",
    extension: "csv",
    mimeType: "text/csv",
    fields: ["filename", "scene", "cue", "category", "description", "duration", "project"],
  },
];

// ── UCS Category Mapping ─────────────────────────────────────

const UCS_CATEGORIES: Record<string, string> = {
  ambience: "AMB",
  atmosphere: "AMB",
  creature: "CRE",
  door: "DOOR",
  explosion: "EXP",
  fire: "FIRE",
  foley: "FOL",
  footstep: "FTST",
  gun: "GUN",
  hit: "HIT",
  impact: "IMPT",
  machine: "MACH",
  metal: "MTL",
  motor: "MTR",
  nature: "NAT",
  rain: "RAIN",
  sci_fi: "SCFI",
  technology: "TECH",
  thunder: "THUN",
  ui: "UI",
  vehicle: "VEH",
  voice: "VOX",
  water: "WTR",
  weapon: "WPN",
  whoosh: "WOOSH",
  wind: "WIND",
  wood: "WOOD",
};

function inferUcsCategory(category: string): string {
  const lower = category.toLowerCase().replace(/[\s-_]+/g, "_");
  for (const [key, code] of Object.entries(UCS_CATEGORIES)) {
    if (lower.includes(key)) return code;
  }
  return "GEN"; // Generic
}

// ── Row Extraction ───────────────────────────────────────────

export interface MetadataRow {
  filename: string;
  description: string;
  category: string;
  subcategory: string;
  project: string;
  scene: string;
  cue: string;
  take: string;
  variation: string;
  layer_role: string;
  material: string;
  action: string;
  space: string;
  mood: string;
  duration: string;
  loopable: string;
  prompt: string;
  model: string;
  generation_date: string;
  usage_status: string;
  user_verdict: string;
  credit_cost: string;
  character_cost: string;
  prompt_influence: string;
  output_format: string;
  request_id: string;
  generation_id: string;
  project_id: string;
  prompt_card_id: string;
}

/**
 * Extract a full metadata row from a generation/card record.
 */
export function extractMetadataRow(asset: Record<string, unknown>): MetadataRow {
  const payload = (asset.request_payload ?? {}) as Record<string, unknown>;
  const meta = (asset.metadata ?? {}) as Record<string, unknown>;
  const path = String(asset.audio_storage_path ?? "");
  const filename = path.split("/").pop() ?? `sfx_${String(asset.id ?? "").slice(0, 8)}.mp3`;

  return {
    filename,
    description: String(payload.text ?? meta.description ?? ""),
    category: String(payload.category ?? meta.category ?? ""),
    subcategory: String(meta.subcategory ?? ""),
    project: String(meta.project ?? asset.project_id ?? ""),
    scene: String(meta.scene ?? ""),
    cue: String(meta.cueId ?? meta.cue ?? ""),
    take: String(meta.take ?? "1"),
    variation: String(meta.variation ?? meta.version ?? ""),
    layer_role: String(meta.layerRole ?? meta.layer_role ?? ""),
    material: String(meta.material ?? ""),
    action: String(meta.action ?? ""),
    space: String(meta.space ?? meta.perspective ?? ""),
    mood: String(meta.mood ?? meta.emotionalTone ?? ""),
    duration: String(asset.duration_seconds ?? ""),
    loopable: Boolean(payload.loop) ? "yes" : "no",
    prompt: String(payload.text ?? ""),
    model: String(asset.elevenlabs_model_id ?? payload.model_id ?? ""),
    generation_date: String(asset.created_at ?? ""),
    usage_status: String(asset.status ?? ""),
    user_verdict: String(asset.user_verdict ?? ""),
    credit_cost: String(asset.app_credit_cost ?? ""),
    character_cost: String(asset.character_cost ?? ""),
    prompt_influence: String(payload.prompt_influence ?? ""),
    output_format: String(asset.output_format ?? ""),
    request_id: String(asset.request_id ?? ""),
    generation_id: String(asset.id ?? ""),
    project_id: String(asset.project_id ?? ""),
    prompt_card_id: String(asset.prompt_card_id ?? ""),
  };
}

// ── Format-Specific Exporters ────────────────────────────────

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export as CSV with selected fields.
 */
export function exportAsCsv(rows: MetadataRow[], fields: MetadataField[]): string {
  const header = fields.map(escapeCsv).join(",");
  const body = rows.map((row) =>
    fields.map((f) => escapeCsv(row[f] ?? "")).join(",")
  ).join("\n");
  return `${header}\n${body}`;
}

/**
 * Export as JSON.
 */
export function exportAsJson(rows: MetadataRow[], fields: MetadataField[]): string {
  const filtered = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const f of fields) obj[f] = row[f] ?? "";
    return obj;
  });
  return JSON.stringify({
    format: "algophony_studio_metadata",
    version: "1.0",
    exported_at: new Date().toISOString(),
    count: filtered.length,
    fields,
    data: filtered,
  }, null, 2);
}

/**
 * Export as BWF-style CSV (Broadcast Wave Format metadata fields).
 */
export function exportAsBwf(rows: MetadataRow[]): string {
  const bwfFields = [
    "Filename", "Description", "Originator", "OriginatorReference",
    "OriginationDate", "OriginationTime", "TimeReference", "CodingHistory",
  ];
  const header = bwfFields.join(",");
  const body = rows.map((row) => {
    const date = row.generation_date ? new Date(row.generation_date) : new Date();
    return [
      escapeCsv(row.filename),
      escapeCsv(row.description),
      escapeCsv("Algophony Studio"),
      escapeCsv(row.generation_id.slice(0, 32)),
      escapeCsv(date.toISOString().split("T")[0]),
      escapeCsv(date.toISOString().split("T")[1]?.split(".")[0] ?? ""),
      escapeCsv("0"), // TimeReference in samples
      escapeCsv(`A=ElevenLabs,M=${row.model},T=${row.prompt.slice(0, 50)}`),
    ].join(",");
  }).join("\n");
  return `${header}\n${body}`;
}

/**
 * Export as iXML document.
 */
export function exportAsIxml(rows: MetadataRow[]): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', "<BWFXML>"];

  for (const row of rows) {
    lines.push("  <IXML>");
    lines.push(`    <IXML_VERSION>2.10</IXML_VERSION>`);
    lines.push(`    <PROJECT>${escapeXml(row.project)}</PROJECT>`);
    lines.push(`    <SCENE>${escapeXml(row.scene)}</SCENE>`);
    lines.push(`    <TAKE>${escapeXml(row.take)}</TAKE>`);
    lines.push(`    <TAPE>${escapeXml(row.filename)}</TAPE>`);
    lines.push(`    <NOTE>${escapeXml(row.description)}</NOTE>`);
    lines.push(`    <CIRCLED>FALSE</CIRCLED>`);
    lines.push("    <TRACK_LIST>");
    lines.push("      <TRACK_COUNT>1</TRACK_COUNT>");
    lines.push("      <TRACK>");
    lines.push(`        <CHANNEL_INDEX>1</CHANNEL_INDEX>`);
    lines.push(`        <NAME>${escapeXml(row.filename)}</NAME>`);
    lines.push(`        <FUNCTION>${escapeXml(row.layer_role || row.category)}</FUNCTION>`);
    lines.push("      </TRACK>");
    lines.push("    </TRACK_LIST>");
    lines.push("    <USER>");
    lines.push(`      <CATEGORY>${escapeXml(row.category)}</CATEGORY>`);
    lines.push(`      <SUBCATEGORY>${escapeXml(row.subcategory)}</SUBCATEGORY>`);
    lines.push(`      <MATERIAL>${escapeXml(row.material)}</MATERIAL>`);
    lines.push(`      <ACTION>${escapeXml(row.action)}</ACTION>`);
    lines.push(`      <MOOD>${escapeXml(row.mood)}</MOOD>`);
    lines.push(`      <DURATION>${escapeXml(row.duration)}</DURATION>`);
    lines.push(`      <LOOPABLE>${row.loopable === "yes" ? "TRUE" : "FALSE"}</LOOPABLE>`);
    lines.push(`      <PROMPT>${escapeXml(row.prompt)}</PROMPT>`);
    lines.push(`      <MODEL>${escapeXml(row.model)}</MODEL>`);
    lines.push(`      <GENERATION_ID>${escapeXml(row.generation_id)}</GENERATION_ID>`);
    lines.push("    </USER>");
    lines.push("  </IXML>");
  }

  lines.push("</BWFXML>");
  return lines.join("\n");
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/**
 * Export as Soundminer TSV.
 */
export function exportAsSoundminer(rows: MetadataRow[]): string {
  const fields = [
    "Filename", "Description", "Category", "SubCategory",
    "FXName", "Library", "Designer", "Microphone",
    "Source", "Notes", "BWDescription", "BWOriginator",
  ];
  const header = fields.join("\t");
  const body = rows.map((row) => [
    row.filename,
    row.description,
    row.category,
    row.subcategory,
    `${row.material} ${row.action}`.trim(),
    "Algophony Studio",
    "Algophony Studio AI",
    row.space || "Virtual",
    row.prompt.slice(0, 100),
    `Model: ${row.model} | PI: ${row.prompt_influence} | Verdict: ${row.user_verdict}`,
    row.description,
    "Algophony Studio",
  ].join("\t")).join("\n");
  return `${header}\n${body}`;
}

/**
 * Export as UCS-compatible CSV.
 */
export function exportAsUcs(rows: MetadataRow[]): string {
  const header = "CatID,Category,SubCategory,FXName,CreatorID,SourceID,UserData";
  const body = rows.map((row) => {
    const catId = inferUcsCategory(row.category);
    return [
      catId,
      escapeCsv(row.category),
      escapeCsv(row.subcategory),
      escapeCsv(`${row.material} ${row.action}`.trim() || row.description.slice(0, 50)),
      "ALGOPHONY_STUDIO",
      escapeCsv(row.generation_id.slice(0, 12)),
      escapeCsv(row.prompt.slice(0, 80)),
    ].join(",");
  }).join("\n");
  return `${header}\n${body}`;
}

/**
 * Export as game manifest JSON.
 */
export function exportAsGameManifest(rows: MetadataRow[]): string {
  const events = rows.map((row) => ({
    filename: row.filename,
    eventPath: `/${row.category}/${row.subcategory || row.action || "default"}/${row.filename.replace(/\.[^.]+$/, "")}`,
    category: row.category,
    subcategory: row.subcategory,
    action: row.action,
    material: row.material,
    variation: row.variation,
    layerRole: row.layer_role,
    duration: parseFloat(row.duration) || 0,
    loopable: row.loopable === "yes",
    prompt: row.prompt,
  }));

  return JSON.stringify({
    format: "algophony_studio_game_manifest",
    version: "1.0",
    exported_at: new Date().toISOString(),
    event_count: events.length,
    events,
  }, null, 2);
}

/**
 * Export as DAW cue sheet CSV.
 */
export function exportAsDawCueSheet(rows: MetadataRow[]): string {
  const header = "Timecode,Scene,Cue,Category,Description,Filename,Duration";
  const body = rows.map((row, i) => {
    // Generate approximate timecodes if not available
    const tc = formatTimecode(i * 5); // 5-second spacing default
    return [
      tc,
      escapeCsv(row.scene || `Scene ${Math.floor(i / 5) + 1}`),
      escapeCsv(row.cue || `CUE_${String(i + 1).padStart(3, "0")}`),
      escapeCsv(row.category),
      escapeCsv(row.description.slice(0, 80)),
      escapeCsv(row.filename),
      row.duration,
    ].join(",");
  }).join("\n");
  return `${header}\n${body}`;
}

function formatTimecode(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

// ── Master Export Function ───────────────────────────────────

export function exportMetadata(
  assets: Record<string, unknown>[],
  format: MetadataExportFormat,
  selectedFields?: MetadataField[]
): { content: string; filename: string; mimeType: string } {
  const rows = assets.map(extractMetadataRow);
  const formatDef = METADATA_EXPORT_FORMATS.find((f) => f.id === format)!;
  const fields = selectedFields ?? formatDef.fields;
  const ts = new Date().toISOString().slice(0, 10);

  let content: string;
  switch (format) {
    case "csv": content = exportAsCsv(rows, fields); break;
    case "json": content = exportAsJson(rows, fields); break;
    case "bwf": content = exportAsBwf(rows); break;
    case "ixml": content = exportAsIxml(rows); break;
    case "soundminer": content = exportAsSoundminer(rows); break;
    case "ucs": content = exportAsUcs(rows); break;
    case "game_manifest": content = exportAsGameManifest(rows); break;
    case "daw_cue_sheet": content = exportAsDawCueSheet(rows); break;
    default: content = exportAsCsv(rows, fields);
  }

  return {
    content,
    filename: `algophony_studio_${format}_${ts}.${formatDef.extension}`,
    mimeType: formatDef.mimeType,
  };
}
