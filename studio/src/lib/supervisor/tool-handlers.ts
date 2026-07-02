/**
 * Algophony Studio — Supervisor Tool Handlers
 *
 * Server-side implementations for each supervisor tool.
 * Each handler validates input, checks entitlements, and delegates
 * to existing Algophony Studio modules.
 */

import { z } from "zod";
import { createServerLocalClient } from "@/lib/local/db-client";
import { breakdownScene } from "@/lib/sfx/scene-breakdown";
import { CREDIT_COSTS } from "@/lib/sfx/credits";
import { buildCueSheet, buildGameAudioManifest } from "@/lib/sfx/export-builders";
import { applyLocalFullAccessToProfile } from "@/lib/local/full-access";
import { requiresApproval, getApprovalReason } from "./approval-policy";
import { createAction, updateActionStatus } from "./session-manager";
import { executeGenerateSfx } from "@/lib/operations/generate-sfx";
import {
  enforceGenerationPolicy,
  GenerationPolicyError,
} from "@/lib/demo/access";
import type { ToolName, ToolCallContext, ToolCallResult } from "./types";

/* ── Input Schemas ───────────────────────────────────────────── */

const projectContextSchema = z.object({
  project_id: z.string().uuid(),
});

const createPromptCardSchema = z.object({
  project_id: z.string().uuid().optional(),
  title: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  layer_role: z.string().optional(),
  prompt_text: z.string().min(1),
  duration_seconds: z.number().min(0.5).max(30).optional(),
  loop: z.boolean().default(false),
  prompt_influence: z.number().min(0).max(1).default(0.3),
  exclusion_constraints: z.array(z.string()).default([]),
});

const cueListSchema = z.object({
  project_id: z.string().uuid().optional(),
  scene_description: z.string().min(1),
});

const layerPlanSchema = z.object({
  project_id: z.string().uuid().optional(),
  scene_description: z.string().min(1),
  medium: z.string().optional(),
  style: z.string().optional(),
  sound_goal: z.string().optional(),
  avoid: z.array(z.string()).default([]),
});

const estimateCostSchema = z.object({
  prompt_card_count: z.number().min(1).default(1),
  variation_count: z.number().min(1).default(1),
  include_audio_generation: z.boolean().default(true),
});

const generateSchema = z.object({
  prompt_card_id: z.string().uuid().optional(),
  prompt_text: z.string().min(1),
  duration_seconds: z.number().min(0.5).max(30).optional(),
  loop: z.boolean().default(false),
  prompt_influence: z.number().min(0).max(1).default(0.3),
});

/* ── Handler Registry ────────────────────────────────────────── */

type ToolHandler = (
  input: Record<string, unknown>,
  ctx: ToolCallContext
) => Promise<ToolCallResult>;

const handlers: Record<ToolName, ToolHandler> = {
  get_project_context: handleGetProjectContext,
  create_sound_cue_list: handleCreateCueList,
  create_layer_plan: handleCreateLayerPlan,
  create_prompt_card: handleCreatePromptCard,
  create_prompt_cards_batch: handleCreatePromptCardsBatch,
  estimate_generation_cost: handleEstimateCost,
  generate_sfx_from_prompt_card: handleGenerateSfx,
  generate_variation_batch: handleGenerateVariationBatch,
  create_foley_set: handleCreateFoleySet,
  create_atmosphere_plan: handleCreateAtmospherePlan,
  create_ui_sound_set: handleCreateUiSoundSet,
  create_human_or_creature_set: handleCreateHumanCreatureSet,
  analyze_reference_audio: handleAnalyzeReference,
  prepare_export_plan: handlePrepareExportPlan,
  create_daw_handoff_pack: handleCreateDawPack,
  create_game_audio_manifest: handleCreateGameManifest,
  get_usage_summary: handleGetUsageSummary,
};

/**
 * Execute a supervisor tool by name.
 */
export async function executeTool(
  toolName: ToolName,
  input: Record<string, unknown>,
  ctx: ToolCallContext
): Promise<ToolCallResult> {
  const handler = handlers[toolName];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  // Check approval policy
  if (requiresApproval(toolName)) {
    const action = await createAction(
      ctx.userId, ctx.sessionId, ctx.projectId,
      toolName, toolName, input, true
    );
    return {
      success: true,
      requiresApproval: true,
      actionId: action.id,
      data: {
        message: `This action requires your approval before execution.`,
        reason: getApprovalReason(toolName),
        action_id: action.id,
      },
    };
  }

  // Auto-execute
  try {
    const action = await createAction(
      ctx.userId, ctx.sessionId, ctx.projectId,
      toolName, toolName, input, false
    );
    await updateActionStatus(action.id, "executing");
    const result = await handler(input, ctx);
    await updateActionStatus(
      action.id,
      result.success ? "completed" : "failed",
      result.data ?? { error: result.error }
    );
    return { ...result, actionId: action.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }
}

/**
 * Execute a previously approved action.
 */
export async function executeApprovedAction(
  actionId: string,
  toolName: ToolName,
  toolInput: Record<string, unknown>,
  ctx: ToolCallContext
): Promise<ToolCallResult> {
  const handler = handlers[toolName];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  await updateActionStatus(actionId, "executing");
  try {
    const result = await handler(toolInput, ctx);
    await updateActionStatus(
      actionId,
      result.success ? "completed" : "failed",
      result.data ?? { error: result.error }
    );
    return { ...result, actionId };
  } catch (err) {
    await updateActionStatus(actionId, "failed", {
      error: err instanceof Error ? err.message : "Execution failed",
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : "Execution failed",
    };
  }
}

/* ── Handler Implementations ─────────────────────────────────── */

async function handleGetProjectContext(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const parsed = projectContextSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid project_id" };
  }

  const database = await createServerLocalClient();
  const { data: project } = await database
    .from("projects").select("*").eq("id", parsed.data.project_id).single();

  if (!project) return { success: false, error: "Project not found" };

  const { data: cards } = await database
    .from("prompt_cards").select("id, title, category, status")
    .eq("project_id", parsed.data.project_id).limit(50);

  const { data: gens } = await database
    .from("generations").select("id, status, created_at")
    .eq("project_id", parsed.data.project_id).limit(50);

  return {
    success: true,
    data: {
      project_name: project.name,
      medium: project.medium ?? "unspecified",
      sonic_brief: project.sonic_brief ?? {},
      default_settings: project.default_settings ?? {},
      existing_prompt_cards: cards ?? [],
      existing_generated_sounds: gens ?? [],
      prompt_card_count: cards?.length ?? 0,
      generation_count: gens?.length ?? 0,
    },
  };
}

async function handleCreateCueList(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const parsed = cueListSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "scene_description is required" };
  }

  const events = breakdownScene(parsed.data.scene_description);
  return {
    success: true,
    data: {
      cue_count: events.length,
      cues: events.map((e, i) => ({
        cue_number: i + 1,
        title: e.title,
        category: e.category,
        generated_prompt: e.generatedPrompt,
        attributes: e.attributes,
      })),
    },
  };
}

async function handleCreateLayerPlan(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const parsed = layerPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "scene_description is required" };
  }

  const events = breakdownScene(parsed.data.scene_description);
  const layers = [
    { role: "foreground", description: "Primary sync sounds and hero moments" },
    { role: "body", description: "Core impact and movement sounds" },
    { role: "texture", description: "Surface detail and material character" },
    { role: "background", description: "Ambient bed and room tone" },
    { role: "sweetener", description: "Enhancement layers for depth and polish" },
  ];

  const assignedCues = events.map((e) => ({
    title: e.title,
    category: e.category,
    suggested_layer: e.category === "Ambience" ? "background" : "foreground",
    prompt: e.generatedPrompt,
  }));

  return {
    success: true,
    data: {
      scene: parsed.data.scene_description,
      medium: parsed.data.medium ?? "unspecified",
      style: parsed.data.style ?? "realistic",
      layers,
      assigned_cues: assignedCues,
      avoid: parsed.data.avoid,
      recommendations: [
        "Consider adding a room-tone or ambience bed layer",
        "Ensure foreground sync sounds leave room for dialogue if needed",
      ],
    },
  };
}

async function handleCreatePromptCard(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const parsed = createPromptCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const generatedPrompt = parsed.data.prompt_text;

  const database = await createServerLocalClient();
  const { data: card, error } = await database
    .from("prompt_cards")
    .insert({
      user_id: ctx.userId,
      title: parsed.data.title,
      category: parsed.data.category,
      subcategory: parsed.data.subcategory ?? null,
      duration_seconds: parsed.data.duration_seconds ?? null,
      loop: parsed.data.loop,
      prompt_influence: parsed.data.prompt_influence,
      model_id: "eleven_text_to_sound_v2",
      exclusions: parsed.data.exclusion_constraints,
      generated_prompt: generatedPrompt,
      project_id: parsed.data.project_id ?? ctx.projectId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      prompt_card_id: card.id,
      title: card.title,
      category: card.category,
      generated_prompt: card.generated_prompt,
      message: `Prompt card "${card.title}" created successfully.`,
    },
  };
}

async function handleCreatePromptCardsBatch(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const cardsInput = input.cards;
  if (!Array.isArray(cardsInput) || cardsInput.length === 0) {
    return { success: false, error: "cards array is required" };
  }

  const results = [];
  for (const cardInput of cardsInput.slice(0, 20)) {
    const result = await handleCreatePromptCard(cardInput as Record<string, unknown>, ctx);
    results.push(result);
  }

  const created = results.filter(r => r.success).length;
  return {
    success: true,
    data: {
      total_requested: cardsInput.length,
      total_created: created,
      results,
    },
  };
}

async function handleEstimateCost(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const parsed = estimateCostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid estimation parameters" };
  }

  const costPerGen = CREDIT_COSTS.sound_effects ?? 1;
  const totalGens = parsed.data.prompt_card_count * parsed.data.variation_count;
  const totalCredits = parsed.data.include_audio_generation ? totalGens * costPerGen : 0;

  return {
    success: true,
    data: {
      estimated_generations: totalGens,
      estimated_credits: totalCredits,
      cost_per_generation: costPerGen,
      prompt_card_count: parsed.data.prompt_card_count,
      variation_count: parsed.data.variation_count,
      includes_audio: parsed.data.include_audio_generation,
      requires_user_approval: parsed.data.include_audio_generation,
    },
  };
}

async function handleGenerateSfx(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  // This should only run after approval
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid generation parameters" };
  }

  // Load user profile for credit context
  const database = await createServerLocalClient();
  const { data: profile } = await database
    .from("profiles").select("plan, credits_remaining")
    .eq("id", ctx.userId).single();

  if (!profile) {
    return { success: false, error: "User profile not found" };
  }
  const effectiveProfile = applyLocalFullAccessToProfile({
    plan: profile.plan,
    credits_remaining: profile.credits_remaining,
    monthly_credit_limit: profile.credits_remaining,
  });

  // Execute real generation through operations layer
  const result = await executeGenerateSfx(
    {
      text: parsed.data.prompt_text,
      duration_seconds: parsed.data.duration_seconds,
      loop: parsed.data.loop,
      prompt_influence: parsed.data.prompt_influence,
    },
    {
      userId: ctx.userId,
      plan: effectiveProfile.plan,
      creditsRemaining: effectiveProfile.credits_remaining ?? 0,
      projectId: ctx.projectId,
      promptCardId: parsed.data.prompt_card_id,
    }
  );

  if (!result.success) {
    return {
      success: false,
      error: result.message,
    };
  }

  return {
    success: true,
    data: {
      generation_id: result.generationId,
      audio_url: result.audioUrl,
      character_cost: result.characterCost,
      credits_remaining: result.creditsRemaining,
      is_mock: result.isMock,
      message: `Sound generated successfully. Generation ID: ${result.generationId}`,
    },
  };
}

async function handleGenerateVariationBatch(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const sourceText = typeof input.source_prompt === "string" ? input.source_prompt : "";
  const count = typeof input.count === "number" ? Math.min(input.count, 10) : 4;

  if (!sourceText) {
    return { success: false, error: "source_prompt is required for variation batch" };
  }

  try {
    await enforceGenerationPolicy({ id: ctx.userId }, {
      kind: "sfx",
      requestedCount: count,
    });
  } catch (error) {
    if (error instanceof GenerationPolicyError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  // Load user profile for credit context
  const database = await createServerLocalClient();
  const { data: profile } = await database
    .from("profiles").select("plan, credits_remaining")
    .eq("id", ctx.userId).single();

  if (!profile) {
    return { success: false, error: "User profile not found" };
  }
  const effectiveProfile = applyLocalFullAccessToProfile({
    plan: profile.plan,
    credits_remaining: profile.credits_remaining,
    monthly_credit_limit: profile.credits_remaining,
  });

  // Generate variations sequentially through the operations layer
  const results: Array<{ generationId: string; audioUrl: string } | { error: string }> = [];
  let creditsRemaining = effectiveProfile.credits_remaining ?? 0;

  for (let i = 0; i < count; i++) {
    // Slight prompt variation by adding variation index context
    const variantText = `${sourceText} (variation ${i + 1} of ${count})`;
    const result = await executeGenerateSfx(
      { text: variantText },
      {
        userId: ctx.userId,
        plan: effectiveProfile.plan,
        creditsRemaining,
        projectId: ctx.projectId,
      }
    );

    if (result.success) {
      results.push({ generationId: result.generationId, audioUrl: result.audioUrl });
      creditsRemaining = result.creditsRemaining;
    } else {
      results.push({ error: result.message });
      break; // Stop on first failure (likely credit or API issue)
    }
  }

  const succeeded = results.filter(r => "generationId" in r).length;
  return {
    success: true,
    data: {
      message: `Generated ${succeeded} of ${count} variations.`,
      variation_count: succeeded,
      total_requested: count,
      results,
      credits_remaining: creditsRemaining,
    },
  };
}

async function handleCreateFoleySet(
  input: Record<string, unknown>,
  _ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const description = typeof input.description === "string" ? input.description : "";
  const events = breakdownScene(description);
  const foleyEvents = events.filter(e =>
    ["Footsteps", "Foley", "Door", "Water"].includes(e.category)
  );

  return {
    success: true,
    data: {
      foley_cues: foleyEvents.length,
      cues: foleyEvents.map((e, i) => ({
        cue_number: i + 1,
        title: e.title,
        category: e.category,
        prompt: e.generatedPrompt,
      })),
    },
  };
}

async function handleCreateAtmospherePlan(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const description = typeof input.description === "string" ? input.description : "";
  return {
    success: true,
    data: {
      layers: [
        { role: "bed", description: `Ambient foundation for: ${description}`, loop: true },
        { role: "detail", description: "Intermittent environmental details", loop: false },
        { role: "sweetener", description: "Subtle texture enhancement", loop: true },
      ],
      recommendation: "Use 2-3 layered loops for a rich atmosphere bed.",
    },
  };
}

async function handleCreateUiSoundSet(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const platform = typeof input.platform === "string" ? input.platform : "web";
  return {
    success: true,
    data: {
      platform,
      suggested_sounds: [
        { name: "click", duration: 0.1, description: "Button click / tap" },
        { name: "hover", duration: 0.05, description: "Hover state" },
        { name: "success", duration: 0.5, description: "Confirmation / success" },
        { name: "error", duration: 0.3, description: "Error / warning" },
        { name: "notification", duration: 0.8, description: "Alert notification" },
        { name: "toggle_on", duration: 0.15, description: "Toggle switch on" },
        { name: "toggle_off", duration: 0.15, description: "Toggle switch off" },
      ],
    },
  };
}

async function handleCreateHumanCreatureSet(
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  const type = typeof input.type === "string" ? input.type : "human";
  return {
    success: true,
    data: {
      type,
      suggested_expressions: type === "creature"
        ? ["growl", "hiss", "screech", "purr", "roar", "whimper"]
        : ["breath", "sigh", "gasp", "whisper", "laugh", "scream", "cry"],
      recommendation: "Create 3-5 variations of each expression for natural variety.",
    },
  };
}

async function handleAnalyzeReference(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const referenceId = typeof input.reference_upload_id === "string" ? input.reference_upload_id : null;
  if (!referenceId) {
    return {
      success: false,
      error: "reference_upload_id is required. Upload audio in Listen Mode first.",
    };
  }

  // Invoke the listen-mode analysis logic directly
  const database = await createServerLocalClient();
  const { data: ref } = await database
    .from("reference_uploads").select("*").eq("id", referenceId).single();

  if (!ref || ref.user_id !== ctx.userId) {
    return { success: false, error: "Reference upload not found" };
  }

  return {
    success: true,
    data: {
      reference_id: ref.id,
      filename: ref.filename,
      message: `Reference "${ref.filename}" loaded. Use the analyze endpoint for full analysis.`,
      listen_mode_url: "/dashboard/listen",
    },
  };
}

async function handlePrepareExportPlan(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const format = typeof input.format === "string" ? input.format : "cue_sheet";

  const database = await createServerLocalClient();
  const { data: cards } = await database
    .from("prompt_cards").select("*")
    .eq("user_id", ctx.userId)
    .limit(100);

  const cueSheet = buildCueSheet(cards ?? [], "PRJ");

  return {
    success: true,
    data: {
      format,
      total_cards: cards?.length ?? 0,
      cue_sheet_entries: cueSheet.length,
      export_url: "/dashboard/export",
      message: `Export plan prepared with ${cueSheet.length} cue entries. Visit Export Center to download.`,
    },
  };
}

async function handleCreateDawPack(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const format = typeof input.format === "string" ? input.format : "reaper";

  // Load user's prompt cards and build a cue sheet for export
  const database = await createServerLocalClient();
  const { data: cards } = await database
    .from("prompt_cards").select("*")
    .eq("user_id", ctx.userId)
    .limit(200);

  const cueSheet = buildCueSheet(cards ?? []);

  return {
    success: true,
    data: {
      format,
      cue_entries: cueSheet.length,
      message: `DAW handoff pack prepared with ${cueSheet.length} cue entries (${format} format). Visit Export Center to download.`,
      export_url: "/dashboard/export",
    },
  };
}

async function handleCreateGameManifest(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const engine = typeof input.engine === "string" ? input.engine : "unity";

  // Load user's prompt cards and build a game manifest
  const database = await createServerLocalClient();
  const { data: cards } = await database
    .from("prompt_cards").select("*")
    .eq("user_id", ctx.userId)
    .limit(200);

  // Build game audio events from prompt cards
  const events: import("@/lib/sfx/export-taxonomy").GameAudioEvent[] = (cards ?? []).map((card: Record<string, unknown>) => ({
    event: String(card.title ?? "untitled").replace(/\s+/g, "_").toLowerCase(),
    category: String(card.category ?? "sfx"),
    type: "single" as const,
    randomization: false,
    variations: [{
      file: `audio/${String(card.category ?? "sfx")}/${String(card.title ?? "untitled").replace(/\s+/g, "_")}.mp3`,
    }],
    metadata: {},
  }));

  const manifest = buildGameAudioManifest("Algophony Studio Project", engine as import("@/lib/sfx/export-taxonomy").GameEngine, events);

  return {
    success: true,
    data: {
      engine,
      event_count: manifest.events?.length ?? 0,
      message: `Game audio manifest for ${engine} generated with ${manifest.events?.length ?? 0} events. Visit Export Center to download.`,
      export_url: "/dashboard/export",
    },
  };
}

async function handleGetUsageSummary(
  input: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<ToolCallResult> {
  const database = await createServerLocalClient();
  const { data: profile } = await database
    .from("profiles").select("plan, credits_remaining, monthly_credit_limit")
    .eq("id", ctx.userId).single();

  const { count: genCount } = await database
    .from("generations").select("*", { count: "exact", head: true })
    .eq("user_id", ctx.userId);

  const { count: cardCount } = await database
    .from("prompt_cards").select("*", { count: "exact", head: true })
    .eq("user_id", ctx.userId);

  const effectiveProfile = applyLocalFullAccessToProfile({
    plan: profile?.plan ?? "free",
    credits_remaining: profile?.credits_remaining ?? 0,
    monthly_credit_limit: profile?.monthly_credit_limit ?? 3,
  });

  return {
    success: true,
    data: {
      plan: effectiveProfile.plan,
      credits_remaining: effectiveProfile.credits_remaining ?? 0,
      monthly_limit: effectiveProfile.monthly_credit_limit ?? 3,
      total_generations: genCount ?? 0,
      total_prompt_cards: cardCount ?? 0,
    },
  };
}
