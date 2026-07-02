/**
 * Algophony Studio — ElevenLabs Models Client
 *
 * Server-only. Fetches and caches model metadata from GET /v1/models.
 */

import "server-only";

import { z } from "zod";
import type { ZodSafeParseSuccess } from "zod";
import {
  ELEVENLABS_BASE,
  requireApiKey,
  fetchWithRetry,
  type ElevenLabsError,
} from "./headers";
import { createServiceLocalClient } from "@/lib/local/db-client";

const modelSchema = z.object({
  model_id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  can_do_text_to_speech: z.boolean().optional().default(false),
  can_do_voice_conversion: z.boolean().optional().default(false),
  can_be_finetuned: z.boolean().optional().default(false),
  can_use_style: z.boolean().optional().default(false),
  can_use_speaker_boost: z.boolean().optional().default(false),
  token_cost_factor: z.number().optional(),
  model_rates: z.record(z.string(), z.unknown()).optional().default({}),
  languages: z.array(z.unknown()).optional().default([]),
  max_characters_request_free_user: z.number().optional(),
  max_characters_request_subscribed_user: z.number().optional(),
  concurrency_limit: z.number().optional(),
});

export interface ModelInfo {
  modelId: string;
  name: string;
  description: string;
  canDoTextToSpeech: boolean;
  canDoVoiceConversion: boolean;
  canDoSoundEffects: boolean;
  canBeFinetuned: boolean;
  canUseStyle: boolean;
  canUseSpeakerBoost: boolean;
  tokenCostFactor: number | null;
  maxInputLength: number | null;
  concurrencyLimit: number | null;
  languageCount: number;
}

/** Staleness threshold: 1 hour */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Fetch models from cache, refreshing from ElevenLabs if stale or empty.
 */
export async function getModels(
  forceRefresh = false
): Promise<ModelInfo[]> {
  const database = createServiceLocalClient();

  if (!forceRefresh) {
    const { data: cached } = await database
      .from("elevenlabs_models_cache")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(50);

    if (cached && cached.length > 0) {
      const newest = new Date(cached[0].fetched_at).getTime();
      if (Date.now() - newest < CACHE_TTL_MS) {
        return cached.map(normalizeRow);
      }
    }
  }

  // Fetch from ElevenLabs
  return refreshModelsCache();
}

/**
 * Refresh model cache from ElevenLabs API.
 */
export async function refreshModelsCache(): Promise<ModelInfo[]> {
  if (process.env.MOCK_ELEVENLABS === "true") {
    return getMockModels();
  }

  const apiKey = requireApiKey();

  const response = await fetchWithRetry(`${ELEVENLABS_BASE}/v1/models`, {
    method: "GET",
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Unknown error");
    const error: ElevenLabsError = {
      success: false,
      statusCode: response.status,
      errorType: "server",
      message,
    };
    throw error;
  }

  const body = await response.json();
  const models = Array.isArray(body) ? body : [];

  const database = createServiceLocalClient();

  for (const raw of models) {
    const parsed = modelSchema.safeParse(raw);
    if (!parsed.success) continue;

    const m = parsed.data;
    await database.from("elevenlabs_models_cache").upsert(
      {
        model_id: m.model_id,
        name: m.name ?? null,
        can_do_text_to_speech: m.can_do_text_to_speech ?? false,
        can_do_voice_conversion: m.can_do_voice_conversion ?? false,
        can_use_style: m.can_use_style ?? false,
        can_use_speaker_boost: m.can_use_speaker_boost ?? false,
        token_cost_factor: m.token_cost_factor ?? null,
        model_rates: m.model_rates ?? {},
        languages: m.languages ?? [],
        raw,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "model_id" }
    );
  }

  return models
    .map((r: unknown) => modelSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => normalizeModel((r as ZodSafeParseSuccess<z.infer<typeof modelSchema>>).data));
}

function normalizeRow(row: Record<string, unknown>): ModelInfo {
  const modelId = row.model_id as string;
  return {
    modelId,
    name: (row.name as string) ?? "",
    description: (row.description as string) ?? "",
    canDoTextToSpeech: (row.can_do_text_to_speech as boolean) ?? false,
    canDoVoiceConversion: (row.can_do_voice_conversion as boolean) ?? false,
    canDoSoundEffects: detectSoundEffectsCapability(modelId),
    canBeFinetuned: (row.can_be_finetuned as boolean) ?? false,
    canUseStyle: (row.can_use_style as boolean) ?? false,
    canUseSpeakerBoost: (row.can_use_speaker_boost as boolean) ?? false,
    tokenCostFactor: (row.token_cost_factor as number) ?? null,
    maxInputLength: (row.max_characters_request_subscribed_user as number) ?? null,
    concurrencyLimit: (row.concurrency_limit as number) ?? null,
    languageCount: Array.isArray(row.languages) ? row.languages.length : 0,
  };
}

function normalizeModel(m: z.infer<typeof modelSchema>): ModelInfo {
  return {
    modelId: m.model_id,
    name: m.name ?? "",
    description: m.description ?? "",
    canDoTextToSpeech: m.can_do_text_to_speech ?? false,
    canDoVoiceConversion: m.can_do_voice_conversion ?? false,
    canDoSoundEffects: detectSoundEffectsCapability(m.model_id),
    canBeFinetuned: m.can_be_finetuned ?? false,
    canUseStyle: m.can_use_style ?? false,
    canUseSpeakerBoost: m.can_use_speaker_boost ?? false,
    tokenCostFactor: m.token_cost_factor ?? null,
    maxInputLength: m.max_characters_request_subscribed_user ?? null,
    concurrencyLimit: m.concurrency_limit ?? null,
    languageCount: m.languages?.length ?? 0,
  };
}

/** Detect SFX capability from model ID (no dedicated API field exists) */
function detectSoundEffectsCapability(modelId: string): boolean {
  return modelId.includes("sound") || modelId.includes("sfx");
}

// ── Workflow Validation ─────────────────────────────────────

export type WorkflowType =
  | "sound_effects"
  | "text_to_speech"
  | "voice_conversion"
  | "voice_design"
  | "music";

export interface WorkflowValidation {
  supported: boolean;
  warnings: string[];
  recommendedModel?: string;
}

function checkWorkflowRequirement(model: ModelInfo, workflow: WorkflowType): { ok: boolean; reason?: string } {
  switch (workflow) {
    case "sound_effects":
      return {
        ok: model.canDoSoundEffects,
        reason: model.canDoSoundEffects ? undefined : `${model.name} does not support sound effects generation`,
      };
    case "text_to_speech":
      return {
        ok: model.canDoTextToSpeech,
        reason: model.canDoTextToSpeech ? undefined : `${model.name} does not support text-to-speech`,
      };
    case "voice_conversion":
      return {
        ok: model.canDoVoiceConversion,
        reason: model.canDoVoiceConversion ? undefined : `${model.name} does not support voice conversion`,
      };
    case "voice_design":
      return {
        ok: model.canDoTextToSpeech && model.canUseStyle,
        reason: model.canDoTextToSpeech && model.canUseStyle ? undefined : `${model.name} requires TTS + style support for voice design`,
      };
    case "music":
      return {
        ok: model.canDoTextToSpeech,
        reason: model.canDoTextToSpeech ? undefined : `${model.name} may not support music generation`,
      };
  }
}

/** Validate whether a model supports a given workflow */
export function validateWorkflowSupport(
  model: ModelInfo,
  workflow: WorkflowType
): WorkflowValidation {
  const result = checkWorkflowRequirement(model, workflow);
  const warnings: string[] = [];

  if (!result.ok && result.reason) warnings.push(result.reason);
  if (model.tokenCostFactor && model.tokenCostFactor > 1) {
    warnings.push(`This model has a ${model.tokenCostFactor}x cost multiplier`);
  }

  return { supported: result.ok, warnings };
}

/** Get the best model for a workflow from available models */
export function getModelForWorkflow(
  models: ModelInfo[],
  workflow: WorkflowType
): ModelInfo | null {
  const compatible = models.filter((m) => validateWorkflowSupport(m, workflow).supported);
  if (compatible.length === 0) return null;
  // Prefer models with lower cost factor
  return compatible.sort((a, b) => (a.tokenCostFactor ?? 1) - (b.tokenCostFactor ?? 1))[0];
}

/** Get cost multiplier for a model (defaults to 1.0) */
export function getModelCostFactor(model: ModelInfo): number {
  return model.tokenCostFactor ?? 1.0;
}

function getMockModels(): ModelInfo[] {
  return [
    {
      modelId: "eleven_text_to_sound_v2",
      name: "Sound Effects v2",
      description: "Generate sound effects from text descriptions",
      canDoTextToSpeech: false,
      canDoVoiceConversion: false,
      canDoSoundEffects: true,
      canBeFinetuned: false,
      canUseStyle: false,
      canUseSpeakerBoost: false,
      tokenCostFactor: null,
      maxInputLength: 2000,
      concurrencyLimit: 5,
      languageCount: 0,
    },
    {
      modelId: "eleven_v3",
      name: "Eleven v3",
      description: "Latest multilingual TTS model with style control",
      canDoTextToSpeech: true,
      canDoVoiceConversion: false,
      canDoSoundEffects: false,
      canBeFinetuned: true,
      canUseStyle: true,
      canUseSpeakerBoost: true,
      tokenCostFactor: null,
      maxInputLength: 5000,
      concurrencyLimit: 10,
      languageCount: 29,
    },
    {
      modelId: "eleven_turbo_v2_5",
      name: "Turbo v2.5",
      description: "Low-latency TTS model optimized for real-time applications",
      canDoTextToSpeech: true,
      canDoVoiceConversion: false,
      canDoSoundEffects: false,
      canBeFinetuned: false,
      canUseStyle: false,
      canUseSpeakerBoost: true,
      tokenCostFactor: 0.5,
      maxInputLength: 5000,
      concurrencyLimit: 20,
      languageCount: 32,
    },
  ];
}
