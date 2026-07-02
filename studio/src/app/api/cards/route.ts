import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { isDemoUser } from "@/lib/demo/config";
import { listPromptCards, createPromptCard } from "@/lib/local/repositories/prompt-cards";
import { sfxPromptSchema } from "@/lib/sfx/prompt-schema";
import type { Plan } from "@/lib/sfx/entitlements";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  attributes: sfxPromptSchema,
});

/** GET /api/cards — list user's prompt cards */
export async function GET() {
  try {
    const profile = await requireProfile();
    const cards = await listPromptCards(profile.id);
    return NextResponse.json({ cards });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    return NextResponse.json(
      { error: "Failed to list cards" },
      { status: 500 }
    );
  }
}

/** POST /api/cards — create a new prompt card */
export async function POST(request: Request) {
  try {
    const profile = await requireProfile();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 422 }
      );
    }
    const { title, attributes } = parsed.data;

    const card = await createPromptCard(
      profile.id,
      attributes,
      title,
      (isDemoUser(profile) ? "team" : profile.plan) as Plan
    );
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    const message = err instanceof Error ? err.message : "Failed to create card";
    const status = message.includes("limit reached") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
