import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/current-user";
import { localOnly } from "@/lib/local/request";
import { recommendSoundAssetsForLayers } from "@/lib/local/sound-assets";
import {
  FREQUENCY_ROLES,
  STACKER_LAYER_TYPES,
} from "@/lib/sfx/stacker-taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const layerSchema = z.object({
  id: z.string().optional(),
  layerType: z.enum(STACKER_LAYER_TYPES).optional(),
  frequencyRole: z.enum(FREQUENCY_ROLES).optional(),
  promptText: z.string().max(4000).optional(),
  durationSeconds: z.number().min(0.1).max(120).optional(),
});

const recommendSchema = z.object({
  cueDescription: z.string().max(8000).optional(),
  layers: z.array(layerSchema).max(24).optional(),
  limit: z.number().int().min(1).max(12).optional(),
});

export async function POST(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = recommendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recommendation request", details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
      { status: 422 },
    );
  }

  const profile = await requireProfile();
  const result = await recommendSoundAssetsForLayers(profile.id, parsed.data);
  return NextResponse.json(result);
}
