/**
 * Algophony Studio — ReaScript Generator
 *
 * Generates Lua ReaScript code for REAPER integration.
 * Creates tracks, places items at timecoded positions,
 * names regions/markers from Algophony Studio metadata.
 */

// ── Types ────────────────────────────────────────────────────

export interface ReaScriptCue {
  name: string;
  category: string;
  timecodeIn: string;
  timecodeOut?: string;
  durationSeconds: number;
  filename: string;
  trackName?: string;
  color?: string;
  prompt?: string;
  layerRole?: string;
}

export interface ReaScriptOptions {
  projectName: string;
  audioFolder: string;
  createTracks: boolean;
  createMarkers: boolean;
  createRegions: boolean;
  organizeByCategory: boolean;
  setTrackColors: boolean;
  addNotesToItems: boolean;
  sampleRate: number;
  frameRate: number;
}

const DEFAULT_OPTIONS: ReaScriptOptions = {
  projectName: "Algophony_Studio_Import",
  audioFolder: "Audio",
  createTracks: true,
  createMarkers: true,
  createRegions: false,
  organizeByCategory: true,
  setTrackColors: true,
  addNotesToItems: true,
  sampleRate: 48000,
  frameRate: 24,
};

// ── Category Colors (REAPER native color format) ─────────────

const CATEGORY_COLORS: Record<string, string> = {
  Foley: "reaper.ColorToNative(120, 180, 140)|0x1000000",
  Ambience: "reaper.ColorToNative(100, 140, 200)|0x1000000",
  Footsteps: "reaper.ColorToNative(160, 130, 90)|0x1000000",
  Impact: "reaper.ColorToNative(200, 80, 80)|0x1000000",
  Creature: "reaper.ColorToNative(180, 100, 180)|0x1000000",
  Door: "reaper.ColorToNative(140, 160, 100)|0x1000000",
  Vehicle: "reaper.ColorToNative(100, 100, 160)|0x1000000",
  Water: "reaper.ColorToNative(80, 160, 200)|0x1000000",
  Fire: "reaper.ColorToNative(220, 120, 60)|0x1000000",
  Weapon: "reaper.ColorToNative(180, 60, 60)|0x1000000",
  UI: "reaper.ColorToNative(60, 180, 180)|0x1000000",
  Magic: "reaper.ColorToNative(160, 80, 220)|0x1000000",
  Horror: "reaper.ColorToNative(80, 60, 100)|0x1000000",
  Weather: "reaper.ColorToNative(120, 140, 180)|0x1000000",
  Machinery: "reaper.ColorToNative(140, 140, 140)|0x1000000",
  Electricity: "reaper.ColorToNative(220, 200, 60)|0x1000000",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "reaper.ColorToNative(140, 140, 160)|0x1000000";
}

// ── Timecode → Seconds ───────────────────────────────────────

function tcToSeconds(tc: string, frameRate: number): string {
  // Return a Lua expression that computes the position
  const parts = tc.match(/^(\d{1,2}):(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/);
  if (!parts) return "0";
  const h = parts[1];
  const m = parts[2];
  const s = parts[3];
  const f = parts[4] ?? "0";
  const ms = parts[5];
  if (ms) {
    return `(${h}*3600 + ${m}*60 + ${s} + ${ms.padEnd(3, "0")}/1000)`;
  }
  return `(${h}*3600 + ${m}*60 + ${s} + ${f}/${frameRate})`;
}

// ── ReaScript Generator ──────────────────────────────────────

/**
 * Generate a complete REAPER Lua script from cue data.
 */
export function generateReaScript(
  cues: ReaScriptCue[],
  opts: Partial<ReaScriptOptions> = {}
): string {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const lines: string[] = [];

  // Header
  lines.push(`-- ═══════════════════════════════════════════════════════════`);
  lines.push(`-- Algophony Studio — REAPER Import Script`);
  lines.push(`-- Project: ${o.projectName}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Cues: ${cues.length}`);
  lines.push(`-- ═══════════════════════════════════════════════════════════`);
  lines.push(``);
  lines.push(`-- Usage: Extensions → ReaScript → Run...`);
  lines.push(`-- Place audio files in the same directory as this script,`);
  lines.push(`-- or update the audio_folder path below.`);
  lines.push(``);

  // Configuration
  lines.push(`-- ── Configuration ──────────────────────────────────────────`);
  lines.push(``);
  lines.push(`local project_name = "${escapeLua(o.projectName)}"`);
  lines.push(`local audio_folder = "${escapeLua(o.audioFolder)}"`);
  lines.push(`local frame_rate = ${o.frameRate}`);
  lines.push(``);

  // Utility functions
  lines.push(`-- ── Utilities ──────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`local function get_script_path()`);
  lines.push(`  local info = debug.getinfo(1, "S")`);
  lines.push(`  local path = info.source:match("@?(.*[\\\\/])")`);
  lines.push(`  return path or ""`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`local function file_exists(path)`);
  lines.push(`  local f = io.open(path, "r")`);
  lines.push(`  if f then f:close() return true end`);
  lines.push(`  return false`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`local script_path = get_script_path()`);
  lines.push(`local sep = package.config:sub(1,1)`);
  lines.push(``);

  // Begin undo block
  lines.push(`-- ── Main ──────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`reaper.Undo_BeginBlock()`);
  lines.push(`reaper.PreventUIRefresh(1)`);
  lines.push(``);

  // Create tracks by category
  if (o.createTracks && o.organizeByCategory) {
    const categories = [...new Set(cues.map((c) => c.category || "Misc"))];
    lines.push(`-- Create tracks for each category`);
    lines.push(`local tracks = {}`);
    lines.push(``);

    for (const cat of categories) {
      lines.push(`reaper.InsertTrackAtIndex(reaper.CountTracks(0), true)`);
      lines.push(`tracks["${escapeLua(cat)}"] = reaper.GetTrack(0, reaper.CountTracks(0) - 1)`);
      lines.push(`reaper.GetSetMediaTrackInfo_String(tracks["${escapeLua(cat)}"], "P_NAME", "${escapeLua(cat)}", true)`);
      if (o.setTrackColors) {
        lines.push(`reaper.SetTrackColor(tracks["${escapeLua(cat)}"], ${getCategoryColor(cat)})`);
      }
      lines.push(``);
    }
  } else if (o.createTracks) {
    lines.push(`-- Create a single track`);
    lines.push(`reaper.InsertTrackAtIndex(reaper.CountTracks(0), true)`);
    lines.push(`local track = reaper.GetTrack(0, reaper.CountTracks(0) - 1)`);
    lines.push(`reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "${escapeLua(o.projectName)}", true)`);
    lines.push(``);
  }

  // Place items
  lines.push(`-- Place items at cue positions`);
  lines.push(`local items_placed = 0`);
  lines.push(`local items_missing = 0`);
  lines.push(``);

  for (const cue of cues) {
    const pos = tcToSeconds(cue.timecodeIn, o.frameRate);
    const dur = cue.durationSeconds || 4;
    const audioPath = `script_path .. audio_folder .. sep .. "${escapeLua(cue.filename)}"`;
    const trackRef = o.organizeByCategory
      ? `tracks["${escapeLua(cue.category || "Misc")}"]`
      : "track";

    lines.push(`-- ${cue.name}`);
    lines.push(`do`);
    lines.push(`  local audio_path = ${audioPath}`);
    lines.push(`  local pos = ${pos}`);
    lines.push(`  if file_exists(audio_path) then`);
    lines.push(`    local item = reaper.AddMediaItemToTrack(${trackRef})`);
    lines.push(`    reaper.SetMediaItemPosition(item, pos, false)`);
    lines.push(`    reaper.SetMediaItemLength(item, ${dur}, false)`);
    lines.push(`    local take = reaper.AddTakeToMediaItem(item)`);
    lines.push(`    local source = reaper.PCM_Source_CreateFromFile(audio_path)`);
    lines.push(`    if source then reaper.SetMediaItemTake_Source(take, source) end`);
    lines.push(`    reaper.GetSetMediaItemTakeInfo_String(take, "P_NAME", "${escapeLua(cue.name)}", true)`);
    if (o.addNotesToItems && cue.prompt) {
      lines.push(`    reaper.ULT_SetMediaItemNote(item, "${escapeLua(cue.prompt)}")`);
    }
    lines.push(`    items_placed = items_placed + 1`);
    lines.push(`  else`);
    lines.push(`    items_missing = items_missing + 1`);
    lines.push(`  end`);
    lines.push(`end`);
    lines.push(``);
  }

  // Markers
  if (o.createMarkers) {
    lines.push(`-- Create markers at cue positions`);
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      const pos = tcToSeconds(cue.timecodeIn, o.frameRate);
      lines.push(`reaper.AddProjectMarker(0, false, ${pos}, 0, "${escapeLua(cue.name)}", ${i + 1})`);
    }
    lines.push(``);
  }

  // Regions
  if (o.createRegions) {
    lines.push(`-- Create regions for each cue`);
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      const posIn = tcToSeconds(cue.timecodeIn, o.frameRate);
      const dur = cue.durationSeconds || 4;
      lines.push(`reaper.AddProjectMarker(0, true, ${posIn}, ${posIn} + ${dur}, "${escapeLua(cue.name)}", ${i + 1})`);
    }
    lines.push(``);
  }

  // End
  lines.push(`-- ── Summary ───────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`reaper.PreventUIRefresh(-1)`);
  lines.push(`reaper.UpdateArrange()`);
  lines.push(`reaper.Undo_EndBlock("Algophony Studio Import: " .. project_name, -1)`);
  lines.push(``);
  lines.push(`reaper.ShowMessageBox(`);
  lines.push(`  "Algophony Studio Import Complete\\n\\n" ..`);
  lines.push(`  "Project: " .. project_name .. "\\n" ..`);
  lines.push(`  "Items placed: " .. items_placed .. "\\n" ..`);
  lines.push(`  "Audio missing: " .. items_missing .. "\\n",`);
  lines.push(`  "Algophony Studio", 0)`);

  return lines.join("\n");
}

// ── Marker/Region CSV Exports ────────────────────────────────

/**
 * Generate REAPER-compatible markers CSV.
 * Format: #,Name,Start,End,Length,Color
 */
export function generateReaperMarkersCsv(
  cues: ReaScriptCue[],
  frameRate = 24
): string {
  const header = "#\tName\tStart\tEnd\tColor";
  const rows = cues.map((cue, i) => {
    const startSec = evalTimecode(cue.timecodeIn, frameRate);
    return `M${i + 1}\t${cue.name}\t${formatTime(startSec)}\t\t`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Generate REAPER-compatible regions CSV.
 */
export function generateReaperRegionsCsv(
  cues: ReaScriptCue[],
  frameRate = 24
): string {
  const header = "#\tName\tStart\tEnd\tColor";
  const rows = cues.map((cue, i) => {
    const startSec = evalTimecode(cue.timecodeIn, frameRate);
    const endSec = startSec + (cue.durationSeconds || 4);
    return `R${i + 1}\t${cue.name}\t${formatTime(startSec)}\t${formatTime(endSec)}\t`;
  });
  return [header, ...rows].join("\n");
}

// ── Helpers ──────────────────────────────────────────────────

function escapeLua(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function evalTimecode(tc: string, frameRate: number): number {
  const parts = tc.match(/^(\d{1,2}):(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/);
  if (!parts) return 0;
  const h = Number(parts[1]);
  const m = Number(parts[2]);
  const s = Number(parts[3]);
  const f = Number(parts[4] ?? 0);
  const ms = parts[5] ? Number(parts[5].padEnd(3, "0")) : 0;
  return h * 3600 + m * 60 + s + f / frameRate + ms / 1000;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.padStart(6, "0")}`;
}
