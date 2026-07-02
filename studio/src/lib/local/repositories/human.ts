/**
 * Algophony Studio — Human Lab — local database Helpers
 *
 * CRUD operations for human_sets and human_items.
 */

import "server-only";
import { createServiceLocalClient } from "@/lib/local/db-client";

// ── Types ──────────────────────────────────────────────────────

export interface DbHumanSet {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  category: string;
  description: string;
  engine_mode: string;
  body_profile: Record<string, unknown>;
  emotion: string | null;
  realism: string | null;
  crowd_config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbHumanItem {
  id: string;
  user_id: string;
  human_set_id: string | null;
  prompt_card_id: string | null;
  generated_sound_id: string | null;
  category: string;
  engine_mode: string;
  action: string | null;
  emotion: string | null;
  intensity: string | null;
  body_profile: Record<string, unknown>;
  distance: string | null;
  crowd_size: string | null;
  intelligibility: string | null;
  language: string | null;
  chant_phrase: string | null;
  take_number: number;
  variation_role: string | null;
  prompt_text: string;
  audio_url: string | null;
  generation_id: string | null;
  status: string;
  error_message: string | null;
  daw_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Human Sets ────────────────────────────────────────────────

export async function listHumanSets(userId: string): Promise<DbHumanSet[]> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("human_sets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list Human sets: ${error.message}`);
  return (data ?? []) as DbHumanSet[];
}

export async function getHumanSet(setId: string, userId: string): Promise<DbHumanSet | null> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("human_sets")
    .select("*")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbHumanSet;
}

export async function createHumanSet(
  userId: string,
  input: {
    name: string;
    category: string;
    description?: string;
    engine_mode?: string;
    body_profile?: Record<string, unknown>;
    emotion?: string;
    realism?: string;
    crowd_config?: Record<string, unknown>;
    project_id?: string;
  }
): Promise<DbHumanSet> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("human_sets")
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category,
      description: input.description ?? "",
      engine_mode: input.engine_mode ?? "sfx",
      body_profile: input.body_profile ?? {},
      emotion: input.emotion ?? null,
      realism: input.realism ?? null,
      crowd_config: input.crowd_config ?? {},
      project_id: input.project_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create Human set: ${error.message}`);
  return data as DbHumanSet;
}

export async function updateHumanSet(
  setId: string, userId: string,
  updates: Partial<Omit<DbHumanSet, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DbHumanSet> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("human_sets")
    .update(updates)
    .eq("id", setId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update Human set: ${error.message}`);
  return data as DbHumanSet;
}

export async function deleteHumanSet(setId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("human_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete Human set: ${error.message}`);
}

// ── Human Items ───────────────────────────────────────────────

export async function listHumanItems(userId: string, setId?: string): Promise<DbHumanItem[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("human_items")
    .select("*")
    .eq("user_id", userId)
    .order("take_number", { ascending: true });

  if (setId) query = query.eq("human_set_id", setId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list Human items: ${error.message}`);
  return (data ?? []) as DbHumanItem[];
}

export async function createHumanItem(
  userId: string,
  input: {
    human_set_id?: string;
    category: string;
    engine_mode?: string;
    action?: string;
    emotion?: string;
    intensity?: string;
    body_profile?: Record<string, unknown>;
    distance?: string;
    crowd_size?: string;
    intelligibility?: string;
    language?: string;
    chant_phrase?: string;
    take_number?: number;
    variation_role?: string;
    prompt_text?: string;
    audio_url?: string;
    generation_id?: string;
    status?: string;
    daw_notes?: string;
  }
): Promise<DbHumanItem> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("human_items")
    .insert({
      user_id: userId,
      ...input,
      status: input.status ?? "draft",
      prompt_text: input.prompt_text ?? "",
      take_number: input.take_number ?? 1,
      engine_mode: input.engine_mode ?? "sfx",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create Human item: ${error.message}`);
  return data as DbHumanItem;
}

export async function updateHumanItem(
  itemId: string, userId: string,
  updates: Partial<Pick<DbHumanItem,
    "category" | "engine_mode" | "action" | "emotion" | "intensity" |
    "body_profile" | "distance" | "crowd_size" | "intelligibility" |
    "language" | "chant_phrase" | "take_number" | "variation_role" |
    "prompt_text" | "audio_url" | "generation_id" | "status" |
    "error_message" | "daw_notes" | "metadata"
  >>
): Promise<DbHumanItem> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("human_items")
    .update(updates)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update Human item: ${error.message}`);
  return data as DbHumanItem;
}

export async function deleteHumanItem(itemId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("human_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete Human item: ${error.message}`);
}
