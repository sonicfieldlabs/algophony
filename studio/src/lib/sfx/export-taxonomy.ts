/**
 * Algophony Studio — Export Center Taxonomy
 *
 * Type definitions for the professional export system.
 */

/* ── Source Types ─────────────────────────────────────────────── */

export type ExportSourceType =
  | "full_workspace"
  | "single_project"
  | "selected_projects"
  | "prompt_cards"
  | "generated_sounds"
  | "sound_families"
  | "variation_batches"
  | "round_robin_sets"
  | "foley_sets"
  | "atmosphere_sets"
  | "ui_sound_sets"
  | "creature_sets"
  | "human_sets"
  | "prompt_packs"
  | "cue_sheets"
  | "usage_data";

export const EXPORT_SOURCE_LABELS: Record<ExportSourceType, string> = {
  full_workspace: "Full Workspace",
  single_project: "Single Project",
  selected_projects: "Selected Projects",
  prompt_cards: "Prompt Cards",
  generated_sounds: "Generated Sounds",
  sound_families: "Sound Families",
  variation_batches: "Variation Batches",
  round_robin_sets: "Round-Robin Sets",
  foley_sets: "Foley Sets",
  atmosphere_sets: "Atmosphere Sets",
  ui_sound_sets: "UI Sound Sets",
  creature_sets: "Creature Sets",
  human_sets: "Human Sets",
  prompt_packs: "Prompt Packs",
  cue_sheets: "Cue Sheets",
  usage_data: "Usage Data",
};

/* ── Scope ───────────────────────────────────────────────────── */

export type ExportScope =
  | "all"
  | "selected"
  | "favorites"
  | "accepted"
  | "rejected"
  | "generated_only"
  | "prompts_only"
  | "unused_prompts"
  | "failed_prompts"
  | "with_audio"
  | "metadata_only"
  | "date_range"
  | "single_project"
  | "single_category";

export const EXPORT_SCOPE_LABELS: Record<ExportScope, string> = {
  all: "All Data",
  selected: "Selected Items",
  favorites: "Favorites Only",
  accepted: "Accepted Sounds",
  rejected: "Rejected Sounds",
  generated_only: "Generated Sounds Only",
  prompts_only: "Prompt Cards Only",
  unused_prompts: "Unused Prompts",
  failed_prompts: "Failed Prompts",
  with_audio: "Sounds with Audio",
  metadata_only: "Metadata Only",
  date_range: "Date Range",
  single_project: "Single Project",
  single_category: "Single Category",
};

/* ── Formats ─────────────────────────────────────────────────── */

export type ExportDataFormat = "csv" | "json" | "markdown" | "yaml" | "txt";
export type ExportPackageFormat = "zip";
export type ExportFormat = ExportDataFormat | ExportPackageFormat;

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  json: "JSON",
  markdown: "Markdown",
  yaml: "YAML",
  txt: "Plain Text",
  zip: "ZIP Package",
};

/* ── Tabs ────────────────────────────────────────────────────── */

export type ExportTab =
  | "cue_sheet"
  | "daw_handoff"
  | "game_audio"
  | "prompt_database"
  | "metadata"
  | "pro_metadata"
  | "brief"
  | "packs"
  | "agent_markdown"
  | "backup"
  | "usage_reports"
  | "qa"
  | "history";

export interface ExportTabDef {
  id: ExportTab;
  label: string;
  description: string;
  minTier: "free" | "creator" | "studio" | "team";
  phase: number;
}

export const EXPORT_TABS: ExportTabDef[] = [
  { id: "prompt_database", label: "Prompt Database", description: "Export prompt cards as structured data", minTier: "free", phase: 1 },
  { id: "metadata", label: "Metadata", description: "Export sound metadata without audio", minTier: "free", phase: 1 },
  { id: "pro_metadata", label: "Pro Metadata", description: "BWF, iXML, Soundminer, UCS — professional library metadata", minTier: "studio", phase: 1 },
  { id: "brief", label: "Sound Brief", description: "Generate sound design briefs from scripts, GDDs, moodboards", minTier: "free", phase: 1 },
  { id: "usage_reports", label: "Usage Reports", description: "Export usage and cost data", minTier: "studio", phase: 1 },
  { id: "cue_sheet", label: "Cue Sheet", description: "Professional cue sheets from prompts", minTier: "studio", phase: 2 },
  { id: "agent_markdown", label: "Agent / Markdown", description: "Agent-readable project archives", minTier: "studio", phase: 2 },
  { id: "daw_handoff", label: "DAW Handoff", description: "Professional DAW-ready export packages", minTier: "team", phase: 3 },
  { id: "game_audio", label: "Game Audio", description: "Manifests for Unity, Unreal, Wwise, FMOD", minTier: "team", phase: 4 },
  { id: "packs", label: "Packs", description: "Organized sound collection packages", minTier: "creator", phase: 4 },
  { id: "backup", label: "Backup", description: "Full workspace or project backup", minTier: "studio", phase: 5 },
  { id: "qa", label: "QA", description: "Technical conformance checks before export", minTier: "studio", phase: 5 },
  { id: "history", label: "History", description: "Past export jobs and downloads", minTier: "free", phase: 5 },
];

/* ── Filters ─────────────────────────────────────────────────── */

export interface ExportFilter {
  projects: string[];
  categories: string[];
  subcategories: string[];
  statuses: string[];
  layerRoles: string[];
  modelIds: string[];
  outputFormats: string[];
  apiRoutes: string[];
  loop: "all" | "loop" | "non_loop";
  durationMin: number | null;
  durationMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  costMin: number | null;
  costMax: number | null;
  verdicts: string[];
}

export function defaultExportFilter(): ExportFilter {
  return {
    projects: [],
    categories: [],
    subcategories: [],
    statuses: [],
    layerRoles: [],
    modelIds: [],
    outputFormats: [],
    apiRoutes: [],
    loop: "all",
    durationMin: null,
    durationMax: null,
    dateFrom: null,
    dateTo: null,
    costMin: null,
    costMax: null,
    verdicts: [],
  };
}

export const STATUS_OPTIONS = [
  "draft", "ready", "generated", "favorite", "usable",
  "needs_retry", "bad_result", "rejected", "archived", "failed",
];

export const CATEGORY_OPTIONS = [
  "Foley", "Atmosphere", "UI", "Creature", "Human",
  "Impacts", "Transitions", "Ambience", "Props", "Doors",
  "Footsteps", "Crowds", "Body sounds",
];

export const VERDICT_OPTIONS = ["favorite", "usable", "needs_retry", "rejected"];

/* ── Cue Sheet ───────────────────────────────────────────────── */

export interface CueSheetEntry {
  cue_id: string;
  scene: string;
  timecode_in: string;
  timecode_out: string;
  sound_name: string;
  category: string;
  layer_role: string;
  prompt: string;
  duration: number;
  loop: boolean;
  model: string;
  output_format: string;
  status: string;
  notes: string;
  file_name: string;
  // Extended
  project_id?: string;
  prompt_card_id?: string;
  generated_sound_id?: string;
  tags?: string[];
  rating?: number;
  user_verdict?: string;
  created_at?: string;
  audio_url?: string;
  usage_cost?: number;
}

/* ── Naming Convention ───────────────────────────────────────── */

export interface NamingTemplate {
  template: string;
  variables: string[];
  separator: string;
  caseStyle: "upper" | "lower" | "pascal" | "camel" | "original";
}

export const NAMING_VARIABLES = [
  "project_code", "scene", "category", "subcategory", "sound_name",
  "surface", "material", "perspective", "layer_role", "variation",
  "take", "version", "loop", "date",
];

export const NAMING_PRESETS: Record<string, NamingTemplate> = {
  film_foley: {
    template: "{project_code}_{scene}_{category}_{sound_name}_{perspective}_v{version}",
    variables: ["project_code", "scene", "category", "sound_name", "perspective", "version"],
    separator: "_",
    caseStyle: "pascal",
  },
  game_event: {
    template: "{project_code}_{category}_{sound_name}_{variation}_{take}",
    variables: ["project_code", "category", "sound_name", "variation", "take"],
    separator: "_",
    caseStyle: "pascal",
  },
  ui_set: {
    template: "{project_code}_UI_{sound_name}_{variation}_v{version}",
    variables: ["project_code", "sound_name", "variation", "version"],
    separator: "_",
    caseStyle: "pascal",
  },
};

/* ── DAW Handoff ─────────────────────────────────────────────── */

export interface DawHandoffConfig {
  includeAudio: boolean;
  includePrompts: boolean;
  includeCueSheet: boolean;
  includeUsageReport: boolean;
  includeRejected: boolean;
  includeFavoritesOnly: boolean;
  folderByCategory: boolean;
  folderByScene: boolean;
  folderByLayerRole: boolean;
  normalizeFilenames: boolean;
  generateNotes: boolean;
  namingTemplate: NamingTemplate;
}

export function defaultDawConfig(): DawHandoffConfig {
  return {
    includeAudio: true,
    includePrompts: true,
    includeCueSheet: true,
    includeUsageReport: true,
    includeRejected: false,
    includeFavoritesOnly: false,
    folderByCategory: true,
    folderByScene: false,
    folderByLayerRole: false,
    normalizeFilenames: true,
    generateNotes: true,
    namingTemplate: NAMING_PRESETS.film_foley,
  };
}

/* ── Game Audio ──────────────────────────────────────────────── */

export type GameEngine = "unity" | "unreal" | "wwise" | "fmod" | "custom";

export interface GameAudioEvent {
  event: string;
  category: string;
  type: "single" | "round_robin" | "intensity_ladder" | "distance_ladder" | "state_based";
  randomization: boolean;
  variations: Array<{
    file: string;
    intensity?: string;
    distance?: string;
    side?: string;
    surface?: string;
    state?: string;
  }>;
  metadata: Record<string, unknown>;
}

export interface GameAudioManifest {
  project: string;
  engine: GameEngine;
  export_type: "game_audio_manifest";
  events: GameAudioEvent[];
}

/* ── Export Job ───────────────────────────────────────────────── */

export type ExportJobStatus = "draft" | "queued" | "running" | "completed" | "failed" | "expired" | "cancelled";

export interface ExportJob {
  id: string;
  userId: string;
  projectId?: string;
  exportType: ExportTab;
  sourceType: ExportSourceType;
  sourceIds: string[];
  filters: ExportFilter;
  formats: ExportFormat[];
  includeAudio: boolean;
  includeMetadata: boolean;
  includePrompts: boolean;
  includeUsage: boolean;
  status: ExportJobStatus;
  fileUrl?: string;
  errorMessage?: string;
  expiresAt?: string;
  createdAt: string;
  completedAt?: string;
}

/* ── Pack Types ──────────────────────────────────────────────── */

export type PackType =
  | "prompt_pack"
  | "foley_pack"
  | "ui_sound_set"
  | "atmosphere_set"
  | "creature_pack"
  | "human_pack"
  | "round_robin_pack"
  | "game_event_pack"
  | "daw_scene_pack";

export const PACK_TYPE_LABELS: Record<PackType, string> = {
  prompt_pack: "Prompt Pack",
  foley_pack: "Foley Pack",
  ui_sound_set: "UI Sound Set",
  atmosphere_set: "Atmosphere Set",
  creature_pack: "Creature Pack",
  human_pack: "Human Pack",
  round_robin_pack: "Round-Robin Pack",
  game_event_pack: "Game Event Pack",
  daw_scene_pack: "DAW Scene Pack",
};
