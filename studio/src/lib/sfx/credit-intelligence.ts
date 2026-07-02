/**
 * Algophony Studio — Credit Intelligence
 *
 * Analytics engine for cost visibility. Aggregates usage data from
 * usage_events and generations tables to provide per-project, per-route,
 * per-verdict, and per-batch credit breakdowns.
 */

import { createServiceLocalClient } from "@/lib/local/db-client";
import { getCreditCost } from "@/lib/sfx/credits";

// ── Per-Project ──────────────────────────────────────────────

export interface ProjectCredits {
  projectId: string;
  projectName: string;
  totalCredits: number;
  generationCount: number;
  avgCostPerSound: number;
  favoriteCount: number;
}

export async function getCreditsByProject(userId: string): Promise<ProjectCredits[]> {
  const database = createServiceLocalClient();

  const { data: events } = await database
    .from("usage_events")
    .select("project_id, app_credit_cost")
    .eq("user_id", userId);

  const { data: projects } = await database
    .from("projects")
    .select("id, name")
    .eq("user_id", userId);

  const { data: generations } = await database
    .from("generations")
    .select("project_id, user_verdict")
    .eq("user_id", userId);

  const projectMap = new Map<string, string>();
  for (const p of projects ?? []) {
    projectMap.set(p.id, p.name ?? "Untitled");
  }

  const agg = new Map<string, { credits: number; count: number; favorites: number }>();

  for (const e of events ?? []) {
    const pid = e.project_id ?? "__unassigned";
    const entry = agg.get(pid) ?? { credits: 0, count: 0, favorites: 0 };
    entry.credits += e.app_credit_cost ?? 0;
    entry.count++;
    agg.set(pid, entry);
  }

  for (const g of generations ?? []) {
    const pid = g.project_id ?? "__unassigned";
    const entry = agg.get(pid);
    if (entry && g.user_verdict === "favorite") {
      entry.favorites++;
    }
  }

  return Array.from(agg.entries()).map(([pid, data]) => ({
    projectId: pid,
    projectName: pid === "__unassigned" ? "Unassigned" : (projectMap.get(pid) ?? "Unknown"),
    totalCredits: data.credits,
    generationCount: data.count,
    avgCostPerSound: data.count > 0 ? Math.round((data.credits / data.count) * 100) / 100 : 0,
    favoriteCount: data.favorites,
  })).sort((a, b) => b.totalCredits - a.totalCredits);
}

// ── Per-API-Family ───────────────────────────────────────────

export interface RouteCredits {
  apiRoute: string;
  totalCredits: number;
  generationCount: number;
  totalCharacterCost: number;
  avgCharPerGeneration: number;
}

export async function getCreditsByApiFamily(userId: string): Promise<RouteCredits[]> {
  const database = createServiceLocalClient();

  const { data: events } = await database
    .from("usage_events")
    .select("api_route, app_credit_cost, character_cost")
    .eq("user_id", userId);

  const agg = new Map<string, { credits: number; count: number; chars: number }>();

  for (const e of events ?? []) {
    const route = e.api_route ?? "unknown";
    const entry = agg.get(route) ?? { credits: 0, count: 0, chars: 0 };
    entry.credits += e.app_credit_cost ?? 0;
    entry.count++;
    entry.chars += Number(e.character_cost ?? 0);
    agg.set(route, entry);
  }

  return Array.from(agg.entries()).map(([route, data]) => ({
    apiRoute: route,
    totalCredits: data.credits,
    generationCount: data.count,
    totalCharacterCost: data.chars,
    avgCharPerGeneration: data.count > 0 ? Math.round(data.chars / data.count) : 0,
  })).sort((a, b) => b.totalCredits - a.totalCredits);
}

// ── Per-Verdict Economics ────────────────────────────────────

export interface VerdictCredits {
  verdict: string;
  count: number;
  totalCredits: number;
  avgCost: number;
}

export async function getCostPerVerdict(userId: string): Promise<VerdictCredits[]> {
  const database = createServiceLocalClient();

  const { data: generations } = await database
    .from("generations")
    .select("user_verdict, app_credit_cost")
    .eq("user_id", userId)
    .not("user_verdict", "is", null);

  const agg = new Map<string, { count: number; credits: number }>();

  for (const g of generations ?? []) {
    const verdict = g.user_verdict ?? "unrated";
    const entry = agg.get(verdict) ?? { count: 0, credits: 0 };
    entry.count++;
    entry.credits += g.app_credit_cost ?? 0;
    agg.set(verdict, entry);
  }

  return Array.from(agg.entries()).map(([verdict, data]) => ({
    verdict,
    count: data.count,
    totalCredits: data.credits,
    avgCost: data.count > 0 ? Math.round((data.credits / data.count) * 100) / 100 : 0,
  }));
}

// ── Favorite-to-Credit Ratio ─────────────────────────────────

export interface FavoriteRatio {
  totalCreditsSpent: number;
  totalGenerations: number;
  favoriteCount: number;
  /** Favorites per credit spent */
  ratio: number;
  /** Credits spent per favorite */
  costPerFavorite: number;
}

export async function getFavoriteToCrediteRatio(userId: string): Promise<FavoriteRatio> {
  const database = createServiceLocalClient();

  const { data: events } = await database
    .from("usage_events")
    .select("app_credit_cost")
    .eq("user_id", userId);

  const { count: favoriteCount } = await database
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("user_verdict", "favorite");

  const totalCredits = (events ?? []).reduce(
    (sum: number, e: { app_credit_cost?: number | null }) => sum + (e.app_credit_cost ?? 0),
    0,
  );
  const totalGens = events?.length ?? 0;
  const favs = favoriteCount ?? 0;

  return {
    totalCreditsSpent: totalCredits,
    totalGenerations: totalGens,
    favoriteCount: favs,
    ratio: totalCredits > 0 ? Math.round((favs / totalCredits) * 1000) / 1000 : 0,
    costPerFavorite: favs > 0 ? Math.round((totalCredits / favs) * 100) / 100 : 0,
  };
}

// ── Pre-Generation Cost Estimate ─────────────────────────────

export interface CostEstimate {
  apiRoute: string;
  creditCost: number;
  estimatedCharacters: number;
  modelCostFactor: number;
  effectiveCost: number;
  canAfford: boolean;
  creditsRemaining: number;
}

export function estimateGenerationCost(
  apiRoute: string,
  promptLength: number,
  creditsRemaining: number,
  modelCostFactor = 1.0
): CostEstimate {
  const baseCost = getCreditCost(apiRoute);
  const effectiveCost = Math.ceil(baseCost * modelCostFactor);

  return {
    apiRoute,
    creditCost: baseCost,
    estimatedCharacters: promptLength,
    modelCostFactor,
    effectiveCost,
    canAfford: creditsRemaining >= effectiveCost,
    creditsRemaining,
  };
}

// ── Full Intelligence Report ─────────────────────────────────

export interface CreditIntelligenceReport {
  projects: ProjectCredits[];
  routes: RouteCredits[];
  verdicts: VerdictCredits[];
  favoriteRatio: FavoriteRatio;
  generatedAt: string;
}

export async function getFullCreditIntelligence(userId: string): Promise<CreditIntelligenceReport> {
  const [projects, routes, verdicts, favoriteRatio] = await Promise.all([
    getCreditsByProject(userId),
    getCreditsByApiFamily(userId),
    getCostPerVerdict(userId),
    getFavoriteToCrediteRatio(userId),
  ]);

  return {
    projects,
    routes,
    verdicts,
    favoriteRatio,
    generatedAt: new Date().toISOString(),
  };
}
