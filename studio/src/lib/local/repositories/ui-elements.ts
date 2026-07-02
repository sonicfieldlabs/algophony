/**
 * Algophony Studio — UI Sound Sets & Items — local database Helpers
 *
 * CRUD operations for the ui_sound_sets and ui_sound_items tables.
 * Uses service client for server-side mutations.
 */

import "server-only";
import { createServiceLocalClient } from "@/lib/local/db-client";

// ── Types ──────────────────────────────────────────────────────

export interface DbUISoundSet {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  brand_description: string | null;
  interface_type: string | null;
  visual_style: string | null;
  sonic_style: string | null;
  default_exclusions: string[];
  created_at: string;
  updated_at: string;
}

export interface DbUISoundItem {
  id: string;
  user_id: string;
  sound_set_id: string | null;
  prompt_card_id: string | null;
  generated_sound_id: string | null;
  element_type: string;
  action_type: string;
  state: string | null;
  importance_level: string | null;
  frequency_of_use: string | null;
  engine_mode: string;
  duration_target: number | null;
  sonic_role: string | null;
  prompt_text: string | null;
  audio_url: string | null;
  fader_state: Record<string, number>;
  ui_metadata: Record<string, unknown>;
  status: string;
  created_at: string;
}

// ── Sound Sets ─────────────────────────────────────────────────

export async function listSoundSets(userId: string): Promise<DbUISoundSet[]> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("ui_sound_sets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list sound sets: ${error.message}`);
  return (data ?? []) as DbUISoundSet[];
}

export async function getSoundSet(setId: string, userId: string): Promise<DbUISoundSet | null> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("ui_sound_sets")
    .select("*")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbUISoundSet;
}

export async function createSoundSet(
  userId: string,
  input: {
    name: string;
    project_id?: string;
    brand_description?: string;
    interface_type?: string;
    visual_style?: string;
    sonic_style?: string;
    default_exclusions?: string[];
  }
): Promise<DbUISoundSet> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("ui_sound_sets")
    .insert({
      user_id: userId,
      name: input.name,
      project_id: input.project_id ?? null,
      brand_description: input.brand_description ?? null,
      interface_type: input.interface_type ?? null,
      visual_style: input.visual_style ?? null,
      sonic_style: input.sonic_style ?? null,
      default_exclusions: input.default_exclusions ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sound set: ${error.message}`);
  return data as DbUISoundSet;
}

export async function updateSoundSet(
  setId: string,
  userId: string,
  updates: Partial<Pick<DbUISoundSet, "name" | "brand_description" | "interface_type" | "visual_style" | "sonic_style" | "default_exclusions">>
): Promise<DbUISoundSet> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("ui_sound_sets")
    .update(updates)
    .eq("id", setId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update sound set: ${error.message}`);
  return data as DbUISoundSet;
}

export async function deleteSoundSet(setId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("ui_sound_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete sound set: ${error.message}`);
}

// ── Sound Items ────────────────────────────────────────────────

export async function listSoundItems(
  userId: string,
  soundSetId?: string
): Promise<DbUISoundItem[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("ui_sound_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (soundSetId) {
    query = query.eq("sound_set_id", soundSetId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list sound items: ${error.message}`);
  return (data ?? []) as DbUISoundItem[];
}

export async function createSoundItem(
  userId: string,
  input: {
    sound_set_id?: string;
    element_type: string;
    action_type: string;
    state?: string;
    importance_level?: string;
    frequency_of_use?: string;
    engine_mode: string;
    duration_target?: number;
    sonic_role?: string;
    prompt_text?: string;
    audio_url?: string;
    generated_sound_id?: string;
    fader_state?: Record<string, number>;
    ui_metadata?: Record<string, unknown>;
    status?: string;
  }
): Promise<DbUISoundItem> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("ui_sound_items")
    .insert({
      user_id: userId,
      sound_set_id: input.sound_set_id ?? null,
      element_type: input.element_type,
      action_type: input.action_type,
      state: input.state ?? null,
      importance_level: input.importance_level ?? null,
      frequency_of_use: input.frequency_of_use ?? null,
      engine_mode: input.engine_mode,
      duration_target: input.duration_target ?? null,
      sonic_role: input.sonic_role ?? null,
      prompt_text: input.prompt_text ?? null,
      audio_url: input.audio_url ?? null,
      generated_sound_id: input.generated_sound_id ?? null,
      fader_state: input.fader_state ?? {},
      ui_metadata: input.ui_metadata ?? {},
      status: input.status ?? "draft",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sound item: ${error.message}`);
  return data as DbUISoundItem;
}

export async function updateSoundItem(
  itemId: string,
  userId: string,
  updates: Partial<Pick<DbUISoundItem, "status" | "audio_url" | "generated_sound_id" | "prompt_text" | "fader_state" | "ui_metadata">>
): Promise<DbUISoundItem> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("ui_sound_items")
    .update(updates)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update sound item: ${error.message}`);
  return data as DbUISoundItem;
}

export async function deleteSoundItem(itemId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("ui_sound_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete sound item: ${error.message}`);
}
