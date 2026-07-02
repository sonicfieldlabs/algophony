/**
 * Algophony Studio — DAW Handoff Builder
 *
 * Builds professional handoff packages for different DAWs:
 * Reaper, Pro Tools, Ableton, Resolve/Premiere, Generic.
 */

import type { NamingTemplate, CueSheetEntry, DawHandoffConfig } from "@/lib/sfx/export-taxonomy";
import { generateFileName, buildCsvFromRows, buildCueSheet, CUE_SHEET_COLUMNS } from "@/lib/sfx/export-builders";
import { generateReaScript, generateReaperMarkersCsv, generateReaperRegionsCsv, type ReaScriptCue, type ReaScriptOptions } from "./reascript-generator";

// ── DAW Presets ──────────────────────────────────────────────

export const DAW_PRESETS = [
  "reaper", "pro_tools", "ableton", "resolve", "premiere", "generic",
] as const;

export type DawPreset = (typeof DAW_PRESETS)[number];

export interface DawPresetDef {
  id: DawPreset;
  label: string;
  description: string;
  icon: string;
  audioFolder: string;
  metadataFolder: string;
  specialFiles: string[];
  namingPreset: NamingTemplate;
  folderStructure: FolderNode[];
}

export interface FolderNode {
  name: string;
  type: "folder" | "file";
  children?: FolderNode[];
  dynamic?: boolean;
  description?: string;
}

export const DAW_PRESET_DEFS: Record<DawPreset, DawPresetDef> = {
  reaper: {
    id: "reaper",
    label: "REAPER",
    description: "ReaScript import with auto-track creation, markers, and regions",
    icon: "Terminal",
    audioFolder: "Audio",
    metadataFolder: "Metadata",
    specialFiles: ["reaper_import.lua", "markers.csv", "regions.csv"],
    namingPreset: {
      template: "{scene}_{category}_{sound_name}_v{version}",
      variables: ["scene", "category", "sound_name", "version"],
      separator: "_",
      caseStyle: "pascal",
    },
    folderStructure: [
      { name: "Audio/", type: "folder", dynamic: true, description: "Audio files organized by category" },
      { name: "reaper_import.lua", type: "file", description: "Run in REAPER: Extensions → ReaScript → Run" },
      { name: "cue_sheet.csv", type: "file", description: "Professional cue sheet" },
      { name: "markers.csv", type: "file", description: "REAPER markers import" },
      { name: "regions.csv", type: "file", description: "REAPER regions import" },
      { name: "prompt_history.json", type: "file", description: "Full prompt metadata" },
      { name: "metadata_manifest.json", type: "file", description: "Export manifest" },
    ],
  },
  pro_tools: {
    id: "pro_tools",
    label: "Pro Tools",
    description: "Pro Tools-friendly folder structure with iXML-ready naming",
    icon: "Disc3",
    audioFolder: "Audio Files",
    metadataFolder: "Session Data",
    specialFiles: ["session_info.txt", "track_list.txt"],
    namingPreset: {
      template: "{project_code}_{scene}_{category}_{sound_name}_{take}",
      variables: ["project_code", "scene", "category", "sound_name", "take"],
      separator: "_",
      caseStyle: "upper",
    },
    folderStructure: [
      { name: "Audio Files/", type: "folder", dynamic: true, description: "Audio organized by category" },
      { name: "Session Data/", type: "folder", children: [
        { name: "session_info.txt", type: "file", description: "Session metadata" },
        { name: "track_list.txt", type: "file", description: "Suggested track layout" },
        { name: "cue_sheet.csv", type: "file", description: "Professional cue sheet" },
      ]},
      { name: "Clip Groups/", type: "folder", dynamic: true, description: "Grouped clips by scene" },
      { name: "metadata_manifest.json", type: "file", description: "Export manifest" },
    ],
  },
  ableton: {
    id: "ableton",
    label: "Ableton Live",
    description: "Flat sample folder structure for Ableton browser",
    icon: "LayoutGrid",
    audioFolder: "Samples",
    metadataFolder: "Project Info",
    specialFiles: [],
    namingPreset: {
      template: "{category}_{sound_name}_{variation}",
      variables: ["category", "sound_name", "variation"],
      separator: "_",
      caseStyle: "pascal",
    },
    folderStructure: [
      { name: "Samples/", type: "folder", dynamic: true, description: "Flat folder for Ableton browser" },
      { name: "Project Info/", type: "folder", children: [
        { name: "cue_sheet.csv", type: "file" },
        { name: "prompts.json", type: "file" },
      ]},
      { name: "metadata_manifest.json", type: "file" },
    ],
  },
  resolve: {
    id: "resolve",
    label: "DaVinci Resolve",
    description: "Media folder with EDL markers for timeline import",
    icon: "Film",
    audioFolder: "Media",
    metadataFolder: "Metadata",
    specialFiles: ["markers.edl"],
    namingPreset: {
      template: "{scene}_{category}_{sound_name}_v{version}",
      variables: ["scene", "category", "sound_name", "version"],
      separator: "_",
      caseStyle: "pascal",
    },
    folderStructure: [
      { name: "Media/", type: "folder", dynamic: true, description: "Audio files for media pool" },
      { name: "Metadata/", type: "folder", children: [
        { name: "markers.edl", type: "file", description: "EDL for timeline markers" },
        { name: "cue_sheet.csv", type: "file" },
      ]},
      { name: "metadata_manifest.json", type: "file" },
    ],
  },
  premiere: {
    id: "premiere",
    label: "Premiere Pro",
    description: "Media folder with CSV markers for Premiere import",
    icon: "Clapperboard",
    audioFolder: "Media",
    metadataFolder: "Metadata",
    specialFiles: ["markers.csv"],
    namingPreset: {
      template: "{scene}_{category}_{sound_name}_v{version}",
      variables: ["scene", "category", "sound_name", "version"],
      separator: "_",
      caseStyle: "pascal",
    },
    folderStructure: [
      { name: "Media/", type: "folder", dynamic: true, description: "Audio for project panel" },
      { name: "Metadata/", type: "folder", children: [
        { name: "markers.csv", type: "file", description: "Timeline markers" },
        { name: "cue_sheet.csv", type: "file" },
      ]},
      { name: "metadata_manifest.json", type: "file" },
    ],
  },
  generic: {
    id: "generic",
    label: "Generic / Universal",
    description: "Universal folder structure for any DAW or NLE",
    icon: "FolderOpen",
    audioFolder: "Audio",
    metadataFolder: "Metadata",
    specialFiles: [],
    namingPreset: {
      template: "{category}_{sound_name}_v{version}",
      variables: ["category", "sound_name", "version"],
      separator: "_",
      caseStyle: "pascal",
    },
    folderStructure: [
      { name: "Audio/", type: "folder", dynamic: true, description: "Audio by category" },
      { name: "Metadata/", type: "folder", children: [
        { name: "cue_sheet.csv", type: "file" },
        { name: "prompts.json", type: "file" },
      ]},
      { name: "metadata_manifest.json", type: "file" },
    ],
  },
};

// ── Track Suggestions ────────────────────────────────────────

export interface TrackSuggestion {
  name: string;
  category: string;
  itemCount: number;
  color: string;
  pan?: string;
  bus?: string;
}

export function generateTrackSuggestions(
  cards: Record<string, unknown>[]
): TrackSuggestion[] {
  const byCategory = new Map<string, number>();
  for (const card of cards) {
    const cat = String(card.category ?? "Misc");
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }

  const trackColors: Record<string, string> = {
    Foley: "#78B48C",
    Ambience: "#648CC8",
    Footsteps: "#A0825A",
    Impact: "#C85050",
    Creature: "#B464B4",
    Door: "#8CA064",
    Vehicle: "#6464A0",
    Water: "#50A0C8",
    Fire: "#DC7840",
    UI: "#3CB4B4",
    Misc: "#8C8CA0",
  };

  const busMapping: Record<string, string> = {
    Foley: "FX_Foley",
    Ambience: "FX_Ambience",
    Footsteps: "FX_Foley",
    Impact: "FX_Impacts",
    Creature: "FX_Creature",
    Door: "FX_Foley",
    Vehicle: "FX_Vehicle",
    Water: "FX_Foley",
    Fire: "FX_Foley",
    UI: "FX_UI",
    Misc: "FX_Misc",
  };

  return Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      name: `SFX_${category}`,
      category,
      itemCount: count,
      color: trackColors[category] ?? "#8C8CA0",
      bus: busMapping[category] ?? "FX_Misc",
    }));
}

// ── Handoff Package Builder ──────────────────────────────────

export interface DawPackageManifest {
  projectName: string;
  dawPreset: DawPreset;
  exportedAt: string;
  files: Record<string, string>;
  folderStructure: FolderNode[];
  trackSuggestions: TrackSuggestion[];
  stats: {
    audioFiles: number;
    cueSheetEntries: number;
    categories: number;
    totalDurationSeconds: number;
  };
}

export function buildDawHandoffPackage(
  cards: Record<string, unknown>[],
  generations: Record<string, unknown>[],
  dawPreset: DawPreset,
  config: DawHandoffConfig
): DawPackageManifest {
  const presetDef = DAW_PRESET_DEFS[dawPreset];
  const projectCode = config.namingTemplate.template.includes("{project_code}")
    ? "SFX"
    : "";

  // Build cue sheet
  const cueEntries = buildCueSheet(cards, projectCode || "SFX");

  // Generate filenames with DAW-specific naming
  const renamedEntries = cueEntries.map((entry) => ({
    ...entry,
    file_name: generateFileName(presetDef.namingPreset, {
      project_code: projectCode,
      scene: entry.scene || "SC01",
      category: entry.category,
      sound_name: entry.sound_name,
      variation: "01",
      take: "01",
      version: "01",
    }),
  }));

  // Build files map
  const files: Record<string, string> = {};

  // Cue sheet CSV
  files["cue_sheet.csv"] = buildCsvFromRows(
    renamedEntries as unknown as Record<string, unknown>[],
    CUE_SHEET_COLUMNS
  );

  // Prompt history JSON
  files["prompt_history.json"] = JSON.stringify(
    cards.map((c) => ({
      title: c.title,
      category: c.category,
      prompt: c.generated_prompt,
      exclusions: c.exclusions,
      duration: c.duration_seconds,
      loop: c.loop,
      model: c.model_id,
      created: c.created_at,
    })),
    null,
    2
  );

  // DAW-specific files
  if (dawPreset === "reaper") {
    const reaCues: ReaScriptCue[] = renamedEntries.map((e) => ({
      name: e.sound_name,
      category: e.category,
      timecodeIn: e.timecode_in,
      timecodeOut: e.timecode_out || undefined,
      durationSeconds: e.duration || 4,
      filename: e.file_name,
      prompt: e.prompt,
      layerRole: e.layer_role,
    }));

    const reaOpts: Partial<ReaScriptOptions> = {
      projectName: projectCode || "Algophony Studio",
      audioFolder: presetDef.audioFolder,
      createTracks: true,
      createMarkers: true,
      createRegions: true,
      organizeByCategory: config.folderByCategory,
      setTrackColors: true,
      addNotesToItems: true,
    };

    files["reaper_import.lua"] = generateReaScript(reaCues, reaOpts);
    files["markers.csv"] = generateReaperMarkersCsv(reaCues);
    files["regions.csv"] = generateReaperRegionsCsv(reaCues);
  }

  if (dawPreset === "pro_tools") {
    files["session_info.txt"] = [
      `SESSION NAME: ${projectCode || "Algophony Studio"}`,
      `SAMPLE RATE: 48000`,
      `BIT DEPTH: 24`,
      `FRAME RATE: 24`,
      `AUDIO FILES: ${generations.length}`,
      `CREATED BY: Algophony Studio`,
      `DATE: ${new Date().toISOString().split("T")[0]}`,
    ].join("\n");

    const trackSuggestions = generateTrackSuggestions(cards);
    files["track_list.txt"] = trackSuggestions
      .map((t) => `${t.name}\t${t.category}\t${t.itemCount} items\t→ ${t.bus}`)
      .join("\n");
  }

  if (dawPreset === "resolve") {
    files["markers.edl"] = generateEdlMarkers(renamedEntries, projectCode || "Algophony Studio");
  }

  if (dawPreset === "premiere") {
    files["markers.csv"] = generatePremiereMarkersCsv(renamedEntries);
  }

  // Metadata manifest
  const manifest: DawPackageManifest = {
    projectName: projectCode || "Algophony Studio",
    dawPreset,
    exportedAt: new Date().toISOString(),
    files,
    folderStructure: presetDef.folderStructure,
    trackSuggestions: generateTrackSuggestions(cards),
    stats: {
      audioFiles: generations.filter((g) => g.audio_storage_path).length,
      cueSheetEntries: renamedEntries.length,
      categories: [...new Set(cards.map((c) => String(c.category ?? "")))].length,
      totalDurationSeconds: cards.reduce((sum, c) => sum + Number(c.duration_seconds ?? 0), 0),
    },
  };

  files["metadata_manifest.json"] = JSON.stringify(manifest, null, 2);

  return manifest;
}

// ── EDL / Premiere Helpers ───────────────────────────────────

function generateEdlMarkers(entries: CueSheetEntry[], title: string): string {
  const lines = [`TITLE: ${title}`, `FCM: NON-DROP FRAME`, ``];
  entries.forEach((e, i) => {
    const num = String(i + 1).padStart(3, "0");
    lines.push(`${num}  AX  V  C  ${e.timecode_in} ${e.timecode_out || e.timecode_in} ${e.timecode_in} ${e.timecode_out || e.timecode_in}`);
    lines.push(`* FROM CLIP NAME: ${e.file_name}`);
    lines.push(`* COMMENT: ${e.sound_name} [${e.category}]`);
    lines.push(``);
  });
  return lines.join("\n");
}

function generatePremiereMarkersCsv(entries: CueSheetEntry[]): string {
  const header = "Marker Name,Description,In,Out,Duration,Color";
  const rows = entries.map((e) =>
    `${e.sound_name},${e.category} — ${e.prompt.slice(0, 80)},${e.timecode_in},${e.timecode_out || ""},${e.duration}s,`
  );
  return [header, ...rows].join("\n");
}
