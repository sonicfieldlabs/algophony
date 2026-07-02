import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { localOnly } from "@/lib/local/request";
import {
  addLibraryRoot,
  removeLibraryRoot,
  readLocalSoundLibrary,
  rescanLibrary,
  summarizeLibrary,
} from "@/lib/local/sound-library";

export const runtime = "nodejs";

const addRootSchema = z.object({
  folderPath: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const library = readLocalSoundLibrary();
  return NextResponse.json({ library, summary: summarizeLibrary(library) });
}

export async function POST(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = addRootSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A local folder path is required." }, { status: 400 });
  }

  try {
    const library = addLibraryRoot(parsed.data.folderPath);
    return NextResponse.json({ library, summary: summarizeLibrary(library) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to index local library." },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  try {
    const library = rescanLibrary();
    return NextResponse.json({ library, summary: summarizeLibrary(library) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to rescan local libraries." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const parsed = addRootSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A local folder path is required." }, { status: 400 });
  }

  try {
    const library = removeLibraryRoot(parsed.data.folderPath);
    return NextResponse.json({ library, summary: summarizeLibrary(library) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove local library." },
      { status: 400 }
    );
  }
}
