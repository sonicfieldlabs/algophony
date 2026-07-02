/**
 * Algophony Studio — Variation Lab — local database Helpers
 *
 * CRUD operations for variation_batches, sound_families, and variation_jobs.
 * Uses service client for server-side mutations.
 */

import "server-only";
import { createServiceLocalClient } from "@/lib/local/db-client";

// ── Types ──────────────────────────────────────────────────────

export interface DbVariationBatch {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  source_type: string;
  source_ids: string[];
  strategy: string;
  batch_mode: string;
  preservation_settings: Record<string, unknown>;
  variation_axes: string[];
  batch_size: number;
  generations_per_source: number;
  estimated_cost: number;
  actual_cost: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbSoundFamily {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  source_prompt_card_id: string | null;
  source_generated_sound_id: string | null;
  variation_batch_id: string | null;
  variation_strategy: string | null;
  preservation_settings: Record<string, unknown>;
  variation_axes: string[];
  sonic_dna_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbVariationJob {
  id: string;
  user_id: string;
  project_id: string | null;
  variation_batch_id: string | null;
  sound_family_id: string | null;
  source_prompt_card_id: string | null;
  source_generated_sound_id: string | null;
  output_prompt_card_id: string | null;
  output_generated_sound_id: string | null;
  job_index: number;
  strategy: string | null;
  generated_prompt: string | null;
  status: string;
  error_message: string | null;
  estimated_cost: number;
  actual_cost: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Variation Batches ──────────────────────────────────────────

export async function listVariationBatches(userId: string): Promise<DbVariationBatch[]> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("variation_batches")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list variation batches: ${error.message}`);
  return (data ?? []) as DbVariationBatch[];
}

export async function getVariationBatch(batchId: string, userId: string): Promise<DbVariationBatch | null> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("variation_batches")
    .select("*")
    .eq("id", batchId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbVariationBatch;
}

export async function createVariationBatch(
  userId: string,
  input: {
    name: string;
    source_type: string;
    strategy: string;
    batch_mode: string;
    preservation_settings?: Record<string, unknown>;
    variation_axes?: string[];
    batch_size?: number;
    generations_per_source?: number;
    estimated_cost?: number;
    project_id?: string;
  }
): Promise<DbVariationBatch> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("variation_batches")
    .insert({
      user_id: userId,
      name: input.name,
      source_type: input.source_type,
      strategy: input.strategy,
      batch_mode: input.batch_mode,
      preservation_settings: input.preservation_settings ?? {},
      variation_axes: input.variation_axes ?? [],
      batch_size: input.batch_size ?? 1,
      generations_per_source: input.generations_per_source ?? 1,
      estimated_cost: input.estimated_cost ?? 0,
      project_id: input.project_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create variation batch: ${error.message}`);
  return data as DbVariationBatch;
}

export async function updateVariationBatch(
  batchId: string,
  userId: string,
  updates: Partial<Omit<DbVariationBatch, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DbVariationBatch> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("variation_batches")
    .update(updates)
    .eq("id", batchId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update variation batch: ${error.message}`);
  return data as DbVariationBatch;
}

export async function deleteVariationBatch(batchId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("variation_batches")
    .delete()
    .eq("id", batchId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete variation batch: ${error.message}`);
}

// ── Sound Families ─────────────────────────────────────────────

export async function listSoundFamilies(userId: string, batchId?: string): Promise<DbSoundFamily[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("sound_families")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (batchId) query = query.eq("variation_batch_id", batchId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list sound families: ${error.message}`);
  return (data ?? []) as DbSoundFamily[];
}

export async function createSoundFamily(
  userId: string,
  input: {
    name: string;
    variation_batch_id?: string;
    variation_strategy?: string;
    preservation_settings?: Record<string, unknown>;
    variation_axes?: string[];
    project_id?: string;
    source_prompt_card_id?: string;
    source_generated_sound_id?: string;
  }
): Promise<DbSoundFamily> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("sound_families")
    .insert({
      user_id: userId,
      name: input.name,
      variation_batch_id: input.variation_batch_id ?? null,
      variation_strategy: input.variation_strategy ?? null,
      preservation_settings: input.preservation_settings ?? {},
      variation_axes: input.variation_axes ?? [],
      project_id: input.project_id ?? null,
      source_prompt_card_id: input.source_prompt_card_id ?? null,
      source_generated_sound_id: input.source_generated_sound_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sound family: ${error.message}`);
  return data as DbSoundFamily;
}

// ── Variation Jobs ─────────────────────────────────────────────

export async function listVariationJobs(userId: string, batchId?: string): Promise<DbVariationJob[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("variation_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("job_index", { ascending: true });

  if (batchId) query = query.eq("variation_batch_id", batchId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list variation jobs: ${error.message}`);
  return (data ?? []) as DbVariationJob[];
}

export async function createVariationJob(
  userId: string,
  input: {
    variation_batch_id: string;
    job_index: number;
    strategy?: string;
    generated_prompt?: string;
    estimated_cost?: number;
    sound_family_id?: string;
    source_prompt_card_id?: string;
    source_generated_sound_id?: string;
    project_id?: string;
  }
): Promise<DbVariationJob> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("variation_jobs")
    .insert({
      user_id: userId,
      variation_batch_id: input.variation_batch_id,
      job_index: input.job_index,
      strategy: input.strategy ?? null,
      generated_prompt: input.generated_prompt ?? null,
      estimated_cost: input.estimated_cost ?? 0,
      sound_family_id: input.sound_family_id ?? null,
      source_prompt_card_id: input.source_prompt_card_id ?? null,
      source_generated_sound_id: input.source_generated_sound_id ?? null,
      project_id: input.project_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create variation job: ${error.message}`);
  return data as DbVariationJob;
}

export async function updateVariationJob(
  jobId: string,
  userId: string,
  updates: Partial<Pick<DbVariationJob,
    "status" | "error_message" | "actual_cost" | "generated_prompt" |
    "output_prompt_card_id" | "output_generated_sound_id" | "metadata"
  >>
): Promise<DbVariationJob> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("variation_jobs")
    .update(updates)
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update variation job: ${error.message}`);
  return data as DbVariationJob;
}
