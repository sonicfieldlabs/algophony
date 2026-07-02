/**
 * Algophony Studio — Generations Service
 *
 * Server-side CRUD for audio generations stored in local database.
 */

import { createServerLocalClient, createServiceLocalClient } from "@/lib/local/db-client";
import {
  getLocalFullAccessCredits,
  isLocalFullAccessEnabled,
} from "@/lib/local/full-access";
import {
  createStorageObjectUrl,
  createStorageObjectUrls,
  putStorageObject,
} from "@/lib/storage/objects";

export interface GenerationRow {
  id: string;
  user_id: string;
  prompt_card_id: string | null;
  project_id: string | null;
  status: string;
  request_payload: Record<string, unknown>;
  elevenlabs_model_id: string | null;
  audio_storage_path: string | null;
  audio_signed_url: string | null;
  audio_size_bytes?: number | null;
  duration_seconds: number | null;
  output_format: string | null;
  character_cost: number | null;
  app_credit_cost: number;
  error_message: string | null;
  api_route: string;
  request_id: string | null;
  user_verdict: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Create a pending generation record */
export async function createPendingGeneration(
  userId: string,
  promptCardId: string | null,
  requestPayload: Record<string, unknown>,
  modelId: string,
  opts: { projectId?: string | null; apiRoute?: string; appCreditCost?: number } = {}
): Promise<GenerationRow> {
  const database = await createServerLocalClient();

  const { data, error } = await database
    .from("generations")
    .insert({
      user_id: userId,
      prompt_card_id: promptCardId,
      project_id: opts.projectId ?? null,
      status: "pending",
      request_payload: requestPayload,
      elevenlabs_model_id: modelId,
      api_route: opts.apiRoute ?? "sound_effects",
      app_credit_cost: opts.appCreditCost ?? 1,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create generation: ${error.message}`);
  return data as GenerationRow;
}

/** Mark generation as succeeded and store audio reference */
export async function completeGeneration(
  generationId: string,
  storagePath: string,
  signedUrl: string,
  characterCost: number | null,
  durationSeconds: number | null,
  outputFormat: string,
  opts: {
    requestId?: string | null;
    metadata?: Record<string, unknown>;
    isMock?: boolean;
    storageSizeBytes?: number;
  } = {}
): Promise<void> {
  const database = await createServerLocalClient();

  const updateData: Record<string, unknown> = {
    status: "succeeded",
    audio_storage_path: storagePath,
    audio_signed_url: signedUrl,
    character_cost: characterCost,
    duration_seconds: durationSeconds,
    output_format: outputFormat,
  };
  if (opts.requestId) updateData.request_id = opts.requestId;
  if (opts.metadata) updateData.metadata = opts.metadata;
  if (opts.isMock !== undefined) updateData.is_mock = opts.isMock;

  const { error } = await database
    .from("generations")
    .update(updateData)
    .eq("id", generationId);

  if (error) throw new Error(`Failed to complete generation: ${error.message}`);
}

/** Mark a streaming generation as succeeded without persisted audio. */
export async function completeStreamingGeneration(
  generationId: string,
  outputFormat: string,
  opts: { requestId?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  const database = await createServerLocalClient();

  const updateData: Record<string, unknown> = {
    status: "succeeded",
    output_format: outputFormat,
  };
  if (opts.requestId) updateData.request_id = opts.requestId;
  if (opts.metadata) updateData.metadata = opts.metadata;

  const { error } = await database
    .from("generations")
    .update(updateData)
    .eq("id", generationId);

  if (error) throw new Error(`Failed to complete streaming generation: ${error.message}`);
}

/** Mark generation as failed */
export async function failGeneration(
  generationId: string,
  errorMessage: string
): Promise<void> {
  const database = await createServerLocalClient();

  const { error } = await database
    .from("generations")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", generationId);

  if (error) throw new Error(`Failed to mark generation as failed: ${error.message}`);
}

/** List generations for a user with cursor-based pagination and batch signed URLs */
export async function listGenerations(
  userId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ rows: GenerationRow[]; nextCursor: string | null }> {
  const database = await createServerLocalClient();
  const limit = Math.min(opts.limit ?? 25, 100);

  // Narrow column list — keep request_payload because list, home, and library views
  // derive display names and prompt search from the originating prompt.
  // Metadata remains excluded to keep row payloads small.
  const LIST_COLUMNS = [
    "id",
    "user_id",
    "prompt_card_id",
    "project_id",
    "status",
    "request_payload",
    "elevenlabs_model_id",
    "audio_storage_path",
    "audio_signed_url",
    "duration_seconds",
    "output_format",
    "character_cost",
    "app_credit_cost",
    "error_message",
    "api_route",
    "request_id",
    "user_verdict",
    "failure_reason",
    "preview_url",
    "created_at",
    "updated_at",
  ].join(",");

  let query = database
    .from("generations")
    .select(LIST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to determine if there's a next page

  if (opts.cursor) {
    query = query.lt("created_at", opts.cursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list generations: ${error.message}`);

  const allRows = (data ?? []) as unknown as GenerationRow[];
  const hasMore = allRows.length > limit;
  const rows = hasMore ? allRows.slice(0, limit) : allRows;
  const nextCursor = hasMore ? rows[rows.length - 1].created_at : null;

  // Reuse cached signed URLs where the `Expires` query param shows >15 min of
  // life left. Only re-sign rows that are stale/missing — this turns repeated
  // list views into a no-op against the storage API.
  const now = Math.floor(Date.now() / 1000);
  const REFRESH_THRESHOLD_SEC = 15 * 60;
  const SIGNED_URL_TTL_SEC = 60 * 60;

  const pathsToSign = rows
    .map((r, i) => ({ index: i, path: r.audio_storage_path, existing: r.audio_signed_url }))
    .filter((p): p is { index: number; path: string; existing: string | null } => p.path !== null)
    .filter((p) => {
      if (!p.existing) return true;
      try {
        const u = new URL(p.existing);
        const exp = Number(u.searchParams.get("exp") ?? (u.searchParams.get("token") ? null : u.searchParams.get("Expires")));
        if (!exp || isNaN(exp)) return true;
        return exp - now <= REFRESH_THRESHOLD_SEC;
      } catch {
        return true;
      }
    });

  if (pathsToSign.length > 0) {
    const signedData = await createStorageObjectUrls(
      pathsToSign.map((p) => p.path),
      SIGNED_URL_TTL_SEC,
    );

    for (let i = 0; i < signedData.length; i++) {
      const url = signedData[i]?.signedUrl;
      if (url) {
        rows[pathsToSign[i].index].audio_signed_url = url;
      }
    }
  }

  return { rows, nextCursor };
}

/** Get a single generation */
export async function getGeneration(
  generationId: string,
  userId: string
): Promise<GenerationRow | null> {
  const database = await createServerLocalClient();

  const { data, error } = await database
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as GenerationRow;
}

/**
 * Atomically debit one credit from user profile and insert ledger entry.
 * Uses service client to bypass RLS for the ledger write.
 */
export async function debitCreditForGeneration(
  userId: string,
  generationId: string
): Promise<{ creditsRemaining: number }> {
  if (isLocalFullAccessEnabled()) {
    return { creditsRemaining: getLocalFullAccessCredits() };
  }

  const service = createServiceLocalClient();

  const { data, error } = await service.rpc("debit_generation_credit", {
    p_user_id: userId,
    p_generation_id: generationId,
    p_amount: 1,
  });

  if (error) {
    throw new Error(`Credit debit failed: ${error.message}`);
  }

  return { creditsRemaining: Number(data) };
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Atomic + race-safe credit reservation. Must run BEFORE the ElevenLabs call.
 * Throws InsufficientCreditsError if the user can't afford it. Pair with
 * refundCreditForGeneration() on any downstream failure.
 */
export async function reserveCreditForGeneration(
  userId: string,
  generationId: string,
  amount = 1
): Promise<{ creditsRemaining: number }> {
  if (isLocalFullAccessEnabled()) {
    return { creditsRemaining: getLocalFullAccessCredits() };
  }

  const service = createServiceLocalClient();

  const { data, error } = await service.rpc("debit_generation_credit", {
    p_user_id: userId,
    p_generation_id: generationId,
    p_amount: amount,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) {
      throw new InsufficientCreditsError();
    }
    throw new Error(`Credit reservation failed: ${error.message}`);
  }

  return { creditsRemaining: Number(data) };
}

/**
 * Refund a previously-reserved credit. Idempotent on (userId, generationId)
 * — uses credit_ledger.external_id so repeated calls are safe.
 */
export async function refundCreditForGeneration(
  userId: string,
  generationId: string,
  amount = 1
): Promise<{ creditsRemaining: number }> {
  if (isLocalFullAccessEnabled()) {
    return { creditsRemaining: getLocalFullAccessCredits() };
  }

  const service = createServiceLocalClient();

  const { data, error } = await service.rpc("increment_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_source: "sfx_generation_refund",
    p_external_id: generationId,
  });

  if (error) {
    throw new Error(`Credit refund failed: ${error.message}`);
  }

  return { creditsRemaining: Number(data) };
}

/** Upload audio buffer to local database Storage */
export async function uploadGenerationAudio(
  generationId: string,
  audioBuffer: Buffer,
  contentType: string
): Promise<{ storagePath: string; signedUrl: string; sizeBytes: number }> {
  const ext = contentType.includes("wav") ? "wav" : "mp3";
  const storagePath = `generations/${generationId}.${ext}`;

  await putStorageObject(storagePath, audioBuffer, contentType);

  return {
    storagePath,
    signedUrl: await createStorageObjectUrl(storagePath, 3600),
    sizeBytes: audioBuffer.byteLength,
  };
}

/** Update the user verdict on a generation */
export async function updateGenerationVerdict(
  generationId: string,
  userId: string,
  verdict: "favorite" | "usable" | "needs_retry" | "rejected",
  failureReason?: string
): Promise<void> {
  const database = await createServerLocalClient();

  const updateData: Record<string, unknown> = { user_verdict: verdict };
  if (verdict === "rejected" && failureReason) {
    updateData.failure_reason = failureReason;
  }

  const { error } = await database
    .from("generations")
    .update(updateData)
    .eq("id", generationId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to update verdict: ${error.message}`);
}
