import "server-only";

import { basename } from "node:path";
import {
  createLocalSoundAudioUrl,
  promptFromSound,
  readLocalSoundLibrary,
  type LocalSoundAsset,
} from "@/lib/local/sound-library";
import {
  listGenerations,
  type GenerationRow,
} from "@/lib/local/repositories/generations";
import {
  metadataToPrompt,
  promptToMetadata,
  tokenizePrompt,
  type PromptMetadata,
  type TechnicalAudioMetadata,
} from "@/lib/sfx/metadata-prompt";
import {
  type FrequencyRoleId,
  type StackerLayerType,
} from "@/lib/sfx/stacker-taxonomy";

export type UnifiedSoundSource = "imported" | "generated";

export interface UnifiedSoundAsset {
  id: string;
  sourceId: string;
  source: UnifiedSoundSource;
  title: string;
  fileName: string;
  audioUrl: string | null;
  prompt: string;
  promptCandidate: string;
  tags: string[];
  metadata: PromptMetadata;
  technical: TechnicalAudioMetadata;
  provenance: {
    root?: string;
    absolutePath?: string;
    relativePath?: string;
    storagePath?: string | null;
    generationId?: string;
    requestId?: string | null;
    modelId?: string | null;
    apiRoute?: string;
    createdAt?: string;
    modifiedAt?: string;
  };
  stack: {
    suggestedLayerType: StackerLayerType;
    suggestedFrequencyRole: FrequencyRoleId;
    compatibleLayerTypes: StackerLayerType[];
    formulaHints: string[];
  };
}

export interface SoundAssetSearchOptions {
  q?: string;
  source?: UnifiedSoundSource | "all";
  limit?: number;
}

export interface StackLayerAssetQuery {
  id?: string;
  layerType?: StackerLayerType;
  frequencyRole?: FrequencyRoleId;
  promptText?: string;
  durationSeconds?: number;
}

export interface SoundAssetRecommendation {
  layerId: string | null;
  layerType: StackerLayerType;
  frequencyRole: FrequencyRoleId;
  query: string;
  matches: Array<{
    asset: UnifiedSoundAsset;
    score: number;
    reasons: string[];
    formula: string;
  }>;
}

export interface StackFormulaSuggestion {
  id: string;
  label: string;
  description: string;
  steps: string[];
}

type NormalizedLayerAssetQuery = StackLayerAssetQuery & {
  layerType: StackerLayerType;
  frequencyRole: FrequencyRoleId;
};

export async function searchSoundAssets(
  userId: string,
  options: SoundAssetSearchOptions = {},
): Promise<UnifiedSoundAsset[]> {
  const limit = clampLimit(options.limit, 50, 250);
  const source = options.source ?? "all";
  const queryTokens = tokenizePrompt(options.q ?? "");
  const assets = await listUnifiedSoundAssets(userId, source);

  const ranked = assets
    .map((asset, index) => ({
      asset,
      index,
      score: queryTokens.length ? scoreAssetSearch(asset, queryTokens) : 1,
    }))
    .filter((item) => !queryTokens.length || item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return ranked.slice(0, limit).map((item) => item.asset);
}

export async function recommendSoundAssetsForLayers(
  userId: string,
  input: {
    cueDescription?: string;
    layers?: StackLayerAssetQuery[];
    limit?: number;
  },
): Promise<{
  recommendations: SoundAssetRecommendation[];
  formulas: StackFormulaSuggestion[];
}> {
  const limit = clampLimit(input.limit, 4, 12);
  const assets = await searchSoundAssets(userId, {
    q: input.cueDescription,
    source: "all",
    limit: 250,
  });
  const layers = normalizeLayerQueries(input.layers, input.cueDescription);

  const recommendations = layers.map((layer) => {
    const query = [input.cueDescription, layer.promptText].filter(Boolean).join(" ");
    const queryTokens = tokenizePrompt(query);
    const matches = assets
      .map((asset) => scoreAssetForLayer(asset, layer, queryTokens))
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    return {
      layerId: layer.id ?? null,
      layerType: layer.layerType ?? "body",
      frequencyRole: layer.frequencyRole ?? "wide",
      query,
      matches,
    };
  });

  return {
    recommendations,
    formulas: buildFormulaSuggestions(recommendations),
  };
}

export async function getUnifiedSoundAsset(
  userId: string,
  assetId: string,
): Promise<UnifiedSoundAsset | null> {
  const [source, sourceId] = splitUnifiedId(assetId);
  const assets = await listUnifiedSoundAssets(userId, source ?? "all");
  return assets.find((asset) => asset.id === assetId || asset.sourceId === sourceId) ?? null;
}

async function listUnifiedSoundAssets(
  userId: string,
  source: UnifiedSoundSource | "all",
): Promise<UnifiedSoundAsset[]> {
  const imported = source === "generated"
    ? []
    : readLocalSoundLibrary().sounds.map(localSoundToAsset);

  const generated = source === "imported"
    ? []
    : await listGeneratedSoundAssets(userId);

  return [...imported, ...generated];
}

async function listGeneratedSoundAssets(userId: string): Promise<UnifiedSoundAsset[]> {
  const { rows } = await listGenerations(userId, { limit: 100 });
  return rows
    .filter((row) => row.status === "succeeded")
    .map(generationToAsset);
}

function localSoundToAsset(sound: LocalSoundAsset): UnifiedSoundAsset {
  const promptCandidate = promptFromSound(sound);
  const inferred = metadataToPrompt({
    fileName: sound.userMetadata.title ?? sound.fileName,
    relativePath: sound.relativePath,
    tags: [...sound.tags, ...sound.userMetadata.tags],
    sidecar: sound.sidecar,
    audio: sound.metadata,
    metadata: sound.userMetadata as unknown as Record<string, unknown>,
    source: "imported",
  });
  const metadata = mergeMetadata(inferred.metadata, promptToMetadata(promptCandidate).metadata);
  const suggestedLayerType = metadata.layerType ?? "body";
  const suggestedFrequencyRole = metadata.frequencyRole ?? "wide";

  return {
    id: `local:${sound.id}`,
    sourceId: sound.id,
    source: "imported",
    title: sound.userMetadata.title ?? sound.fileName,
    fileName: sound.fileName,
    audioUrl: createLocalSoundAudioUrl(sound.id),
    prompt: promptCandidate,
    promptCandidate,
    tags: Array.from(new Set([...metadata.tags, ...sound.userMetadata.tags])),
    metadata,
    technical: sound.metadata,
    provenance: {
      root: sound.root,
      absolutePath: sound.path,
      relativePath: sound.relativePath,
      modifiedAt: sound.modifiedAt,
    },
    stack: {
      suggestedLayerType,
      suggestedFrequencyRole,
      compatibleLayerTypes: compatibleLayerTypes(suggestedLayerType),
      formulaHints: formulaHints("imported", suggestedLayerType),
    },
  };
}

function generationToAsset(row: GenerationRow): UnifiedSoundAsset {
  const requestPayload = row.request_payload ?? {};
  const rawPrompt = String(requestPayload.text ?? "");
  const fileName = row.audio_storage_path ? basename(row.audio_storage_path) : `${row.id}.${row.output_format ?? "mp3"}`;
  const inferred = metadataToPrompt({
    fileName,
    prompt: rawPrompt,
    metadata: row.metadata,
    audio: {
      durationSeconds: row.duration_seconds,
      codec: row.output_format,
    },
    source: "generated",
  });
  const promptMetadata = promptToMetadata(rawPrompt).metadata;
  const metadata = mergeMetadata(inferred.metadata, promptMetadata);
  const suggestedLayerType = metadata.layerType ?? "body";
  const suggestedFrequencyRole = metadata.frequencyRole ?? "wide";

  return {
    id: `generation:${row.id}`,
    sourceId: row.id,
    source: "generated",
    title: titleFromPrompt(rawPrompt, fileName),
    fileName,
    audioUrl: row.audio_signed_url,
    prompt: rawPrompt,
    promptCandidate: inferred.prompt,
    tags: metadata.tags,
    metadata,
    technical: {
      durationSeconds: row.duration_seconds,
      codec: row.output_format,
    },
    provenance: {
      storagePath: row.audio_storage_path,
      generationId: row.id,
      requestId: row.request_id,
      modelId: row.elevenlabs_model_id,
      apiRoute: row.api_route,
      createdAt: row.created_at,
    },
    stack: {
      suggestedLayerType,
      suggestedFrequencyRole,
      compatibleLayerTypes: compatibleLayerTypes(suggestedLayerType),
      formulaHints: formulaHints("generated", suggestedLayerType),
    },
  };
}

function scoreAssetSearch(asset: UnifiedSoundAsset, queryTokens: string[]): number {
  const searchTokens = new Set(tokenizePrompt(assetSearchText(asset)));
  return queryTokens.reduce((score, token) => {
    if (searchTokens.has(token)) return score + 5;
    for (const indexed of searchTokens) {
      if (indexed.includes(token) || token.includes(indexed)) return score + 2;
    }
    return score;
  }, 0);
}

function scoreAssetForLayer(
  asset: UnifiedSoundAsset,
  layer: StackLayerAssetQuery,
  queryTokens: string[],
): {
  asset: UnifiedSoundAsset;
  score: number;
  reasons: string[];
  formula: string;
} {
  let score = scoreAssetSearch(asset, queryTokens);
  const reasons: string[] = [];

  if (layer.layerType && asset.stack.compatibleLayerTypes.includes(layer.layerType)) {
    score += 18;
    reasons.push(`fits ${layer.layerType.replace(/_/g, " ")} layer role`);
  }
  if (layer.frequencyRole && asset.stack.suggestedFrequencyRole === layer.frequencyRole) {
    score += 10;
    reasons.push(`matches ${layer.frequencyRole.replace(/_/g, " ")} frequency role`);
  }
  if (asset.source === "imported") {
    score += 4;
    reasons.push("uses indexed local material");
  }
  if (asset.source === "generated") {
    score += 3;
    reasons.push("reuses generated provenance");
  }

  const durationScore = durationCompatibility(asset.technical.durationSeconds, layer.durationSeconds);
  if (durationScore > 0) {
    score += durationScore;
    reasons.push("duration is close to the layer target");
  }

  return {
    asset,
    score,
    reasons: reasons.slice(0, 4),
    formula: formulaForMatch(asset, layer),
  };
}

function normalizeLayerQueries(
  layers: StackLayerAssetQuery[] | undefined,
  cueDescription: string | undefined,
): NormalizedLayerAssetQuery[] {
  if (layers?.length) {
    return layers.map((layer) => {
      const inferred = promptToMetadata(layer.promptText ?? cueDescription ?? "").metadata;
      return {
        ...layer,
        layerType: layer.layerType ?? inferred.layerType ?? "body",
        frequencyRole: layer.frequencyRole ?? inferred.frequencyRole ?? "wide",
      };
    });
  }

  const metadata = promptToMetadata(cueDescription ?? "").metadata;
  return [{
    id: "cue",
    layerType: metadata.layerType ?? "body",
    frequencyRole: metadata.frequencyRole ?? "wide",
    promptText: cueDescription ?? "",
    durationSeconds: metadata.durationSeconds,
  }];
}

function buildFormulaSuggestions(recommendations: SoundAssetRecommendation[]): StackFormulaSuggestion[] {
  const importedCount = recommendations.flatMap((r) => r.matches).filter((m) => m.asset.source === "imported").length;
  const generatedCount = recommendations.flatMap((r) => r.matches).filter((m) => m.asset.source === "generated").length;
  const steps = recommendations
    .filter((recommendation) => recommendation.matches[0])
    .map((recommendation) => {
      const match = recommendation.matches[0];
      return `${recommendation.layerType.replace(/_/g, " ")}: ${match.asset.title} (${match.asset.source})`;
    });

  return [
    {
      id: "hybrid-stack",
      label: "Hybrid layer formula",
      description: importedCount && generatedCount
        ? "Combine local library texture with generated layers that already match the prompt vocabulary."
        : "Use the best indexed matches as fixed layers, then generate only the missing layer roles.",
      steps,
    },
    {
      id: "metadata-training-loop",
      label: "Metadata training loop",
      description: "Convert selected file metadata into layer prompts, generate missing variants, then store the generated prompt back as catalog metadata.",
      steps: [
        "metadata-to-prompt from selected local files",
        "prompt-to-metadata on generated variants",
        "reuse tags and layer roles for future recommendations",
      ],
    },
  ];
}

function mergeMetadata(primary: PromptMetadata, secondary: PromptMetadata): PromptMetadata {
  const merged: PromptMetadata = {
    ...definedMetadata(secondary),
    ...definedMetadata(primary),
    tags: dedupe([...(primary.tags ?? []), ...(secondary.tags ?? [])]).slice(0, 24),
    exclusions: dedupe([...(primary.exclusions ?? []), ...(secondary.exclusions ?? [])]).slice(0, 12),
  };
  return merged;
}

function definedMetadata(metadata: PromptMetadata): Partial<PromptMetadata> {
  const result: Partial<PromptMetadata> = {};
  for (const [key, value] of Object.entries(metadata) as Array<[keyof PromptMetadata, PromptMetadata[keyof PromptMetadata]]>) {
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value as never;
      continue;
    }
    if (value !== undefined && value !== false) result[key] = value as never;
  }
  return result;
}

function compatibleLayerTypes(layerType: StackerLayerType): StackerLayerType[] {
  switch (layerType) {
    case "transient":
      return ["transient", "impact", "sweetener"];
    case "texture":
      return ["texture", "movement", "organic", "mechanical"];
    case "space":
      return ["space", "tail"];
    case "mechanical":
      return ["mechanical", "body", "texture"];
    case "vocal_layer":
      return ["vocal_layer", "organic", "texture"];
    case "sub_layer":
      return ["sub_layer", "body", "impact"];
    case "impact":
      return ["impact", "transient", "body"];
    default:
      return [layerType, "body"];
  }
}

function formulaHints(source: UnifiedSoundSource, layerType: StackerLayerType): string[] {
  const sourceHint = source === "imported"
    ? "Use as grounded reference material or a fixed stack layer."
    : "Use as reusable generated material with prompt provenance.";
  return [
    sourceHint,
    `Best first role: ${layerType.replace(/_/g, " ")}.`,
    "Pair with contrasting frequency roles to avoid masking.",
  ];
}

function formulaForMatch(asset: UnifiedSoundAsset, layer: StackLayerAssetQuery): string {
  const role = layer.layerType ?? asset.stack.suggestedLayerType;
  const frequency = layer.frequencyRole ?? asset.stack.suggestedFrequencyRole;
  return [
    `Use ${asset.title} as the ${role.replace(/_/g, " ")} layer.`,
    `Keep it focused on ${frequency.replace(/_/g, " ")} so it does not mask adjacent layers.`,
    asset.source === "imported"
      ? "Generate only missing accents around this local file."
      : "Use its prompt metadata to find or create local-library companions.",
  ].join(" ");
}

function durationCompatibility(assetDuration: number | null | undefined, targetDuration: number | null | undefined): number {
  if (!assetDuration || !targetDuration) return 0;
  const delta = Math.abs(assetDuration - targetDuration);
  if (delta <= 0.5) return 8;
  if (delta <= 1.5) return 5;
  if (delta <= 3) return 2;
  return 0;
}

function titleFromPrompt(prompt: string, fallback: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 64 ? `${clean.slice(0, 61).trim()}...` : clean;
}

function assetSearchText(asset: UnifiedSoundAsset): string {
  return [
    asset.title,
    asset.fileName,
    asset.prompt,
    asset.promptCandidate,
    asset.tags.join(" "),
    asset.metadata.category,
    asset.metadata.subcategory,
    asset.metadata.action,
    asset.metadata.material,
    asset.metadata.acousticSpace,
    asset.provenance.relativePath,
    asset.provenance.storagePath,
  ].filter(Boolean).join(" ");
}

function splitUnifiedId(assetId: string): [UnifiedSoundSource | null, string] {
  if (assetId.startsWith("local:")) return ["imported", assetId.slice("local:".length)];
  if (assetId.startsWith("generation:")) return ["generated", assetId.slice("generation:".length)];
  return [null, assetId];
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
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
