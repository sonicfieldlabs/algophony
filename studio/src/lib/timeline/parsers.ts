/**
 * Algophony Studio — Timeline Format Parsers
 *
 * Deterministic parsers for EDL, CSV cue sheets, SRT/VTT subtitles,
 * script excerpts, timecoded notes, game event lists, and manual cue entry.
 * Each parser returns TimelineCue[].
 */

import {
  type TimelineCue,
  type TimelineFormat,
  createCueId,
  timecodeToMs,
} from "./types";

function stripMarkup(text: string): string {
  let output = "";
  let insideTag = false;

  for (const char of text) {
    if (char === "<") {
      insideTag = true;
      continue;
    }
    if (char === ">") {
      insideTag = false;
      continue;
    }
    if (!insideTag) {
      output += char;
    }
  }

  return output;
}

function stripWebVttHeaderAndNotes(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  let index = 0;

  if (/^WEBVTT\b/i.test(lines[0] ?? "")) {
    index = 1;
  }

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (/^NOTE(?:\s|$)/i.test(line.trim())) {
      index += 1;
      while (index < lines.length && (lines[index] ?? "").trim()) {
        index += 1;
      }
      continue;
    }
    cleaned.push(line);
    index += 1;
  }

  return cleaned.join("\n");
}

// ── Auto-Detection ───────────────────────────────────────────

/**
 * Detect timeline format from raw text content.
 * Examines the first 20 lines for format-specific patterns.
 */
export function detectTimelineFormat(text: string): TimelineFormat {
  const lines = text.split("\n").slice(0, 30).map((l) => l.trim());
  const joined = lines.join("\n");

  // EDL: starts with TITLE: or has numbered events with timecodes
  if (/^TITLE:/m.test(joined) || /^\d{3}\s+\w+\s+\w+\s+\w+/.test(joined)) {
    return "edl";
  }

  // WebVTT: starts with WEBVTT
  if (/^WEBVTT/i.test(lines[0] ?? "")) {
    return "vtt";
  }

  // SRT: numbered lines followed by timecodes with -->
  if (/^\d+$/.test(lines[0] ?? "") && (lines[1] ?? "").includes("-->")) {
    return "srt";
  }

  // Script: scene headings INT./EXT.
  if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(joined)) {
    return "script";
  }

  // Game events: JSON array or event_name patterns
  if (/^\[/.test(text.trim()) || /^{/.test(text.trim())) {
    return "game_events";
  }

  // CSV cue sheet: has header row with timecode-like columns
  if (/\b(timecode|tc_in|time_in|start|cue_in)\b/i.test(lines[0] ?? "")) {
    return "csv_cue";
  }

  // Timecoded notes: lines starting with timecodes
  const tcLineCount = lines.filter((l) => /^\d{1,2}:\d{2}/.test(l)).length;
  if (tcLineCount >= 3) {
    return "timecoded_notes";
  }

  // Default to manual
  return "manual";
}

// ── EDL Parser (CMX3600) ─────────────────────────────────────

/**
 * Parse a CMX3600 EDL file.
 * Format:
 *   TITLE: My Project
 *   001  AX  V  C  01:00:00:00 01:00:02:12 01:00:00:00 01:00:02:12
 *   * FROM CLIP NAME: scene_opening.mov
 *   * COMMENT: Door opens slowly
 */
export function parseEDL(text: string, frameRate = 24): TimelineCue[] {
  const lines = text.split("\n");
  const cues: TimelineCue[] = [];
  let index = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match EDL event lines: 001  AX  V  C  TC_IN  TC_OUT  TC_IN  TC_OUT
    const eventMatch = line.match(
      /^(\d{3})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})/
    );

    if (!eventMatch) continue;

    const tcIn = eventMatch[7]; // Record in
    const tcOut = eventMatch[8]; // Record out
    const inMs = timecodeToMs(tcIn, frameRate);
    const outMs = timecodeToMs(tcOut, frameRate);

    // Look ahead for clip name and comments
    let description = "";
    let clipName = "";
    const metadata: Record<string, string> = {
      eventNum: eventMatch[1],
      reel: eventMatch[2],
      track: eventMatch[3],
      editType: eventMatch[4],
    };

    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const nextLine = lines[j].trim();
      const clipMatch = nextLine.match(/^\*\s*FROM CLIP NAME:\s*(.+)/i);
      if (clipMatch) {
        clipName = clipMatch[1].trim();
        metadata.clipName = clipName;
      }
      const commentMatch = nextLine.match(/^\*\s*(?:COMMENT|LOC):\s*(.+)/i);
      if (commentMatch) {
        description = commentMatch[1].trim();
      }
      // Stop if we hit the next event
      if (/^\d{3}\s/.test(nextLine)) break;
    }

    if (!description && clipName) {
      // Use clip name as description if no comment
      description = clipName.replace(/[_-]/g, " ").replace(/\.\w+$/, "");
    }

    if (!description) {
      description = `Edit ${eventMatch[1]} at ${tcIn}`;
    }

    cues.push({
      id: createCueId(),
      index: index++,
      timecodeIn: tcIn,
      timecodeOut: tcOut,
      durationMs: outMs - inMs,
      description,
      status: "parsed",
      sourceMetadata: metadata,
    });
  }

  return cues;
}

// ── CSV Cue Sheet Parser ─────────────────────────────────────

/**
 * Parse a CSV cue sheet with timecode columns.
 * Auto-detects column mapping from headers.
 */
export function parseCsvCueSheet(text: string): TimelineCue[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));

  // Find relevant columns
  const tcInCol = headers.findIndex((h) =>
    /^(timecode|tc_in|time_in|start|cue_in|in|tc|time|start_tc)$/.test(h)
  );
  const tcOutCol = headers.findIndex((h) =>
    /^(tc_out|time_out|end|cue_out|out|end_tc|stop)$/.test(h)
  );
  const descCol = headers.findIndex((h) =>
    /^(description|desc|cue|note|notes|comment|text|action|event|name)$/.test(h)
  );
  const sceneCol = headers.findIndex((h) =>
    /^(scene|sc|reel|sequence|seq)$/.test(h)
  );
  const catCol = headers.findIndex((h) =>
    /^(category|cat|type|sfx_type)$/.test(h)
  );

  if (tcInCol < 0 && descCol < 0) return []; // Can't map anything useful

  const cues: TimelineCue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length <= 1 && !cols[0]) continue;

    const tcIn = tcInCol >= 0 ? cols[tcInCol] ?? "" : "";
    const tcOut = tcOutCol >= 0 ? cols[tcOutCol] ?? "" : undefined;
    const desc = descCol >= 0 ? cols[descCol] ?? "" : cols.join(" ");
    const scene = sceneCol >= 0 ? cols[sceneCol] : undefined;
    const cat = catCol >= 0 ? cols[catCol] : undefined;

    if (!desc.trim() && !tcIn.trim()) continue;

    const inMs = tcIn ? timecodeToMs(tcIn) : 0;
    const outMs = tcOut ? timecodeToMs(tcOut) : undefined;

    cues.push({
      id: createCueId(),
      index: i - 1,
      timecodeIn: tcIn || `00:00:${String(i).padStart(2, "0")}:00`,
      timecodeOut: tcOut,
      durationMs: outMs != null ? outMs - inMs : undefined,
      sceneId: scene,
      description: desc,
      category: cat,
      status: "parsed",
    });
  }

  return cues;
}

// ── SRT Parser ───────────────────────────────────────────────

/**
 * Parse SubRip (.srt) subtitle file.
 * Format:
 *   1
 *   00:02:14,120 --> 00:02:17,030
 *   Door opens slowly.
 */
export function parseSRT(text: string): TimelineCue[] {
  const blocks = text.trim().split(/\n\s*\n/);
  const cues: TimelineCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim());
    if (lines.length < 2) continue;

    // Find the timecode line (contains -->)
    const tcLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (tcLineIdx < 0) continue;

    const tcLine = lines[tcLineIdx];
    const tcMatch = tcLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]?\d{0,3})/
    );
    if (!tcMatch) continue;

    const tcIn = tcMatch[1].replace(",", ".");
    const tcOut = tcMatch[2].replace(",", ".");
    const description = stripMarkup(lines.slice(tcLineIdx + 1).join(" ")).trim();

    if (!description) continue;

    const inMs = timecodeToMs(tcIn);
    const outMs = timecodeToMs(tcOut);

    cues.push({
      id: createCueId(),
      index: cues.length,
      timecodeIn: tcIn,
      timecodeOut: tcOut,
      durationMs: outMs - inMs,
      description,
      status: "parsed",
    });
  }

  return cues;
}

// ── VTT Parser ───────────────────────────────────────────────

/**
 * Parse WebVTT subtitle file.
 * Similar to SRT but with WEBVTT header.
 */
export function parseVTT(text: string): TimelineCue[] {
  return parseSRT(stripWebVttHeaderAndNotes(text));
}

// ── Script / Screenplay Parser ───────────────────────────────

/**
 * Parse a screenplay excerpt.
 * Detects scene headings (INT./EXT.) and action lines.
 */
export function parseScript(text: string): TimelineCue[] {
  const lines = text.split("\n");
  const cues: TimelineCue[] = [];
  let currentScene = "";
  let sceneIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Scene heading
    const sceneMatch = trimmed.match(/^(INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-\s*(.+))?$/i);
    if (sceneMatch) {
      currentScene = `Scene ${++sceneIndex}: ${sceneMatch[2].trim()}`;
      // Add room tone cue for each new scene
      const location = sceneMatch[2].trim().toLowerCase();
      cues.push({
        id: createCueId(),
        index: cues.length,
        timecodeIn: "00:00:00:00",
        sceneId: currentScene,
        description: `Room tone / ambience for ${location}`,
        category: "Ambience",
        status: "parsed",
      });
      continue;
    }

    // Skip character names (ALL CAPS) and dialogue (parentheticals)
    if (/^[A-Z]{2,}(\s|$)/.test(trimmed) && trimmed.length < 40) continue;
    if (/^\(/.test(trimmed)) continue;

    // Action lines — these are the sound-relevant descriptions
    if (trimmed.length > 10 && !/^[A-Z\s]+$/.test(trimmed)) {
      cues.push({
        id: createCueId(),
        index: cues.length,
        timecodeIn: "00:00:00:00",
        sceneId: currentScene,
        description: trimmed,
        status: "parsed",
      });
    }
  }

  return cues;
}

// ── Timecoded Notes Parser ───────────────────────────────────

/**
 * Parse freeform timecoded notes.
 * Each line starts with a timecode followed by description.
 * Example:
 *   00:02:14:12 — Door opens slowly.
 *   00:02:17:03 — Character steps into flooded room.
 */
export function parseTimecodedNotes(text: string): TimelineCue[] {
  const lines = text.split("\n");
  const cues: TimelineCue[] = [];

  const tcPattern = /^(\d{1,2}:\d{2}(?::\d{2})?(?:[:.]\d{1,3})?)\s*[—–\-:]\s*(.+)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(tcPattern);
    if (match) {
      const tc = match[1];
      const desc = match[2].trim();
      if (desc) {
        cues.push({
          id: createCueId(),
          index: cues.length,
          timecodeIn: tc,
          description: desc,
          status: "parsed",
        });
      }
    }
  }

  return cues;
}

// ── Game Event List Parser ───────────────────────────────────

/**
 * Parse a game event list.
 * Supports JSON array format and CSV-like event lists.
 *
 * JSON format:
 *   [{ "event": "player_jump", "time": 0.0, "description": "Player jumps" }]
 *
 * Text format:
 *   player_jump | 0.0 | Player jumps from platform
 */
export function parseGameEvents(text: string): TimelineCue[] {
  const trimmed = text.trim();

  // Try JSON
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      let events = JSON.parse(trimmed);
      if (!Array.isArray(events)) events = [events];

      return events.map((ev: Record<string, unknown>, i: number) => ({
        id: createCueId(),
        index: i,
        timecodeIn: formatEventTime(ev.time ?? ev.timestamp ?? ev.t ?? 0),
        description: String(ev.description ?? ev.desc ?? ev.event ?? ev.name ?? `Event ${i + 1}`),
        category: String(ev.category ?? ev.type ?? ""),
        status: "parsed" as const,
        sourceMetadata: {
          eventName: String(ev.event ?? ev.name ?? ""),
          ...(ev.params ? { params: JSON.stringify(ev.params) } : {}),
        },
      }));
    } catch {
      // Fall through to text parsing
    }
  }

  // Text format: event_name | time | description
  const lines = text.split("\n").filter((l) => l.trim());
  const cues: TimelineCue[] = [];

  for (const line of lines) {
    const parts = line.split(/\s*[|,\t]\s*/);
    if (parts.length < 2) continue;

    const eventName = parts[0].trim();
    const time = parts[1].trim();
    const desc = parts.slice(2).join(" ").trim() || eventName.replace(/_/g, " ");

    cues.push({
      id: createCueId(),
      index: cues.length,
      timecodeIn: formatEventTime(time),
      description: desc,
      status: "parsed",
      sourceMetadata: { eventName },
    });
  }

  return cues;
}

function formatEventTime(time: unknown): string {
  if (typeof time === "string" && time.includes(":")) return time;
  const seconds = Number(time);
  if (isNaN(seconds)) return "00:00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.round((seconds % 1) * 24);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

// ── Manual Cue List Parser ───────────────────────────────────

/**
 * Parse manually entered cue descriptions.
 * Each non-empty line becomes one cue.
 */
export function parseManualCueList(text: string): TimelineCue[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((desc, i) => ({
      id: createCueId(),
      index: i,
      timecodeIn: "00:00:00:00",
      description: desc,
      status: "parsed" as const,
    }));
}

// ── Unified Parse Entry Point ────────────────────────────────

/**
 * Parse any supported format into TimelineCue[].
 * Auto-detects format if not specified.
 */
export function parseTimeline(
  text: string,
  format?: TimelineFormat,
  frameRate = 24
): { format: TimelineFormat; cues: TimelineCue[] } {
  const detected = format ?? detectTimelineFormat(text);

  let cues: TimelineCue[];

  switch (detected) {
    case "edl":
      cues = parseEDL(text, frameRate);
      break;
    case "csv_cue":
      cues = parseCsvCueSheet(text);
      break;
    case "srt":
      cues = parseSRT(text);
      break;
    case "vtt":
      cues = parseVTT(text);
      break;
    case "script":
      cues = parseScript(text);
      break;
    case "timecoded_notes":
      cues = parseTimecodedNotes(text);
      break;
    case "game_events":
      cues = parseGameEvents(text);
      break;
    case "manual":
      cues = parseManualCueList(text);
      break;
    default:
      cues = parseManualCueList(text);
  }

  return { format: detected, cues };
}
