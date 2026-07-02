/**
 * Algophony Studio — Supervisor Approval Policy
 *
 * Centralized rules defining which supervisor tools require
 * user approval before execution.
 */

import type { ToolName, ApprovalLevel } from "./types";

/**
 * Maps each supervisor tool to its approval requirement.
 *
 * - "auto": tool runs immediately, result logged
 * - "requires_approval": action created in pending_approval state,
 *   user must approve before execution
 */
export const APPROVAL_POLICY: Record<ToolName, ApprovalLevel> = {
  /* ── Read-only / Planning ─────────────────────────── */
  get_project_context:          "auto",
  create_sound_cue_list:        "auto",
  create_layer_plan:            "auto",
  create_prompt_card:           "auto",
  create_prompt_cards_batch:    "auto",
  estimate_generation_cost:     "auto",
  create_foley_set:             "auto",
  create_atmosphere_plan:       "auto",
  create_ui_sound_set:          "auto",
  create_human_or_creature_set: "auto",
  analyze_reference_audio:      "auto",
  prepare_export_plan:          "auto",
  get_usage_summary:            "auto",

  /* ── Credit-spending / Destructive ────────────────── */
  generate_sfx_from_prompt_card: "requires_approval",
  generate_variation_batch:      "requires_approval",
  create_daw_handoff_pack:       "requires_approval",
  create_game_audio_manifest:    "requires_approval",
};

/**
 * Check whether a tool requires user approval.
 */
export function requiresApproval(toolName: ToolName): boolean {
  return APPROVAL_POLICY[toolName] === "requires_approval";
}

/**
 * Get a human-readable description of why approval is needed.
 */
export function getApprovalReason(toolName: ToolName): string | null {
  switch (toolName) {
    case "generate_sfx_from_prompt_card":
      return "This action will generate audio and consume credits.";
    case "generate_variation_batch":
      return "This action will generate multiple audio variations and consume credits.";
    case "create_daw_handoff_pack":
      return "This action will create a DAW export pack from generated sounds.";
    case "create_game_audio_manifest":
      return "This action will create a game audio manifest from generated sounds.";
    default:
      return null;
  }
}
