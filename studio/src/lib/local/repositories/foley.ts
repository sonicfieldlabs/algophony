/**
 * Algophony Studio — Foley Room — local database Helpers
 *
 * CRUD operations for foley_sets and foley_items.
 */

import "server-only";
import { createServiceLocalClient } from "@/lib/local/db-client";

// ── Types ──────────────────────────────────────────────────────

export interface DbFoleySet {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  category: string;
  description: string;
  surface: string | null;
  material: string | null;
  performance_style: string | null;
  mic_perspective: string | null;
  realism_level: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbFoleyItem {
  id: string;
  user_id: string;
  foley_set_id: string | null;
  prompt_card_id: string | null;
  generated_sound_id: string | null;
  category: string;
  action: string | null;
  performer_weight: string | null;
  gesture_speed: string | null;
  contact_force: string | null;
  surface: string | null;
  shoe_type: string | null;
  cloth_type: string | null;
  object_material: string | null;
  object_size: string | null;
  mic_perspective: string | null;
  room_size: string | null;
  realism: string | null;
  sync_looseness: string | null;
  take_number: number;
  side: string | null;
  variation_role: string | null;
  prompt_text: string;
  audio_url: string | null;
  generation_id: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Foley Sets ────────────────────────────────────────────────

export async function listFoleySets(userId: string): Promise<DbFoleySet[]> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("foley_sets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list Foley sets: ${error.message}`);
  return (data ?? []) as DbFoleySet[];
}

export async function getFoleySet(setId: string, userId: string): Promise<DbFoleySet | null> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("foley_sets")
    .select("*")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbFoleySet;
}

export async function createFoleySet(
  userId: string,
  input: {
    name: string;
    category: string;
    description?: string;
    surface?: string;
    material?: string;
    performance_style?: string;
    mic_perspective?: string;
    realism_level?: string;
    project_id?: string;
  }
): Promise<DbFoleySet> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("foley_sets")
    .insert({
      user_id: userId,
      name: input.name,
      category: input.category,
      description: input.description ?? "",
      surface: input.surface ?? null,
      material: input.material ?? null,
      performance_style: input.performance_style ?? null,
      mic_perspective: input.mic_perspective ?? null,
      realism_level: input.realism_level ?? null,
      project_id: input.project_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create Foley set: ${error.message}`);
  return data as DbFoleySet;
}

export async function updateFoleySet(
  setId: string, userId: string,
  updates: Partial<Omit<DbFoleySet, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DbFoleySet> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("foley_sets")
    .update(updates)
    .eq("id", setId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update Foley set: ${error.message}`);
  return data as DbFoleySet;
}

export async function deleteFoleySet(setId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("foley_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete Foley set: ${error.message}`);
}

// ── Foley Items ───────────────────────────────────────────────

export async function listFoleyItems(userId: string, setId?: string): Promise<DbFoleyItem[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("foley_items")
    .select("*")
    .eq("user_id", userId)
    .order("take_number", { ascending: true });

  if (setId) query = query.eq("foley_set_id", setId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list Foley items: ${error.message}`);
  return (data ?? []) as DbFoleyItem[];
}

export async function createFoleyItem(
  userId: string,
  input: {
    foley_set_id?: string;
    category: string;
    action?: string;
    performer_weight?: string;
    gesture_speed?: string;
    contact_force?: string;
    surface?: string;
    shoe_type?: string;
    cloth_type?: string;
    object_material?: string;
    object_size?: string;
    mic_perspective?: string;
    room_size?: string;
    realism?: string;
    sync_looseness?: string;
    take_number?: number;
    side?: string;
    variation_role?: string;
    prompt_text?: string;
    audio_url?: string;
    generation_id?: string;
    status?: string;
  }
): Promise<DbFoleyItem> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("foley_items")
    .insert({
      user_id: userId,
      ...input,
      status: input.status ?? "draft",
      prompt_text: input.prompt_text ?? "",
      take_number: input.take_number ?? 1,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create Foley item: ${error.message}`);
  return data as DbFoleyItem;
}

export async function updateFoleyItem(
  itemId: string, userId: string,
  updates: Partial<Pick<DbFoleyItem,
    "category" | "action" | "performer_weight" | "gesture_speed" | "contact_force" |
    "surface" | "shoe_type" | "cloth_type" | "object_material" | "object_size" |
    "mic_perspective" | "room_size" | "realism" | "sync_looseness" |
    "take_number" | "side" | "variation_role" | "prompt_text" |
    "audio_url" | "generation_id" | "status" | "error_message" | "metadata"
  >>
): Promise<DbFoleyItem> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("foley_items")
    .update(updates)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update Foley item: ${error.message}`);
  return data as DbFoleyItem;
}

export async function deleteFoleyItem(itemId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("foley_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete Foley item: ${error.message}`);
}
