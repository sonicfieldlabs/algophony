import { NextRequest, NextResponse } from "next/server";
import { requireProfile, AuthError, unauthorizedResponse } from "@/lib/auth/current-user";
import {
  getStorageObject,
  isValidStoragePath,
  userOwnsStoragePath,
  verifyStorageToken,
} from "@/lib/storage/objects";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path") ?? "";

    if (!isValidStoragePath(path)) {
      return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
    }

    const hasValidToken = await verifyStorageToken(
      path,
      url.searchParams.get("exp"),
      url.searchParams.get("sig"),
    );

    if (!hasValidToken) {
      let profile;
      try {
        profile = await requireProfile();
      } catch (err) {
        if (err instanceof AuthError) return unauthorizedResponse(err.message);
        throw err;
      }

      const ownsPath = await userOwnsStoragePath(profile.id, path);
      if (!ownsPath) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const object = await getStorageObject(path);
    if (!object) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": object.contentType,
      "X-Content-Type-Options": "nosniff",
    });
    if (object.contentLength !== null) {
      headers.set("Content-Length", String(object.contentLength));
    }
    if (url.searchParams.get("download") === "1") {
      headers.set("Content-Disposition", `attachment; filename="${filenameFor(path)}"`);
    }

    return new NextResponse(object.body, { status: 200, headers });
  } catch (err) {
    logger.error({ err }, "[storage/object] failed to serve object");
    return NextResponse.json({ error: "Failed to load storage object" }, { status: 500 });
  }
}

function filenameFor(path: string): string {
  return (path.split("/").pop() || "algophony-studio-audio").replace(/[^a-zA-Z0-9._-]/g, "_");
}
