/**
 * Algophony Studio — Stacker — local database Helpers
 *
 * CRUD operations for stacker_cues and stacker_layers.
 * Uses service client for server-side mutations.
 */

import "server-only";
import { createServiceLocalClient } from "@/lib/local/db-client";

// ── Types ──────────────────────────────────────────────────────

export interface DbStackerCue {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string;
  context: string;
  naming_convention: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbStackerLayer {
  id: string;
  user_id: string;
  stacker_cue_id: string;
  layer_type: string;
  frequency_role: string;
  prompt_text: string;
  duration_seconds: number;
  loop: boolean;
  prompt_influence: number;
  priority: number;
  muted: boolean;
  solo: boolean;
  audio_url: string | null;
  generation_id: string | null;
  generated_sound_id: string | null;
  imported_from: string | null;
  imported_module: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Stacker Cues ──────────────────────────────────────────────

export async function listStackerCues(userId: string): Promise<DbStackerCue[]> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("stacker_cues")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list stacker cues: ${error.message}`);
  return (data ?? []) as DbStackerCue[];
}

export async function getStackerCue(cueId: string, userId: string): Promise<DbStackerCue | null> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("stacker_cues")
    .select("*")
    .eq("id", cueId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbStackerCue;
}

export async function createStackerCue(
  userId: string,
  input: {
    name: string;
    description?: string;
    context?: string;
    naming_convention?: string;
    project_id?: string;
  }
): Promise<DbStackerCue> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("stacker_cues")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? "",
      context: input.context ?? "film_scene",
      naming_convention: input.naming_convention ?? "film_foley",
      project_id: input.project_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create stacker cue: ${error.message}`);
  return data as DbStackerCue;
}

export async function updateStackerCue(
  cueId: string,
  userId: string,
  updates: Partial<Omit<DbStackerCue, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DbStackerCue> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("stacker_cues")
    .update(updates)
    .eq("id", cueId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update stacker cue: ${error.message}`);
  return data as DbStackerCue;
}

export async function deleteStackerCue(cueId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("stacker_cues")
    .delete()
    .eq("id", cueId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete stacker cue: ${error.message}`);
}

// ── Stacker Layers ────────────────────────────────────────────

export async function listStackerLayers(userId: string, cueId?: string): Promise<DbStackerLayer[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("stacker_layers")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  if (cueId) query = query.eq("stacker_cue_id", cueId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list stacker layers: ${error.message}`);
  return (data ?? []) as DbStackerLayer[];
}

export async function createStackerLayer(
  userId: string,
  input: {
    stacker_cue_id: string;
    layer_type: string;
    frequency_role?: string;
    prompt_text?: string;
    duration_seconds?: number;
    loop?: boolean;
    prompt_influence?: number;
    priority?: number;
    audio_url?: string;
    generation_id?: string;
    generated_sound_id?: string;
    imported_from?: string;
    imported_module?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DbStackerLayer> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("stacker_layers")
    .insert({
      user_id: userId,
      stacker_cue_id: input.stacker_cue_id,
      layer_type: input.layer_type,
      frequency_role: input.frequency_role ?? "wide",
      prompt_text: input.prompt_text ?? "",
      duration_seconds: input.duration_seconds ?? 2,
      loop: input.loop ?? false,
      prompt_influence: input.prompt_influence ?? 0.3,
      priority: input.priority ?? 0,
      audio_url: input.audio_url ?? null,
      generation_id: input.generation_id ?? null,
      generated_sound_id: input.generated_sound_id ?? null,
      imported_from: input.imported_from ?? null,
      imported_module: input.imported_module ?? null,
      status: input.status ?? "draft",
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create stacker layer: ${error.message}`);
  return data as DbStackerLayer;
}

export async function updateStackerLayer(
  layerId: string,
  userId: string,
  updates: Partial<Pick<DbStackerLayer,
    "layer_type" | "frequency_role" | "prompt_text" | "duration_seconds" |
    "loop" | "prompt_influence" | "priority" | "muted" | "solo" |
    "audio_url" | "generation_id" | "generated_sound_id" |
    "imported_from" | "imported_module" | "status" | "error_message" | "metadata"
  >>
): Promise<DbStackerLayer> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("stacker_layers")
    .update(updates)
    .eq("id", layerId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update stacker layer: ${error.message}`);
  return data as DbStackerLayer;
}

export async function deleteStackerLayer(layerId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("stacker_layers")
    .delete()
    .eq("id", layerId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete stacker layer: ${error.message}`);
}
