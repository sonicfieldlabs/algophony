/**
 * Algophony Studio — Atmosphere Builder — local database Helpers
 *
 * CRUD operations for atmosphere_projects and atmosphere_layers.
 * Uses service client for server-side mutations.
 */

import "server-only";
import { createServiceLocalClient } from "@/lib/local/db-client";

// ── Types ──────────────────────────────────────────────────────

export interface DbAtmosphereProject {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  scene_description: string | null;
  location: string | null;
  time_of_day: string | null;
  weather: string | null;
  emotional_tone: string | null;
  narrative_function: string | null;
  realism_level: string | null;
  density: string | null;
  human_presence: string;
  animal_presence: string;
  machine_presence: string;
  synthetic_presence: string;
  avoided_sounds: string[];
  dramatic_values: Record<string, number>;
  default_duration: number;
  loop: boolean;
  prompt_influence: number;
  output_format: string;
  model_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbAtmosphereLayer {
  id: string;
  user_id: string;
  atmosphere_project_id: string;
  prompt_card_id: string | null;
  generated_sound_id: string | null;
  layer_type: string;
  layer_role: string | null;
  prompt_text: string | null;
  intensity: number;
  density: number;
  distance: number;
  movement: number;
  frequency_role: string;
  loopable: boolean;
  duration_seconds: number;
  prompt_influence: number;
  priority: number;
  muted: boolean;
  solo: boolean;
  audio_url: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Atmosphere Projects ────────────────────────────────────────

export async function listAtmosphereProjects(userId: string): Promise<DbAtmosphereProject[]> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("atmosphere_projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list atmosphere projects: ${error.message}`);
  return (data ?? []) as DbAtmosphereProject[];
}

export async function getAtmosphereProject(projectId: string, userId: string): Promise<DbAtmosphereProject | null> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("atmosphere_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbAtmosphereProject;
}

export async function createAtmosphereProject(
  userId: string,
  input: {
    name: string;
    project_id?: string;
    scene_description?: string;
    location?: string;
    time_of_day?: string;
    weather?: string;
    emotional_tone?: string;
    narrative_function?: string;
    realism_level?: string;
    density?: string;
    human_presence?: string;
    animal_presence?: string;
    machine_presence?: string;
    synthetic_presence?: string;
    avoided_sounds?: string[];
    dramatic_values?: Record<string, number>;
    default_duration?: number;
    loop?: boolean;
    prompt_influence?: number;
  }
): Promise<DbAtmosphereProject> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("atmosphere_projects")
    .insert({
      user_id: userId,
      name: input.name,
      project_id: input.project_id ?? null,
      scene_description: input.scene_description ?? null,
      location: input.location ?? null,
      time_of_day: input.time_of_day ?? null,
      weather: input.weather ?? null,
      emotional_tone: input.emotional_tone ?? null,
      narrative_function: input.narrative_function ?? null,
      realism_level: input.realism_level ?? null,
      density: input.density ?? null,
      human_presence: input.human_presence ?? "none",
      animal_presence: input.animal_presence ?? "moderate",
      machine_presence: input.machine_presence ?? "none",
      synthetic_presence: input.synthetic_presence ?? "none",
      avoided_sounds: input.avoided_sounds ?? [],
      dramatic_values: input.dramatic_values ?? {},
      default_duration: input.default_duration ?? 20,
      loop: input.loop ?? true,
      prompt_influence: input.prompt_influence ?? 0.3,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create atmosphere project: ${error.message}`);
  return data as DbAtmosphereProject;
}

export async function updateAtmosphereProject(
  projectId: string,
  userId: string,
  updates: Partial<Omit<DbAtmosphereProject, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<DbAtmosphereProject> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("atmosphere_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update atmosphere project: ${error.message}`);
  return data as DbAtmosphereProject;
}

export async function deleteAtmosphereProject(projectId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("atmosphere_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete atmosphere project: ${error.message}`);
}

// ── Atmosphere Layers ──────────────────────────────────────────

export async function listAtmosphereLayers(
  userId: string,
  atmosphereProjectId?: string
): Promise<DbAtmosphereLayer[]> {
  const database = createServiceLocalClient();
  let query = database
    .from("atmosphere_layers")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  if (atmosphereProjectId) {
    query = query.eq("atmosphere_project_id", atmosphereProjectId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list atmosphere layers: ${error.message}`);
  return (data ?? []) as DbAtmosphereLayer[];
}

export async function createAtmosphereLayer(
  userId: string,
  input: {
    atmosphere_project_id: string;
    layer_type: string;
    layer_role?: string;
    prompt_text?: string;
    intensity?: number;
    density?: number;
    distance?: number;
    movement?: number;
    frequency_role?: string;
    loopable?: boolean;
    duration_seconds?: number;
    prompt_influence?: number;
    priority?: number;
    audio_url?: string;
    generated_sound_id?: string;
    status?: string;
  }
): Promise<DbAtmosphereLayer> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("atmosphere_layers")
    .insert({
      user_id: userId,
      atmosphere_project_id: input.atmosphere_project_id,
      layer_type: input.layer_type,
      layer_role: input.layer_role ?? null,
      prompt_text: input.prompt_text ?? null,
      intensity: input.intensity ?? 0.5,
      density: input.density ?? 0.5,
      distance: input.distance ?? 0.5,
      movement: input.movement ?? 0.3,
      frequency_role: input.frequency_role ?? "full",
      loopable: input.loopable ?? true,
      duration_seconds: input.duration_seconds ?? 20,
      prompt_influence: input.prompt_influence ?? 0.3,
      priority: input.priority ?? 0,
      audio_url: input.audio_url ?? null,
      generated_sound_id: input.generated_sound_id ?? null,
      status: input.status ?? "draft",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create atmosphere layer: ${error.message}`);
  return data as DbAtmosphereLayer;
}

export async function updateAtmosphereLayer(
  layerId: string,
  userId: string,
  updates: Partial<Pick<DbAtmosphereLayer,
    "layer_role" | "prompt_text" | "intensity" | "density" | "distance" |
    "movement" | "frequency_role" | "loopable" | "duration_seconds" |
    "prompt_influence" | "priority" | "muted" | "solo" | "audio_url" |
    "generated_sound_id" | "status" | "metadata"
  >>
): Promise<DbAtmosphereLayer> {
  const database = createServiceLocalClient();
  const { data, error } = await database
    .from("atmosphere_layers")
    .update(updates)
    .eq("id", layerId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update atmosphere layer: ${error.message}`);
  return data as DbAtmosphereLayer;
}

export async function deleteAtmosphereLayer(layerId: string, userId: string): Promise<void> {
  const database = createServiceLocalClient();
  const { error } = await database
    .from("atmosphere_layers")
    .delete()
    .eq("id", layerId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete atmosphere layer: ${error.message}`);
}
