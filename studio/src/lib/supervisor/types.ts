/**
 * Algophony Studio — Agent Types
 *
 * Core type definitions for the Wilhelm Agent.
 */

/* ── Supervisor Session ──────────────────────────────────────── */

export type SupervisorMode = "supervisor" | "quick";
export type SessionStatus = "active" | "ended" | "expired";

export interface SupervisorSession {
  id: string;
  user_id: string;
  project_id: string | null;
  conversation_id: string | null;
  mode: SupervisorMode;
  page_context: string | null;
  status: SessionStatus;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* ── Supervisor Action ───────────────────────────────────────── */

export type ActionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rejected";

export interface SupervisorAction {
  id: string;
  user_id: string;
  project_id: string | null;
  session_id: string;
  action_type: string;
  tool_name: string | null;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  approval_required: boolean;
  approved: boolean | null;
  status: ActionStatus;
  created_at: string;
  completed_at: string | null;
}

/* ── Supervisor Suggestion ───────────────────────────────────── */

export type SuggestionType =
  | "cue_list"
  | "layer_plan"
  | "prompt_card"
  | "variation"
  | "export"
  | "other";

export type SuggestionStatus = "pending" | "accepted" | "dismissed" | "expired";

export interface SupervisorSuggestion {
  id: string;
  user_id: string;
  project_id: string | null;
  session_id: string;
  suggestion_type: SuggestionType;
  title: string | null;
  description: string | null;
  payload: Record<string, unknown>;
  status: SuggestionStatus;
  created_at: string;
}

/* ── Tool Names ──────────────────────────────────────────────── */

export type ToolName =
  | "get_project_context"
  | "create_sound_cue_list"
  | "create_layer_plan"
  | "create_prompt_card"
  | "create_prompt_cards_batch"
  | "estimate_generation_cost"
  | "generate_sfx_from_prompt_card"
  | "generate_variation_batch"
  | "create_foley_set"
  | "create_atmosphere_plan"
  | "create_ui_sound_set"
  | "create_human_or_creature_set"
  | "analyze_reference_audio"
  | "prepare_export_plan"
  | "create_daw_handoff_pack"
  | "create_game_audio_manifest"
  | "get_usage_summary";

/** All valid tool names */
export const TOOL_NAMES: readonly ToolName[] = [
  "get_project_context",
  "create_sound_cue_list",
  "create_layer_plan",
  "create_prompt_card",
  "create_prompt_cards_batch",
  "estimate_generation_cost",
  "generate_sfx_from_prompt_card",
  "generate_variation_batch",
  "create_foley_set",
  "create_atmosphere_plan",
  "create_ui_sound_set",
  "create_human_or_creature_set",
  "analyze_reference_audio",
  "prepare_export_plan",
  "create_daw_handoff_pack",
  "create_game_audio_manifest",
  "get_usage_summary",
] as const;

export function isValidToolName(name: string): name is ToolName {
  return TOOL_NAMES.includes(name as ToolName);
}

/* ── Approval Policy ─────────────────────────────────────────── */

export type ApprovalLevel = "auto" | "requires_approval";

/* ── Chat Messages ───────────────────────────────────────────── */

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCall?: {
    toolName: ToolName;
    status: ActionStatus;
    actionId?: string;
  };
}

/* ── Tool Call Context ───────────────────────────────────────── */

export interface ToolCallContext {
  userId: string;
  sessionId: string;
  projectId: string | null;
  userPlan: string;
}

export interface ToolCallResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  actionId?: string;
  requiresApproval?: boolean;
}
