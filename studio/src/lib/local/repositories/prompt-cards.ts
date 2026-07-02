/**
 * Algophony Studio — Prompt Card Service
 *
 * Server-side CRUD for prompt cards stored in local database.
 */

import { createServerLocalClient } from "@/lib/local/db-client";
import { ownOrSeedOr } from "@/lib/local/repositories/filters";
import { composePrompt } from "@/lib/sfx/compose-prompt";
import { criticize } from "@/lib/sfx/critic";
import { getSavedCardLimit } from "@/lib/sfx/entitlements";
import type { SfxPromptAttributes } from "@/lib/sfx/prompt-schema";
import type { SceneEvent } from "@/lib/sfx/scene-breakdown";
import type { Plan } from "@/lib/sfx/entitlements";

export interface PromptCardRow {
  id: string;
  user_id: string | null;
  title: string;
  category: string;
  subcategory: string | null;
  source_object: string | null;
  action: string | null;
  material: string | null;
  surface: string | null;
  environment: string | null;
  acoustic_space: string | null;
  perspective: string | null;
  distance: string | null;
  motion: string | null;
  rhythm: string | null;
  density: string | null;
  texture: string | null;
  mood: string | null;
  realism_level: string | null;
  duration_seconds: number | null;
  loop: boolean;
  prompt_influence: number;
  model_id: string;
  output_format: string | null;
  exclusions: string[];
  use_case: string | null;
  sonic_dna_id: string | null;
  generated_prompt: string;
  critic_score: number;
  critic_report: Record<string, unknown>;
  is_seed: boolean;
  created_at: string;
  updated_at: string;
}

/** List all prompt cards for a user (includes seed cards) */
export async function listPromptCards(userId: string): Promise<PromptCardRow[]> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("prompt_cards")
    .select("*")
    .or(ownOrSeedOr(userId))
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list cards: ${error.message}`);
  return (data ?? []) as PromptCardRow[];
}

/** Get a single prompt card by ID (user must own it or it's a seed) */
export async function getPromptCardForUser(
  cardId: string,
  userId: string
): Promise<PromptCardRow | null> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("prompt_cards")
    .select("*")
    .eq("id", cardId)
    .or(ownOrSeedOr(userId))
    .maybeSingle();

  if (error || !data) return null;
  return data as PromptCardRow;
}

/** Count user-owned cards (not seeds) */
export async function countUserCards(userId: string): Promise<number> {
  const database = await createServerLocalClient();
  const { count, error } = await database
    .from("prompt_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_seed", false);

  if (error) return 0;
  return count ?? 0;
}

/** Convert SfxPromptAttributes to database insert fields */
function attrsToDbFields(attrs: Partial<SfxPromptAttributes>) {
  const fullAttrs: SfxPromptAttributes = {
    category: attrs.category || "Foley",
    loop: attrs.loop ?? false,
    promptInfluence: attrs.promptInfluence ?? 0.3,
    modelId: attrs.modelId ?? "eleven_text_to_sound_v2",
    exclusions: attrs.exclusions ?? ["no music", "no dialogue"],
    ...attrs,
  };

  const prompt = composePrompt(fullAttrs);
  const report = criticize(fullAttrs);

  return {
    category: fullAttrs.category,
    subcategory: fullAttrs.subcategory ?? null,
    source_object: fullAttrs.sourceObject ?? null,
    action: fullAttrs.action ?? null,
    material: fullAttrs.material ?? null,
    surface: fullAttrs.surface ?? null,
    environment: fullAttrs.environment ?? null,
    acoustic_space: fullAttrs.acousticSpace ?? null,
    perspective: fullAttrs.perspective ?? null,
    distance: fullAttrs.distance ?? null,
    motion: fullAttrs.motion ?? null,
    rhythm: fullAttrs.rhythm ?? null,
    density: fullAttrs.density ?? null,
    texture: fullAttrs.texture ?? null,
    mood: fullAttrs.mood ?? null,
    realism_level: fullAttrs.realismLevel ?? null,
    duration_seconds: fullAttrs.durationSeconds ?? null,
    loop: fullAttrs.loop,
    prompt_influence: fullAttrs.promptInfluence,
    model_id: fullAttrs.modelId,
    output_format: fullAttrs.outputFormat ?? null,
    exclusions: fullAttrs.exclusions,
    use_case: fullAttrs.useCase ?? null,
    sonic_dna_id: fullAttrs.sonicDna?.id ?? null,
    generated_prompt: prompt,
    critic_score: report.score,
    critic_report: report as unknown as Record<string, unknown>,
  };
}

/** Create a new prompt card */
export async function createPromptCard(
  userId: string,
  attrs: Partial<SfxPromptAttributes>,
  title: string,
  plan: Plan = "free"
): Promise<PromptCardRow> {
  // Enforce card limit
  const currentCount = await countUserCards(userId);
  const limit = getSavedCardLimit(plan);
  if (currentCount >= limit) {
    throw new Error(
      `Local prompt card limit reached (${limit}).`
    );
  }

  const database = await createServerLocalClient();
  const fields = attrsToDbFields(attrs);

  const { data, error } = await database
    .from("prompt_cards")
    .insert({
      user_id: userId,
      title,
      is_seed: false,
      ...fields,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create card: ${error.message}`);
  return data as PromptCardRow;
}

/** Update an existing prompt card */
export async function updatePromptCard(
  userId: string,
  cardId: string,
  attrs: Partial<SfxPromptAttributes>,
  title?: string
): Promise<PromptCardRow> {
  const database = await createServerLocalClient();
  const fields = attrsToDbFields(attrs);

  const updateData: Record<string, unknown> = { ...fields };
  if (title !== undefined) updateData.title = title;

  const { data, error } = await database
    .from("prompt_cards")
    .update(updateData)
    .eq("id", cardId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update card: ${error.message}`);
  return data as PromptCardRow;
}

/** Create prompt cards from scene events */
export async function createCardsFromSceneEvents(
  userId: string,
  events: SceneEvent[],
  plan: Plan = "free"
): Promise<PromptCardRow[]> {
  const currentCount = await countUserCards(userId);
  const limit = getSavedCardLimit(plan);
  const available = Math.max(0, limit - currentCount);

  if (available === 0) {
    throw new Error(
      `Local prompt card limit reached (${limit}).`
    );
  }

  const toInsert = events.slice(0, available);
  const database = await createServerLocalClient();

  const rows = toInsert.map((event) => {
    const fields = attrsToDbFields(event.attributes);
    return {
      user_id: userId,
      title: event.title,
      is_seed: false,
      ...fields,
    };
  });

  const { data, error } = await database
    .from("prompt_cards")
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to create cards: ${error.message}`);
  return (data ?? []) as PromptCardRow[];
}
