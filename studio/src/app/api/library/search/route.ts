import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { createServerLocalClient } from "@/lib/local/db-client";
import { ownOrSeedOr, escapeLikePattern } from "@/lib/local/repositories/filters";
import { logger } from "@/lib/logger";

const SEARCHABLE_COLUMNS = {
  prompts: ["title", "generated_prompt", "category"],
  sounds: ["request_payload"],
  references: ["filename"],
  packs: ["name", "description"],
} as const;

function withCacheHeaders(body: object): NextResponse {
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return res;
}

function applyTextSearch<Q extends { or: (clause: string) => Q; ilike: (col: string, pattern: string) => Q }>(
  query: Q,
  q: string,
  cols: readonly string[],
): Q {
  const safe = escapeLikePattern(q.trim());
  if (!safe) return query;
  if (cols.length === 1) return query.ilike(cols[0], `%${safe}%`);
  return query.or(cols.map((c) => `${c}.ilike.%${safe}%`).join(","));
}

export async function GET(request: NextRequest) {
  try {
    let profile;
    try { profile = await requireProfile(); }
    catch (err) { if (err instanceof AuthError) return unauthorizedResponse(err.message); throw err; }

    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") ?? "prompts";
    const project = url.searchParams.get("project");
    const category = url.searchParams.get("category");
    const apiRoute = url.searchParams.get("api_route");
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim() ?? "";
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);

    const database = await createServerLocalClient();

    if (tab === "prompts" || tab === "favorites" || tab === "rejected" || tab === "needs_retry") {
      let query = database.from("prompt_cards").select("*")
        .or(ownOrSeedOr(profile.id))
        .order("created_at", { ascending: false }).limit(limit + 1);

      if (tab === "favorites") query = query.eq("status", "favorite");
      if (tab === "rejected") query = query.in("status", ["bad_result", "rejected"]);
      if (tab === "needs_retry") query = query.eq("status", "needs_retry");
      if (project) query = query.eq("project_id", project);
      if (category) query = query.eq("category", category);
      if (apiRoute) query = query.eq("api_route", apiRoute);
      if (status) query = query.eq("status", status);
      if (cursor) query = query.lt("created_at", cursor);
      if (q) query = applyTextSearch(query, q, SEARCHABLE_COLUMNS.prompts);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const results = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? results[results.length - 1].created_at : null;
      return withCacheHeaders({ tab, results, nextCursor });
    }

    if (tab === "sounds") {
      let query = database.from("generations").select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }).limit(limit + 1);

      if (project) query = query.eq("project_id", project);
      if (apiRoute) query = query.eq("api_route", apiRoute);
      if (cursor) query = query.lt("created_at", cursor);
      // Sound rows expose the user's prompt under request_payload->>'text'.
      // PostgREST supports filtering on json keys via the arrow operator.
      if (q) query = query.ilike("request_payload->>text", `%${escapeLikePattern(q)}%`);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const results = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? results[results.length - 1].created_at : null;
      return withCacheHeaders({ tab, results, nextCursor });
    }

    if (tab === "references") {
      let query = database.from("reference_uploads").select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }).limit(limit + 1);

      if (project) query = query.eq("project_id", project);
      if (cursor) query = query.lt("created_at", cursor);
      if (q) query = applyTextSearch(query, q, SEARCHABLE_COLUMNS.references);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const results = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? results[results.length - 1].created_at : null;
      return withCacheHeaders({ tab, results, nextCursor });
    }

    if (tab === "packs") {
      let query = database.from("prompt_packs").select("*")
        .order("created_at", { ascending: false }).limit(limit + 1);
      if (cursor) query = query.lt("created_at", cursor);
      if (q) query = applyTextSearch(query, q, SEARCHABLE_COLUMNS.packs);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const results = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? results[results.length - 1].created_at : null;
      return withCacheHeaders({ tab, results, nextCursor });
    }

    return NextResponse.json({ tab, results: [], nextCursor: null });
  } catch (error) {
    logger.error({ err: error }, "[library/search] internal error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
