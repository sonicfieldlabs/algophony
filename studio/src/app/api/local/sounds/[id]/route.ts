import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { localOnly } from "@/lib/local/request";
import {
  FREQUENCY_ROLES,
  STACKER_LAYER_TYPES,
} from "@/lib/sfx/stacker-taxonomy";
import {
  createLocalSoundAudioUrl,
  getLocalSoundById,
  promptFromSound,
  updateLocalSound,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const { id } = await params;
  const sound = getLocalSoundById(id);
  if (!sound) return NextResponse.json({ error: "Local sound not found" }, { status: 404 });

  return NextResponse.json({
    sound: {
      ...sound,
      audioUrl: createLocalSoundAudioUrl(sound.id),
      promptCandidate: promptFromSound(sound),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = soundEditSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sound edit", details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
      { status: 422 },
    );
  }

  try {
    const { id } = await params;
    const sound = updateLocalSound(id, parsed.data);
    return NextResponse.json({
      sound: {
        ...sound,
        audioUrl: createLocalSoundAudioUrl(sound.id),
        promptCandidate: promptFromSound(sound),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update local sound" },
      { status: 404 },
    );
  }
}
