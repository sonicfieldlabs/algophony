import "server-only";

import {
  existsSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { metadataToPrompt } from "@/lib/sfx/metadata-prompt";
import type { FrequencyRoleId, StackerLayerType } from "@/lib/sfx/stacker-taxonomy";
import {
  ensureAlgophonyStudioDir,
  readWorkspaceManifest,
  writeWorkspaceManifest,
} from "./workspace";

export const SUPPORTED_AUDIO_EXTENSIONS = [
  ".wav",
  ".wave",
  ".aif",
  ".aiff",
  ".flac",
  ".mp3",
  ".aac",
  ".m4a",
  ".ogg",
  ".oga",
  ".opus",
] as const;

export const SUPPORTED_METADATA_EXTENSIONS = [".json", ".csv", ".tsv", ".txt", ".md", ".rpp"] as const;

export interface ExtractedAudioMetadata {
  durationSeconds: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
  codec: string | null;
}

export interface LocalSoundUserMetadata {
  favorite: boolean;
  title: string | null;
  prompt: string | null;
  notes: string | null;
  category: string | null;
  subcategory: string | null;
  action: string | null;
  material: string | null;
  mood: string | null;
  acousticSpace: string | null;
  layerType: StackerLayerType | null;
  frequencyRole: FrequencyRoleId | null;
  rating: number | null;
  tags: string[];
  updatedAt: string | null;
}

export interface LocalSoundAsset {
  id: string;
  path: string;
  root: string;
  relativePath: string;
  fileName: string;
  extension: string;
  source: "imported";
  sizeBytes: number;
  modifiedAt: string;
  fingerprint: string;
  metadata: ExtractedAudioMetadata;
  sidecar: Record<string, unknown> | null;
  promptCandidate: string;
  tags: string[];
  userMetadata: LocalSoundUserMetadata;
}

export interface LocalSoundLibrary {
  version: 1;
  scannedAt: string | null;
  roots: string[];
  sounds: LocalSoundAsset[];
}

export interface LibrarySummary {
  roots: number;
  sounds: number;
  favorites: number;
  totalBytes: number;
  formats: Record<string, number>;
}

export type LocalSoundUpdate = Partial<Omit<LocalSoundUserMetadata, "updatedAt">>;

const LIBRARY_VERSION = 1;
const MAX_FILES_PER_SCAN = 10_000;
const MAX_DEPTH = 24;

function libraryPath(): string {
  return join(/*turbopackIgnore: true*/ ensureAlgophonyStudioDir(), "library.json");
}

export function readLocalSoundLibrary(): LocalSoundLibrary {
  const path = libraryPath();
  if (existsSync(/*turbopackIgnore: true*/ path)) {
    try {
      return normalizeLibrary(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")) as Partial<LocalSoundLibrary>);
    } catch {
      // Continue with an empty library if the development file is malformed.
    }
  }

  return {
    version: LIBRARY_VERSION,
    scannedAt: null,
    roots: readWorkspaceManifest().libraryRoots,
    sounds: [],
  };
}

export function writeLocalSoundLibrary(library: LocalSoundLibrary): void {
  mkdirSync(/*turbopackIgnore: true*/ dirname(libraryPath()), { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ libraryPath(), JSON.stringify(normalizeLibrary(library), null, 2), "utf8");
}

export function summarizeLibrary(library = readLocalSoundLibrary()): LibrarySummary {
  return library.sounds.reduce<LibrarySummary>((summary, sound) => {
    summary.sounds += 1;
    if (sound.userMetadata.favorite) summary.favorites += 1;
    summary.totalBytes += sound.sizeBytes;
    summary.formats[sound.extension] = (summary.formats[sound.extension] ?? 0) + 1;
    return summary;
  }, {
    roots: library.roots.length,
    sounds: 0,
    favorites: 0,
    totalBytes: 0,
    formats: {},
  });
}

export function addLibraryRoot(folderPath: string): LocalSoundLibrary {
  const root = resolve(/*turbopackIgnore: true*/ folderPath);
  const rootStat = statSync(root);
  if (!rootStat.isDirectory()) {
    throw new Error("Library root must be a folder.");
  }

  const manifest = readWorkspaceManifest();
  const roots = Array.from(new Set([...manifest.libraryRoots, root]));
  writeWorkspaceManifest({ ...manifest, libraryRoots: roots });
  return rescanLibrary(roots);
}

export function removeLibraryRoot(folderPath: string): LocalSoundLibrary {
  const root = resolve(/*turbopackIgnore: true*/ folderPath);
  const manifest = readWorkspaceManifest();
  const roots = manifest.libraryRoots.filter((item) => item !== root);
  writeWorkspaceManifest({ ...manifest, libraryRoots: roots });

  const current = readLocalSoundLibrary();
  const library: LocalSoundLibrary = {
    ...current,
    roots,
    sounds: current.sounds.filter((sound) => sound.root !== root),
  };
  writeLocalSoundLibrary(library);
  return library;
}

export function rescanLibrary(roots = readWorkspaceManifest().libraryRoots): LocalSoundLibrary {
  const previous = readLocalSoundLibrary();
  const previousById = new Map(previous.sounds.map((sound) => [sound.id, sound.userMetadata]));
  const previousByPath = new Map(previous.sounds.map((sound) => [sound.path, sound.userMetadata]));
  const sounds: LocalSoundAsset[] = [];
  for (const root of roots) {
    if (!existsSync(/*turbopackIgnore: true*/ root)) continue;
    const stat = statSync(/*turbopackIgnore: true*/ root);
    if (!stat.isDirectory()) continue;
    sounds.push(...scanRoot(root, MAX_FILES_PER_SCAN - sounds.length).map((sound) => {
      const userMetadata = previousById.get(sound.id) ?? previousByPath.get(sound.path);
      return userMetadata ? refreshPrompt({ ...sound, userMetadata }) : sound;
    }));
    if (sounds.length >= MAX_FILES_PER_SCAN) break;
  }

  const library: LocalSoundLibrary = {
    version: LIBRARY_VERSION,
    scannedAt: new Date().toISOString(),
    roots,
    sounds,
  };
  writeLocalSoundLibrary(library);
  return library;
}

export function updateLocalSound(soundId: string, updates: LocalSoundUpdate): LocalSoundAsset {
  const library = readLocalSoundLibrary();
  let updatedSound: LocalSoundAsset | null = null;
  const sounds = library.sounds.map((sound) => {
    if (sound.id !== soundId) return sound;
    updatedSound = refreshPrompt({
      ...sound,
      userMetadata: mergeUserMetadata(sound.userMetadata, updates),
    });
    return updatedSound;
  });

  if (!updatedSound) throw new Error("Local sound not found.");
  writeLocalSoundLibrary({ ...library, sounds });
  return updatedSound;
}

export function batchUpdateLocalSounds(soundIds: string[], updates: LocalSoundUpdate): LocalSoundAsset[] {
  const idSet = new Set(soundIds);
  if (idSet.size === 0) return [];

  const library = readLocalSoundLibrary();
  const updated: LocalSoundAsset[] = [];
  const sounds = library.sounds.map((sound) => {
    if (!idSet.has(sound.id)) return sound;
    const next = refreshPrompt({
      ...sound,
      userMetadata: mergeUserMetadata(sound.userMetadata, updates),
    });
    updated.push(next);
    return next;
  });

  writeLocalSoundLibrary({ ...library, sounds });
  return updated;
}

export function promptFromSound(sound: LocalSoundAsset): string {
  if (sound.userMetadata.prompt?.trim()) return sound.userMetadata.prompt.trim();
  return metadataToPrompt({
    fileName: sound.userMetadata.title ?? sound.fileName,
    relativePath: sound.relativePath,
    tags: allSoundTags(sound),
    sidecar: sound.sidecar,
    audio: sound.metadata,
    metadata: userMetadataRecord(sound.userMetadata),
    source: "imported",
  }).prompt;
}

export function promptCandidates(soundIds?: string[]): Array<{ soundId: string; path: string; prompt: string }> {
  const library = readLocalSoundLibrary();
  const ids = soundIds?.length ? new Set(soundIds) : null;
  return library.sounds
    .filter((sound) => !ids || ids.has(sound.id))
    .map((sound) => ({ soundId: sound.id, path: sound.path, prompt: promptFromSound(sound) }));
}

export function getLocalSoundById(soundId: string): LocalSoundAsset | null {
  return readLocalSoundLibrary().sounds.find((sound) => sound.id === soundId) ?? null;
}

export function createLocalSoundAudioUrl(soundId: string): string {
  return `/api/local/sounds/${encodeURIComponent(soundId)}/audio`;
}

export function contentTypeForAudioExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case ".wav":
    case ".wave":
      return "audio/wav";
    case ".aif":
    case ".aiff":
      return "audio/aiff";
    case ".flac":
      return "audio/flac";
    case ".mp3":
      return "audio/mpeg";
    case ".aac":
      return "audio/aac";
    case ".m4a":
      return "audio/mp4";
    case ".ogg":
    case ".oga":
      return "audio/ogg";
    case ".opus":
      return "audio/opus";
    default:
      return "application/octet-stream";
  }
}

function normalizeLibrary(input: Partial<LocalSoundLibrary>): LocalSoundLibrary {
  return {
    version: LIBRARY_VERSION,
    scannedAt: input.scannedAt ?? null,
    roots: Array.isArray(input.roots) ? input.roots.filter((v): v is string => typeof v === "string") : [],
    sounds: Array.isArray(input.sounds) ? input.sounds.filter(isSoundAsset).map(normalizeSoundAsset) : [],
  };
}

function isSoundAsset(value: unknown): value is LocalSoundAsset {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as LocalSoundAsset).id === "string" &&
    typeof (value as LocalSoundAsset).path === "string"
  );
}

function scanRoot(root: string, limit: number): LocalSoundAsset[] {
  const sounds: LocalSoundAsset[] = [];
  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (stack.length && sounds.length < limit) {
    const current = stack.pop();
    if (!current || current.depth > MAX_DEPTH) continue;

    let entries: import("node:fs").Dirent[];
    try {
      entries = readDirectory(current.dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = join(/*turbopackIgnore: true*/ current.dir, entry.name);
      if (entry.isDirectory()) {
        stack.push({ dir: fullPath, depth: current.depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;

      const extension = extname(entry.name).toLowerCase();
      if (!isSupportedAudioExtension(extension)) continue;

      try {
        sounds.push(soundAssetFromPath(root, fullPath));
      } catch {
        // Skip unreadable files; a future diagnostics panel can expose these.
      }

      if (sounds.length >= limit) break;
    }
  }

  return sounds.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function readDirectory(dir: string): import("node:fs").Dirent[] {
  return readdirSync(/*turbopackIgnore: true*/ dir, { withFileTypes: true }).filter((entry) => {
    if (entry.isSymbolicLink()) return false;
    return true;
  });
}

function isSupportedAudioExtension(extension: string): boolean {
  return (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);
}

function soundAssetFromPath(root: string, path: string): LocalSoundAsset {
  const stat = statSync(/*turbopackIgnore: true*/ path);
  const extension = extname(path).toLowerCase();
  const fingerprint = createFingerprint(path, stat.size, stat.mtimeMs);
  const sidecar = readSidecar(path);
  const tags = inferTags(path, sidecar);
  const metadata = extractAudioMetadata(path, extension, stat.size);
  const sound: LocalSoundAsset = {
    id: fingerprint,
    path,
    root,
    relativePath: path.slice(root.length).replace(/^[/\\]/, ""),
    fileName: basename(path),
    extension,
    source: "imported",
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    fingerprint,
    metadata,
    sidecar,
    promptCandidate: "",
    tags,
    userMetadata: emptyUserMetadata(),
  };
  return { ...sound, promptCandidate: promptFromSound(sound) };
}

function normalizeSoundAsset(sound: LocalSoundAsset): LocalSoundAsset {
  return refreshPrompt({
    ...sound,
    userMetadata: normalizeUserMetadata(sound.userMetadata),
  });
}

function refreshPrompt(sound: LocalSoundAsset): LocalSoundAsset {
  return {
    ...sound,
    tags: Array.from(new Set(sound.tags)).slice(0, 16),
    userMetadata: normalizeUserMetadata(sound.userMetadata),
    promptCandidate: promptFromSound(sound),
  };
}

function mergeUserMetadata(current: LocalSoundUserMetadata, updates: LocalSoundUpdate): LocalSoundUserMetadata {
  const merged = normalizeUserMetadata({
    ...current,
    ...updates,
    tags: updates.tags ? normalizeTags(updates.tags) : current.tags,
    updatedAt: new Date().toISOString(),
  });
  return merged;
}

function normalizeUserMetadata(input: Partial<LocalSoundUserMetadata> | null | undefined): LocalSoundUserMetadata {
  return {
    favorite: input?.favorite === true,
    title: cleanOptional(input?.title),
    prompt: cleanOptional(input?.prompt),
    notes: cleanOptional(input?.notes),
    category: cleanOptional(input?.category),
    subcategory: cleanOptional(input?.subcategory),
    action: cleanOptional(input?.action),
    material: cleanOptional(input?.material),
    mood: cleanOptional(input?.mood),
    acousticSpace: cleanOptional(input?.acousticSpace),
    layerType: input?.layerType ?? null,
    frequencyRole: input?.frequencyRole ?? null,
    rating: typeof input?.rating === "number" && Number.isFinite(input.rating)
      ? Math.max(0, Math.min(5, input.rating))
      : null,
    tags: normalizeTags(input?.tags ?? []),
    updatedAt: cleanOptional(input?.updatedAt),
  };
}

function emptyUserMetadata(): LocalSoundUserMetadata {
  return normalizeUserMetadata({});
}

function allSoundTags(sound: LocalSoundAsset): string[] {
  return Array.from(new Set([...sound.tags, ...sound.userMetadata.tags])).slice(0, 32);
}

function userMetadataRecord(metadata: LocalSoundUserMetadata): Record<string, unknown> {
  return {
    title: metadata.title,
    prompt: metadata.prompt,
    notes: metadata.notes,
    category: metadata.category,
    subcategory: metadata.subcategory,
    action: metadata.action,
    material: metadata.material,
    mood: metadata.mood,
    acousticSpace: metadata.acousticSpace,
    layerType: metadata.layerType,
    frequencyRole: metadata.frequencyRole,
    rating: metadata.rating,
    tags: metadata.tags,
  };
}

function cleanOptional(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 2 && value.length <= 48)
  )).slice(0, 48);
}

function createFingerprint(path: string, size: number, mtimeMs: number): string {
  return createHash("sha1").update(`${path}:${size}:${mtimeMs}`).digest("hex");
}

function readSidecar(path: string): Record<string, unknown> | null {
  const base = path.slice(0, -extname(path).length);
  for (const extension of SUPPORTED_METADATA_EXTENSIONS) {
    const sidecarPath = `${base}${extension}`;
    if (!existsSync(/*turbopackIgnore: true*/ sidecarPath)) continue;

    try {
      const stat = statSync(/*turbopackIgnore: true*/ sidecarPath);
      if (stat.size > 1024 * 1024) continue;
      const raw = readFileSync(/*turbopackIgnore: true*/ sidecarPath, "utf8");
      const parsed = parseSidecar(sidecarPath, raw);
      if (parsed) return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function inferTags(path: string, sidecar: Record<string, unknown> | null): string[] {
  const tokens = basename(path, extname(path))
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && token.length <= 24);

  const sidecarTags = sidecar?.tags;
  const tags = Array.isArray(sidecarTags)
    ? sidecarTags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return Array.from(new Set([...tokens, ...tags])).slice(0, 16);
}

function parseSidecar(path: string, raw: string): Record<string, unknown> | null {
  const extension = extname(path).toLowerCase();
  if (extension === ".json") {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  }

  if (extension === ".txt" || extension === ".md" || extension === ".rpp") {
    const notes = raw.trim().slice(0, 8000);
    return notes ? { notes, source: basename(path) } : null;
  }

  if (extension === ".csv" || extension === ".tsv") {
    return parseDelimitedSidecar(path, raw, extension === ".tsv" ? "\t" : ",");
  }

  return null;
}

function parseDelimitedSidecar(path: string, raw: string, delimiter: string): Record<string, unknown> | null {
  const [headerLine, valueLine] = raw.split(/\r?\n/).filter(Boolean);
  if (!headerLine) return null;
  const headers = splitDelimitedLine(headerLine, delimiter);
  const values = splitDelimitedLine(valueLine ?? "", delimiter);
  const record: Record<string, unknown> = { source: basename(path) };
  headers.slice(0, 48).forEach((header, index) => {
    const key = header.trim();
    const value = values[index]?.trim();
    if (key && value) record[key] = value;
  });
  return Object.keys(record).length > 1 ? record : null;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function extractAudioMetadata(path: string, extension: string, sizeBytes: number): ExtractedAudioMetadata {
  if (extension === ".wav" || extension === ".wave") return extractWavMetadata(path, sizeBytes);
  if (extension === ".flac") return extractFlacMetadata(path);
  if (extension === ".aif" || extension === ".aiff") return extractAiffMetadata(path);
  return {
    durationSeconds: null,
    sampleRate: null,
    channels: null,
    bitDepth: null,
    codec: extension.replace(".", "").toUpperCase(),
  };
}

function readHeader(path: string, bytes: number): Buffer {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const read = readSync(fd, buffer, 0, bytes, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

function extractWavMetadata(path: string, sizeBytes: number): ExtractedAudioMetadata {
  const header = readHeader(path, Math.min(sizeBytes, 128 * 1024));
  if (header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") {
    return unknownAudio("WAV");
  }

  let offset = 12;
  let channels: number | null = null;
  let sampleRate: number | null = null;
  let bitDepth: number | null = null;
  let dataBytes: number | null = null;

  while (offset + 8 <= header.length) {
    const chunkId = header.toString("ascii", offset, offset + 4);
    const chunkSize = header.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === "fmt " && chunkStart + 16 <= header.length) {
      channels = header.readUInt16LE(chunkStart + 2);
      sampleRate = header.readUInt32LE(chunkStart + 4);
      bitDepth = header.readUInt16LE(chunkStart + 14);
    }
    if (chunkId === "data") {
      dataBytes = chunkSize;
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  const durationSeconds =
    dataBytes && sampleRate && channels && bitDepth
      ? dataBytes / (sampleRate * channels * (bitDepth / 8))
      : null;

  return { durationSeconds, sampleRate, channels, bitDepth, codec: "WAV" };
}

function extractFlacMetadata(path: string): ExtractedAudioMetadata {
  const header = readHeader(path, 64);
  if (header.toString("ascii", 0, 4) !== "fLaC") return unknownAudio("FLAC");
  if (header.length < 42) return unknownAudio("FLAC");

  const streamInfoStart = 8;
  const sampleBlock = header.readUInt32BE(streamInfoStart + 10);
  const sampleRate = sampleBlock >>> 12;
  const channels = ((sampleBlock >>> 9) & 0x7) + 1;
  const bitDepth = ((sampleBlock >>> 4) & 0x1f) + 1;
  const totalSamples = (sampleBlock & 0xf) * 2 ** 32 + header.readUInt32BE(streamInfoStart + 14);

  const durationSeconds = sampleRate > 0 ? Number(totalSamples) / sampleRate : null;
  return { durationSeconds, sampleRate, channels, bitDepth, codec: "FLAC" };
}

function extractAiffMetadata(path: string): ExtractedAudioMetadata {
  const header = readHeader(path, 128 * 1024);
  if (header.toString("ascii", 0, 4) !== "FORM") return unknownAudio("AIFF");
  const codec = header.toString("ascii", 8, 12);
  if (codec !== "AIFF" && codec !== "AIFC") return unknownAudio("AIFF");

  let offset = 12;
  while (offset + 8 <= header.length) {
    const chunkId = header.toString("ascii", offset, offset + 4);
    const chunkSize = header.readUInt32BE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "COMM" && chunkStart + 18 <= header.length) {
      const channels = header.readUInt16BE(chunkStart);
      const sampleFrames = header.readUInt32BE(chunkStart + 2);
      const bitDepth = header.readUInt16BE(chunkStart + 6);
      const sampleRate = readExtended80(header.subarray(chunkStart + 8, chunkStart + 18));
      return {
        durationSeconds: sampleRate ? sampleFrames / sampleRate : null,
        sampleRate,
        channels,
        bitDepth,
        codec,
      };
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  return unknownAudio(codec);
}

function readExtended80(bytes: Buffer): number | null {
  if (bytes.length < 10) return null;
  const exponent = ((bytes[0] & 0x7f) << 8) | bytes[1];
  if (exponent === 0) return null;
  const hiMantissa = bytes.readUInt32BE(2);
  const loMantissa = bytes.readUInt32BE(6);
  const mantissa = hiMantissa * 2 ** 32 + loMantissa;
  const value = mantissa * 2 ** (exponent - 16383 - 63);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function unknownAudio(codec: string): ExtractedAudioMetadata {
  return {
    durationSeconds: null,
    sampleRate: null,
    channels: null,
    bitDepth: null,
    codec,
  };
}
