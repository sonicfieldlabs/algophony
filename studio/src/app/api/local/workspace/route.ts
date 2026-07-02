import { NextRequest, NextResponse } from "next/server";
import { readWorkspaceManifest } from "@/lib/local/workspace";
import { localOnly } from "@/lib/local/request";
import { readLocalSoundLibrary, summarizeLibrary } from "@/lib/local/sound-library";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const manifest = readWorkspaceManifest();
  const library = readLocalSoundLibrary();
  return NextResponse.json({
    workspace: manifest,
    library: {
      scannedAt: library.scannedAt,
      summary: summarizeLibrary(library),
    },
  });
}
