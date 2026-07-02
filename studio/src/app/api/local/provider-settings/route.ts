import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  clearElevenLabsApiKey,
  getElevenLabsKeyStatus,
  saveElevenLabsApiKey,
} from "@/lib/local/provider-settings";
import { localOnly } from "@/lib/local/request";

const saveSchema = z.object({
  apiKey: z.string().trim().min(10),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  return NextResponse.json({ elevenlabs: getElevenLabsKeyStatus() });
}

export async function PUT(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid ElevenLabs API key is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({ elevenlabs: saveElevenLabsApiKey(parsed.data.apiKey) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save provider key." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  return NextResponse.json({ elevenlabs: clearElevenLabsApiKey() });
}
