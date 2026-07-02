/**
 * Algophony Studio — Timeline / Spotting Types
 *
 * Unified data model for all timeline import formats:
 * EDL, CSV cue sheet, SRT/VTT subtitles, script excerpts,
 * timecoded notes, game event lists, and manual cue entry.
 */

// ── Supported Formats ────────────────────────────────────────

export const TIMELINE_FORMATS = [
  "edl",
  "csv_cue",
  "srt",
  "vtt",
  "script",
  "timecoded_notes",
  "game_events",
  "manual",
] as const;

export type TimelineFormat = (typeof TIMELINE_FORMATS)[number];

export const FORMAT_LABELS: Record<TimelineFormat, string> = {
  edl: "EDL (CMX3600)",
  csv_cue: "CSV Cue Sheet",
  srt: "SubRip Subtitles (.srt)",
  vtt: "WebVTT Subtitles (.vtt)",
  script: "Script / Screenplay",
  timecoded_notes: "Timecoded Notes",
  game_events: "Game Event List",
  manual: "Manual Cue List",
};

export const FORMAT_EXTENSIONS: Record<TimelineFormat, string[]> = {
  edl: [".edl"],
  csv_cue: [".csv", ".tsv"],
  srt: [".srt"],
  vtt: [".vtt"],
  script: [".txt", ".fdx", ".fountain"],
  timecoded_notes: [".txt", ".md"],
  game_events: [".json", ".csv", ".txt"],
  manual: [],
};

// ── Timecode Utilities ───────────────────────────────────────

/** Standard SMPTE timecode: HH:MM:SS:FF */
export interface Timecode {
  hours: number;
  minutes: number;
  seconds: number;
  frames: number;
}

/** Convert timecode string to milliseconds */
export function timecodeToMs(tc: string, frameRate = 24): number {
  // Handle HH:MM:SS:FF (SMPTE)
  const smpteMatch = tc.match(/^(\d{1,2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (smpteMatch) {
    const [, h, m, s, f] = smpteMatch.map(Number);
    return (h * 3600 + m * 60 + s) * 1000 + Math.round((f / frameRate) * 1000);
  }

  // Handle HH:MM:SS.mmm (media time)
  const mediaMatch = tc.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (mediaMatch) {
    const h = Number(mediaMatch[1]);
    const m = Number(mediaMatch[2]);
    const s = Number(mediaMatch[3]);
    const ms = mediaMatch[4] ? Number(mediaMatch[4].padEnd(3, "0")) : 0;
    return (h * 3600 + m * 60 + s) * 1000 + ms;
  }

  // Handle MM:SS.mmm (short form)
  const shortMatch = tc.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (shortMatch) {
    const m = Number(shortMatch[1]);
    const s = Number(shortMatch[2]);
    const ms = shortMatch[3] ? Number(shortMatch[3].padEnd(3, "0")) : 0;
    return (m * 60 + s) * 1000 + ms;
  }

  // Handle seconds only
  const secMatch = tc.match(/^(\d+(?:\.\d+)?)s?$/);
  if (secMatch) {
    return Math.round(Number(secMatch[1]) * 1000);
  }

  return 0;
}

/** Convert milliseconds to SMPTE timecode string */
export function msToTimecode(ms: number, frameRate = 24): string {
  const totalSeconds = Math.floor(ms / 1000);
  const remainderMs = ms % 1000;
  const frames = Math.round((remainderMs / 1000) * frameRate);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

/** Convert milliseconds to readable time (HH:MM:SS.mmm) */
export function msToReadable(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const remainderMs = ms % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(remainderMs).padStart(3, "0")}`;
}

// ── Timeline Cue ─────────────────────────────────────────────

export type CueStatus = "parsed" | "reviewed" | "generating" | "generated" | "failed" | "skipped" | "exported";

export interface TimelineCue {
  id: string;
  index: number;
  /** SMPTE or media timecode string */
  timecodeIn: string;
  timecodeOut?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Auto-detected or source-defined scene */
  sceneId?: string;
  /** Original text from the source file */
  description: string;
  /** Algophony Studio generated prompt */
  generatedPrompt?: string;
  /** Auto-detected SFX category */
  category?: string;
  /** Linked prompt card ID after card creation */
  promptCardId?: string;
  /** Linked generation ID after sound generation */
  generationId?: string;
  /** Audio URL after generation */
  audioUrl?: string;
  /** Processing status */
  status: CueStatus;
  /** Source metadata from the original file */
  sourceMetadata?: Record<string, string>;
}

// ── Timeline Scene ───────────────────────────────────────────

export interface TimelineScene {
  id: string;
  name: string;
  timecodeIn: string;
  timecodeOut?: string;
  cueIds: string[];
  /** Room tone / ambience inferred for this scene */
  inferredAmbience?: string;
}

// ── Full Import ──────────────────────────────────────────────

export interface TimelineImport {
  id: string;
  format: TimelineFormat;
  filename: string;
  frameRate: number;
  scenes: TimelineScene[];
  cues: TimelineCue[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Create a new empty timeline import */
export function createTimelineImport(
  format: TimelineFormat,
  filename: string,
  cues: TimelineCue[],
  scenes: TimelineScene[] = [],
  metadata: Record<string, unknown> = {}
): TimelineImport {
  return {
    id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    format,
    filename,
    frameRate: 24,
    scenes,
    cues,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

/** Create a cue ID */
export function createCueId(): string {
  return `cue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
