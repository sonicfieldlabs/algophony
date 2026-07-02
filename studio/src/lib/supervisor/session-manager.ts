/**
 * Algophony Studio — Supervisor Session Manager
 *
 * CRUD operations for supervisor sessions, actions, and suggestions.
 * All operations use the service local database client for server-side access.
 */

import { createServerLocalClient } from "@/lib/local/db-client";
import type {
  SupervisorSession,
  SupervisorAction,
  SupervisorSuggestion,
  SupervisorMode,
  ActionStatus,
  SuggestionType,
  SuggestionStatus,
} from "./types";

/* ── Sessions ────────────────────────────────────────────────── */

export async function createSession(
  userId: string,
  projectId: string | null,
  mode: SupervisorMode,
  pageContext: string | null
): Promise<SupervisorSession> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_sessions")
    .insert({
      user_id: userId,
      project_id: projectId,
      mode,
      page_context: pageContext,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data as SupervisorSession;
}

export async function getSession(sessionId: string): Promise<SupervisorSession | null> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) return null;
  return data as SupervisorSession;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<SupervisorSession, "mode" | "status" | "summary" | "conversation_id" | "metadata">>
): Promise<SupervisorSession> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update session: ${error.message}`);
  return data as SupervisorSession;
}

export async function endSession(
  sessionId: string,
  summary?: string
): Promise<SupervisorSession> {
  return updateSession(sessionId, {
    status: "ended",
    summary: summary ?? null,
  });
}

export async function listActiveSessions(userId: string): Promise<SupervisorSession[]> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  return (data ?? []) as SupervisorSession[];
}

export async function listRecentSessions(
  userId: string,
  limit = 20
): Promise<SupervisorSession[]> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  return (data ?? []) as SupervisorSession[];
}

/* ── Actions ─────────────────────────────────────────────────── */

export async function createAction(
  userId: string,
  sessionId: string,
  projectId: string | null,
  actionType: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  approvalRequired: boolean
): Promise<SupervisorAction> {
  const database = await createServerLocalClient();
  const status: ActionStatus = approvalRequired ? "pending_approval" : "draft";

  const { data, error } = await database
    .from("supervisor_actions")
    .insert({
      user_id: userId,
      session_id: sessionId,
      project_id: projectId,
      action_type: actionType,
      tool_name: toolName,
      tool_input: toolInput,
      approval_required: approvalRequired,
      status,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create action: ${error.message}`);
  return data as SupervisorAction;
}

export async function getAction(actionId: string): Promise<SupervisorAction | null> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_actions")
    .select("*")
    .eq("id", actionId)
    .single();

  if (error) return null;
  return data as SupervisorAction;
}

export async function approveAction(
  actionId: string,
  userId: string
): Promise<SupervisorAction> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_actions")
    .update({
      approved: true,
      status: "approved" as ActionStatus,
    })
    .eq("id", actionId)
    .eq("user_id", userId)
    .eq("status", "pending_approval")
    .select()
    .single();

  if (error) throw new Error(`Failed to approve action: ${error.message}`);
  return data as SupervisorAction;
}

export async function rejectAction(
  actionId: string,
  userId: string
): Promise<SupervisorAction> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_actions")
    .update({
      approved: false,
      status: "rejected" as ActionStatus,
    })
    .eq("id", actionId)
    .eq("user_id", userId)
    .eq("status", "pending_approval")
    .select()
    .single();

  if (error) throw new Error(`Failed to reject action: ${error.message}`);
  return data as SupervisorAction;
}

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
  toolOutput?: Record<string, unknown>
): Promise<SupervisorAction> {
  const database = await createServerLocalClient();
  const updates: Record<string, unknown> = { status };
  if (toolOutput) updates.tool_output = toolOutput;
  if (status === "completed" || status === "failed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await database
    .from("supervisor_actions")
    .update(updates)
    .eq("id", actionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update action: ${error.message}`);
  return data as SupervisorAction;
}

export async function listSessionActions(
  sessionId: string
): Promise<SupervisorAction[]> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_actions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list actions: ${error.message}`);
  return (data ?? []) as SupervisorAction[];
}

export async function listPendingApprovals(
  userId: string
): Promise<SupervisorAction[]> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list pending approvals: ${error.message}`);
  return (data ?? []) as SupervisorAction[];
}

/* ── Suggestions ─────────────────────────────────────────────── */

export async function createSuggestion(
  userId: string,
  sessionId: string,
  projectId: string | null,
  suggestionType: SuggestionType,
  title: string,
  description: string,
  payload: Record<string, unknown>
): Promise<SupervisorSuggestion> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_suggestions")
    .insert({
      user_id: userId,
      session_id: sessionId,
      project_id: projectId,
      suggestion_type: suggestionType,
      title,
      description,
      payload,
      status: "pending" as SuggestionStatus,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create suggestion: ${error.message}`);
  return data as SupervisorSuggestion;
}

export async function updateSuggestionStatus(
  suggestionId: string,
  userId: string,
  status: SuggestionStatus
): Promise<SupervisorSuggestion> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_suggestions")
    .update({ status })
    .eq("id", suggestionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update suggestion: ${error.message}`);
  return data as SupervisorSuggestion;
}

export async function listSessionSuggestions(
  sessionId: string
): Promise<SupervisorSuggestion[]> {
  const database = await createServerLocalClient();
  const { data, error } = await database
    .from("supervisor_suggestions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list suggestions: ${error.message}`);
  return (data ?? []) as SupervisorSuggestion[];
}
