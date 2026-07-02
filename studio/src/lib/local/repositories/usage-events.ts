/**
 * Algophony Studio — Usage Events Service
 *
 * Server-side logging for local generation operations.
 */

import { createServiceLocalClient } from "@/lib/local/db-client";
import { logger } from "@/lib/logger";

export interface UsageEventInput {
  userId: string;
  projectId?: string | null;
  generatedSoundId?: string | null;
  apiRoute: string;
  modelId?: string | null;
  requestId?: string | null;
  characterCost?: number | null;
  outputFormat?: string | null;
  appCreditCost: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log a usage event after a successful provider operation.
 * Uses service client to bypass RLS.
 */
export async function logUsageEvent(input: UsageEventInput): Promise<void> {
  const database = createServiceLocalClient();

  const { error } = await database.from("usage_events").insert({
    user_id: input.userId,
    project_id: input.projectId ?? null,
    generated_sound_id: input.generatedSoundId ?? null,
    api_route: input.apiRoute,
    model_id: input.modelId ?? null,
    request_id: input.requestId ?? null,
    character_cost: input.characterCost ?? null,
    output_format: input.outputFormat ?? null,
    app_credit_cost: input.appCreditCost,
    metadata: input.metadata ?? {},
  });

  if (error) {
    logger.error({ err: error.message }, "[usage-events] failed to log usage event");
    // Non-fatal: don't throw, usage logging should not block the main flow
  }
}

/**
 * Get usage events for a user, optionally filtered by project.
 */
export async function getUserUsageEvents(
  userId: string,
  opts: { projectId?: string; limit?: number } = {}
) {
  const database = createServiceLocalClient();

  let query = database
    .from("usage_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.projectId) {
    query = query.eq("project_id", opts.projectId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load usage events: ${error.message}`);
  return data ?? [];
}

/**
 * Aggregate usage stats for a user.
 */
export async function getUserUsageStats(userId: string) {
  const events = await getUserUsageEvents(userId, { limit: 1000 });

  const byRoute: Record<string, { count: number; totalCredits: number; totalCharCost: number }> = {};
  let totalGenerations = 0;
  let totalCharCost = 0;
  // Note: favorites/rejected counts come from evaluations, not usage events
  const totalFavorites = 0;
  const totalRejected = 0;

  for (const e of events) {
    const route = e.api_route || "unknown";
    if (!byRoute[route]) {
      byRoute[route] = { count: 0, totalCredits: 0, totalCharCost: 0 };
    }
    byRoute[route].count++;
    byRoute[route].totalCredits += e.app_credit_cost ?? 0;
    byRoute[route].totalCharCost += Number(e.character_cost ?? 0);
    totalGenerations++;
    totalCharCost += Number(e.character_cost ?? 0);
  }

  return {
    totalGenerations,
    totalFavorites,
    totalRejected,
    totalCharCost,
    averageCharCost: totalGenerations > 0 ? totalCharCost / totalGenerations : 0,
    byRoute,
  };
}
