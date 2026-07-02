import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/current-user";
import { localOnly } from "@/lib/local/request";
import { getUnifiedSoundAsset } from "@/lib/local/sound-assets";
import {
  metadataToPrompt,
  promptToMetadata,
} from "@/lib/sfx/metadata-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const promptToolSchema = z.object({
  direction: z.enum(["metadata-to-prompt", "prompt-to-metadata"]),
  assetIds: z.array(z.string()).max(50).optional(),
  prompt: z.string().max(8000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).max(100).optional(),
  fileName: z.string().max(512).optional(),
  relativePath: z.string().max(2048).optional(),
});

export async function POST(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = promptToolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid metadata prompt request", details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
      { status: 422 },
    );
  }

  if (parsed.data.direction === "prompt-to-metadata") {
    if (!parsed.data.prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required for prompt-to-metadata" }, { status: 400 });
    }
    return NextResponse.json({
      result: promptToMetadata(parsed.data.prompt),
    });
  }

  const profile = await requireProfile();
  const assetIds = parsed.data.assetIds ?? [];
  if (assetIds.length > 0) {
    const results = await Promise.all(
      assetIds.map(async (assetId) => {
        const asset = await getUnifiedSoundAsset(profile.id, assetId);
        if (!asset) return { assetId, error: "Asset not found" };
        return {
          assetId,
          asset,
          result: metadataToPrompt({
            fileName: asset.fileName,
            relativePath: asset.provenance.relativePath,
            tags: asset.tags,
            audio: asset.technical,
            prompt: asset.prompt,
            metadata: asset.metadata as unknown as Record<string, unknown>,
            source: asset.source,
          }),
        };
      }),
    );
    return NextResponse.json({ results });
  }

  return NextResponse.json({
    result: metadataToPrompt({
      fileName: parsed.data.fileName,
      relativePath: parsed.data.relativePath,
      tags: parsed.data.tags,
      prompt: parsed.data.prompt,
      metadata: parsed.data.metadata,
      source: "external",
    }),
  });
}
