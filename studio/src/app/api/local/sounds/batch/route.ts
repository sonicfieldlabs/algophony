import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { localOnly } from "@/lib/local/request";
import {
  FREQUENCY_ROLES,
  STACKER_LAYER_TYPES,
} from "@/lib/sfx/stacker-taxonomy";
import {
  batchUpdateLocalSounds,
  createLocalSoundAudioUrl,
  promptFromSound,
  summarizeLibrary,
} from "@/lib/local/sound-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const soundEditSchema = z.object({
  favorite: z.boolean().optional(),
  title: z.string().max(240).nullable().optional(),
  prompt: z.string().max(8000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  subcategory: z.string().max(120).nullable().optional(),
  action: z.string().max(160).nullable().optional(),
  material: z.string().max(160).nullable().optional(),
  mood: z.string().max(160).nullable().optional(),
  acousticSpace: z.string().max(160).nullable().optional(),
  layerType: z.enum(STACKER_LAYER_TYPES).nullable().optional(),
  frequencyRole: z.enum(FREQUENCY_ROLES).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  tags: z.array(z.string().max(48)).max(48).optional(),
});

const batchSchema = z.object({
  soundIds: z.array(z.string()).min(1).max(500),
  updates: soundEditSchema,
});

export async function PATCH(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = batchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid batch edit", details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
      { status: 422 },
    );
  }

  const sounds = batchUpdateLocalSounds(parsed.data.soundIds, parsed.data.updates).map((sound) => ({
    ...sound,
    audioUrl: createLocalSoundAudioUrl(sound.id),
    promptCandidate: promptFromSound(sound),
  }));

  return NextResponse.json({
    sounds,
    summary: summarizeLibrary(),
  });
}
