import { NextRequest, NextResponse } from "next/server";
import { localOnly } from "@/lib/local/request";
import {
  createLocalSoundAudioUrl,
  promptFromSound,
  readLocalSoundLibrary,
  summarizeLibrary,
} from "@/lib/local/sound-library";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const blocked = localOnly(request);
  if (blocked) return blocked;

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 200), 1000);
  const library = readLocalSoundLibrary();
  const sounds = library.sounds
    .filter((sound) => {
      if (!search) return true;
      return (
        sound.fileName.toLowerCase().includes(search) ||
        sound.relativePath.toLowerCase().includes(search) ||
        sound.tags.some((tag) => tag.toLowerCase().includes(search)) ||
        sound.userMetadata.tags.some((tag) => tag.toLowerCase().includes(search)) ||
        [sound.userMetadata.title, sound.userMetadata.prompt, sound.userMetadata.notes, sound.userMetadata.category]
          .some((value) => value?.toLowerCase().includes(search))
      );
    })
    .slice(0, limit)
    .map((sound) => ({
      ...sound,
      audioUrl: createLocalSoundAudioUrl(sound.id),
      promptCandidate: promptFromSound(sound),
    }));

  return NextResponse.json({ sounds, summary: summarizeLibrary(library) });
}
