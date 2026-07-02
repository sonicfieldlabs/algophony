import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { localOnly } from "@/lib/local/request";
import { promptCandidates } from "@/lib/local/sound-library";

export const runtime = "nodejs";

const promptSchema = z.object({
  soundIds: z.array(z.string()).optional(),
}).optional();

export async function POST(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = promptSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid prompt extraction request." }, { status: 400 });
  }

  return NextResponse.json({ prompts: promptCandidates(parsed.data?.soundIds) });
}
