import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import { getPromptCardForUser, updatePromptCard } from "@/lib/local/repositories/prompt-cards";
import { sfxPromptSchema } from "@/lib/sfx/prompt-schema";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  attributes: sfxPromptSchema,
});

/** GET /api/cards/[id] — get a single prompt card */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireProfile();
    const { id } = await params;
    const card = await getPromptCardForUser(id, profile.id);

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    return NextResponse.json(
      { error: "Failed to get card" },
      { status: 500 }
    );
  }
}

/** PUT /api/cards/[id] — update a prompt card */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireProfile();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
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

    const card = await updatePromptCard(profile.id, id, attributes, title);
    return NextResponse.json({ card });
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse(err.message);
    const message = err instanceof Error ? err.message : "Failed to update card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
