import {
  type FrequencyRoleId,
  type StackerLayerType,
} from "./stacker-taxonomy";

export interface TechnicalAudioMetadata {
  durationSeconds?: number | null;
  sampleRate?: number | null;
  channels?: number | null;
  bitDepth?: number | null;
  codec?: string | null;
}

export interface MetadataPromptInput {
  fileName?: string;
  relativePath?: string;
  tags?: string[];
  sidecar?: Record<string, unknown> | null;
  audio?: TechnicalAudioMetadata | null;
  source?: "imported" | "generated" | "rendered" | "external";
  prompt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PromptMetadata {
  category?: string;
  subcategory?: string;
  sourceObject?: string;
  action?: string;
  material?: string;
  surface?: string;
  environment?: string;
  acousticSpace?: string;
  perspective?: string;
  mood?: string;
  layerType?: StackerLayerType;
  frequencyRole?: FrequencyRoleId;
  durationSeconds?: number;
  loop?: boolean;
  exclusions?: string[];
  tags: string[];
}

export interface MetadataToPromptResult {
  prompt: string;
  metadata: PromptMetadata;
  parts: string[];
}

export interface PromptToMetadataResult {
  metadata: PromptMetadata;
  tags: string[];
  confidence: number;
}

const STOP_WORDS = new Set([
  "and", "for", "from", "into", "onto", "over", "under", "with", "without",
  "sound", "sounds", "audio", "effect", "effects", "layer", "very", "short",
  "long", "the", "this", "that", "there", "their", "clean",
]);

const CATEGORY_RULES: Array<{
  category: string;
  subcategory?: string;
  layerType: StackerLayerType;
  frequencyRole: FrequencyRoleId;
  keywords: string[];
}> = [
  { category: "UI", layerType: "transient", frequencyRole: "transient_click", keywords: ["ui", "button", "click", "toggle", "menu", "notification", "interface"] },
  { category: "Foley", subcategory: "Footstep", layerType: "texture", frequencyRole: "mid_detail", keywords: ["footstep", "footsteps", "step", "steps", "walk", "boot", "shoe", "stomp"] },
  { category: "Door", layerType: "mechanical", frequencyRole: "low_mid", keywords: ["door", "gate", "hatch", "lock", "latch", "handle", "hinge"] },
  { category: "Impact", layerType: "impact", frequencyRole: "low_mid", keywords: ["impact", "hit", "slam", "crash", "punch", "collision", "thud"] },
  { category: "Machine", layerType: "mechanical", frequencyRole: "upper_mid", keywords: ["machine", "motor", "engine", "servo", "gear", "hydraulic", "mechanical"] },
  { category: "Vehicle", layerType: "mechanical", frequencyRole: "low_body", keywords: ["vehicle", "car", "truck", "motorcycle", "engine", "drive", "brake"] },
  { category: "Water", layerType: "texture", frequencyRole: "high_texture", keywords: ["water", "splash", "drip", "rain", "wave", "pour", "submerge"] },
  { category: "Atmosphere", layerType: "space", frequencyRole: "wide", keywords: ["ambience", "ambient", "atmosphere", "roomtone", "room", "wind", "forest", "city"] },
  { category: "Creature", layerType: "vocal_layer", frequencyRole: "mid_detail", keywords: ["creature", "monster", "growl", "roar", "breath", "hiss", "vocal"] },
  { category: "Weapon", layerType: "impact", frequencyRole: "transient_click", keywords: ["weapon", "gun", "shot", "bullet", "sword", "blade", "arrow"] },
  { category: "Whoosh", layerType: "movement", frequencyRole: "wide", keywords: ["whoosh", "swoosh", "passby", "flyby", "swish", "movement"] },
  { category: "Sci-Fi", layerType: "sweetener", frequencyRole: "air", keywords: ["scifi", "sci", "laser", "plasma", "energy", "portal", "magic"] },
];

const MATERIAL_RULES: Record<string, string[]> = {
  metal: ["metal", "steel", "iron", "aluminum", "chain", "cage"],
  wood: ["wood", "wooden", "plank", "branch"],
  glass: ["glass", "crystal", "shard"],
  stone: ["stone", "rock", "concrete", "gravel"],
  cloth: ["cloth", "fabric", "leather", "paper"],
  organic: ["organic", "flesh", "bone", "wet", "mud", "slime"],
  plastic: ["plastic", "rubber", "vinyl"],
};

const ACTION_RULES: Record<string, string[]> = {
  impact: ["impact", "hit", "slam", "crash", "drop", "fall", "punch", "collide"],
  movement: ["move", "movement", "slide", "drag", "scrape", "roll", "whoosh", "flyby"],
  open: ["open", "unlock", "release"],
  close: ["close", "shut", "lock", "latch"],
  loop: ["loop", "loopable", "seamless", "bed", "drone", "ambience"],
  vocalize: ["growl", "roar", "hiss", "breath", "whisper", "voice"],
  click: ["click", "tap", "toggle", "select", "press"],
};

const SPACE_RULES: Record<string, string[]> = {
  interior: ["interior", "room", "hall", "warehouse", "bathroom", "kitchen"],
  exterior: ["exterior", "outside", "street", "forest", "field", "city"],
  tight: ["dry", "close", "small", "tight", "booth"],
  large: ["large", "wide", "cavern", "hangar", "cathedral", "reverb"],
};

const MOOD_RULES: Record<string, string[]> = {
  tense: ["tense", "dark", "threat", "ominous", "horror", "danger"],
  playful: ["playful", "cute", "soft", "cartoon", "friendly"],
  futuristic: ["futuristic", "sci", "digital", "synthetic", "neon"],
  natural: ["natural", "organic", "realistic", "earthy"],
};

export function metadataToPrompt(input: MetadataPromptInput): MetadataToPromptResult {
  const fileStem = input.fileName ? normalizePhrase(stripExtension(input.fileName)) : "";
  const pathTags = pathTokens(input.relativePath);
  const sidecarText = extractPreferredMetadataText(input.sidecar);
  const extraMetadataText = extractPreferredMetadataText(input.metadata);
  const suppliedPrompt = cleanSentence(input.prompt ?? "");

  const parts = [
    suppliedPrompt ? `Existing prompt: ${suppliedPrompt}.` : null,
    fileStem ? `Filename suggests: ${fileStem}.` : null,
    pathTags.length ? `Folder taxonomy: ${pathTags.join(", ")}.` : null,
    input.tags?.length ? `Tags: ${dedupe(input.tags).join(", ")}.` : null,
    sidecarText ? `Sidecar metadata: ${sidecarText}.` : null,
    extraMetadataText ? `Catalog metadata: ${extraMetadataText}.` : null,
    technicalDescription(input.audio),
  ].filter((part): part is string => Boolean(part));

  const combined = parts.join(" ");
  const inferred = promptToMetadata(combined);
  const promptParts = [
    inferred.metadata.category ? `${inferred.metadata.category} sound` : "Sound effect",
    inferred.metadata.action ? `with ${inferred.metadata.action}` : null,
    inferred.metadata.material ? `on ${inferred.metadata.material}` : null,
    inferred.metadata.acousticSpace ? `in a ${inferred.metadata.acousticSpace} space` : null,
    inferred.metadata.mood ? `${inferred.metadata.mood} tone` : null,
    inferred.metadata.layerType ? `${inferred.metadata.layerType.replace(/_/g, " ")} layer` : null,
  ].filter(Boolean);

  const prompt = [
    promptParts.join(", "),
    technicalDescription(input.audio),
    input.tags?.length ? `Use tags as constraints: ${dedupe(input.tags).join(", ")}.` : null,
    sidecarText ? `Respect source notes: ${sidecarText}.` : null,
    "Use this as a reference for generating, tagging, comparing, browsing, or stacking related sounds.",
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  return {
    prompt,
    metadata: {
      ...inferred.metadata,
      durationSeconds: inferred.metadata.durationSeconds ?? normalizeDuration(input.audio?.durationSeconds),
      tags: dedupe([...(input.tags ?? []), ...pathTags, ...inferred.tags]).slice(0, 24),
    },
    parts,
  };
}

export function promptToMetadata(prompt: string): PromptToMetadataResult {
  const cleaned = cleanSentence(prompt);
  const lower = cleaned.toLowerCase();
  const tags = extractTags(cleaned);
  const categoryRule = CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword)));
  const material = firstRuleMatch(lower, MATERIAL_RULES);
  const action = firstRuleMatch(lower, ACTION_RULES);
  const acousticSpace = firstRuleMatch(lower, SPACE_RULES);
  const mood = firstRuleMatch(lower, MOOD_RULES);
  const durationSeconds = inferDurationSeconds(lower);
  const loop = /\b(loop|loopable|seamless|bed|drone|ambience|atmosphere)\b/.test(lower);
  const exclusions = extractExclusions(cleaned);

  const metadata: PromptMetadata = {
    category: categoryRule?.category,
    subcategory: categoryRule?.subcategory,
    sourceObject: inferSourceObject(tags, categoryRule?.category),
    action,
    material,
    acousticSpace,
    mood,
    layerType: inferLayerType(lower, categoryRule?.layerType),
    frequencyRole: inferFrequencyRole(lower, categoryRule?.frequencyRole),
    durationSeconds,
    loop,
    exclusions,
    tags,
  };

  const filled = Object.values(metadata).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== false;
  }).length;

  return {
    metadata,
    tags,
    confidence: Math.min(1, filled / 9),
  };
}

export function extractPromptSearchText(input: MetadataPromptInput): string {
  return [
    input.fileName,
    input.relativePath,
    input.prompt,
    input.tags?.join(" "),
    extractPreferredMetadataText(input.sidecar),
    extractPreferredMetadataText(input.metadata),
  ].filter(Boolean).join(" ").toLowerCase();
}

export function tokenizePrompt(text: string): string[] {
  return dedupe(
    text
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && token.length <= 28 && !STOP_WORDS.has(token))
  );
}

function inferLayerType(text: string, fallback?: StackerLayerType): StackerLayerType {
  if (/\b(transient|click|snap|tap|onset|attack)\b/.test(text)) return "transient";
  if (/\b(sub|rumble|bass|low frequency|low-frequency)\b/.test(text)) return "sub_layer";
  if (/\b(mechanical|servo|gear|machine|motor|hydraulic)\b/.test(text)) return "mechanical";
  if (/\b(impact|hit|slam|crash|thud)\b/.test(text)) return "impact";
  if (/\b(texture|grain|surface|scrape|friction|cloth|paper)\b/.test(text)) return "texture";
  if (/\b(whoosh|movement|motion|slide|drag|passby|flyby)\b/.test(text)) return "movement";
  if (/\b(creature|voice|vocal|growl|breath|roar|hiss)\b/.test(text)) return "vocal_layer";
  if (/\b(organic|flesh|wet|bone|slime)\b/.test(text)) return "organic";
  if (/\b(sparkle|sweetener|accent|magic|laser|energy)\b/.test(text)) return "sweetener";
  if (/\b(room|space|ambience|atmosphere|reverb|tail|decay)\b/.test(text)) return "space";
  return fallback ?? "body";
}

function inferFrequencyRole(text: string, fallback?: FrequencyRoleId): FrequencyRoleId {
  if (/\b(sub|rumble|bass|20|40|60hz|low frequency|low-frequency)\b/.test(text)) return "sub";
  if (/\b(low body|body|weight|heavy|warm)\b/.test(text)) return "low_body";
  if (/\b(low-mid|low mid|thick|full)\b/.test(text)) return "low_mid";
  if (/\b(upper-mid|upper mid|bite|cutting|articulation)\b/.test(text)) return "upper_mid";
  if (/\b(mid|detail|present|defined|clear)\b/.test(text)) return "mid_detail";
  if (/\b(high texture|crisp|scratch|fine|friction)\b/.test(text)) return "high_texture";
  if (/\b(air|sparkle|shimmer|breath|airy)\b/.test(text)) return "air";
  if (/\b(noise|hiss|static|broadband|granular)\b/.test(text)) return "noise";
  if (/\b(transient|click|snap|tap|attack|onset)\b/.test(text)) return "transient_click";
  return fallback ?? "wide";
}

function firstRuleMatch(text: string, rules: Record<string, string[]>): string | undefined {
  for (const [value, keywords] of Object.entries(rules)) {
    if (keywords.some((keyword) => text.includes(keyword))) return value;
  }
  return undefined;
}

function inferSourceObject(tags: string[], category?: string): string | undefined {
  const tag = tags.find((value) => !STOP_WORDS.has(value));
  if (!tag && !category) return undefined;
  return [category, tag].filter(Boolean).join(" ").toLowerCase();
}

function inferDurationSeconds(text: string): number | undefined {
  const explicit = text.match(/\b(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)\b/);
  if (explicit) return clampDuration(Number(explicit[1]));
  if (/\b(instant|click|tap|snap|short|transient)\b/.test(text)) return 1;
  if (/\b(loop|bed|ambience|atmosphere|drone|extended)\b/.test(text)) return 8;
  return undefined;
}

function extractExclusions(text: string): string[] {
  const matches = text.match(/\bno\s+[a-z0-9 -]{3,32}/gi) ?? [];
  return dedupe(matches.map((match) => match.trim().replace(/[.,;:]$/, ""))).slice(0, 8);
}

function extractTags(text: string): string[] {
  return tokenizePrompt(text).slice(0, 24);
}

function extractPreferredMetadataText(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const preferred = [
    "description", "prompt", "notes", "category", "subcategory", "source",
    "tags", "keywords", "material", "action", "location", "space", "mood",
  ];
  const parts: string[] = [];
  for (const key of preferred) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) parts.push(`${key}: ${value.trim()}`);
    if (Array.isArray(value)) {
      const items = value.filter((item): item is string => typeof item === "string").join(", ");
      if (items) parts.push(`${key}: ${items}`);
    }
  }
  return parts.join("; ") || null;
}

function technicalDescription(audio: TechnicalAudioMetadata | null | undefined): string | null {
  if (!audio) return null;
  const details = [
    normalizeDuration(audio.durationSeconds) ? `${normalizeDuration(audio.durationSeconds)} second` : null,
    audio.channels ? `${audio.channels} channel` : null,
    audio.sampleRate ? `${audio.sampleRate} Hz` : null,
    audio.bitDepth ? `${audio.bitDepth} bit` : null,
    audio.codec,
  ].filter(Boolean);
  return details.length ? `Technical metadata: ${details.join(", ")}.` : null;
}

function normalizeDuration(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100) / 100;
}

function clampDuration(value: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0.5, Math.min(30, Math.round(value * 100) / 100));
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]{2,5}$/i, "");
}

function normalizePhrase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function pathTokens(relativePath: string | undefined): string[] {
  if (!relativePath) return [];
  const segments = relativePath.split(/[\\/]/).slice(0, -1);
  return dedupe(
    segments
      .flatMap((segment) => normalizePhrase(segment).split(/\s+/))
      .map((segment) => segment.toLowerCase())
      .filter((segment) => segment.length >= 3 && !STOP_WORDS.has(segment))
  ).slice(0, 12);
}

function cleanSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}
