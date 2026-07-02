/**
 * Algophony Studio — Supervisor Tool Access
 *
 * Maps each supervisor server tool to the entitlement required to execute it.
 * Keep this separate from UI gating so API routes and tests share the same
 * tier rules.
 */

import type { EntitlementKey } from "@/lib/sfx/entitlements";
import type { ToolName } from "./types";

export const SUPERVISOR_TOOL_ENTITLEMENTS: Record<ToolName, EntitlementKey> = {
  get_project_context: "supervisor_tools",
  create_sound_cue_list: "supervisor_tools",
  create_layer_plan: "supervisor_tools",
  create_prompt_card: "supervisor_tools",
  estimate_generation_cost: "supervisor_tools",
  generate_sfx_from_prompt_card: "supervisor_tools",
  create_foley_set: "supervisor_tools",
  create_atmosphere_plan: "supervisor_tools",
  create_ui_sound_set: "supervisor_tools",
  create_human_or_creature_set: "supervisor_tools",
  get_usage_summary: "supervisor_tools",

  create_prompt_cards_batch: "batch_prompt_generation",
  generate_variation_batch: "batch_prompt_generation",
  analyze_reference_audio: "sonic_dna_profiles",
  prepare_export_plan: "export_metadata",

  create_daw_handoff_pack: "supervisor_advanced",
  create_game_audio_manifest: "supervisor_advanced",
};

export function getRequiredEntitlementForTool(toolName: ToolName): EntitlementKey {
  return SUPERVISOR_TOOL_ENTITLEMENTS[toolName];
}
