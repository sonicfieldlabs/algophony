import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/current-user";
import { localOnly } from "@/lib/local/request";
import { searchSoundAssets, type UnifiedSoundSource } from "@/lib/local/sound-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const profile = await requireProfile();
  const source = parseSource(request.nextUrl.searchParams.get("source"));
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const assets = await searchSoundAssets(profile.id, {
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    source,
    limit,
  });

  return NextResponse.json({ assets });
}

function parseSource(value: string | null): UnifiedSoundSource | "all" {
  if (value === "imported" || value === "generated") return value;
  return "all";
}
