/**
 * Algophony Studio — Signed URL Helper
 *
 * §2.6: Centralized signed URL generation with purpose-based expiry +
 * mandatory ownership verification. Callers must pass the authenticated
 * userId; the helper looks up each storage path in the generations table
 * and refuses to sign if it isn't owned by that user.
 */

import {
  createStorageObjectUrl,
  createStorageObjectUrls,
  getOwnedStoragePaths,
} from "@/lib/storage/objects";

/** URL purpose determines TTL */
export type SignedUrlPurpose = "preview" | "download" | "export" | "share";

/** Expiry in seconds per purpose */
const EXPIRY_MAP: Record<SignedUrlPurpose, number> = {
  preview: 3600,       // 1 hour — for in-app playback
  download: 300,       // 5 minutes — fresh-mint download link
  export: 86400,       // 24 hours — export bundle download
  share: 86400,        // 24 hours — user-initiated share
};

export class StorageOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageOwnershipError";
  }
}

/**
 * Confirm the requesting user owns every supplied storage path.
 * Returns the set of paths the user is allowed to sign.
 */
async function assertOwnsPaths(userId: string, storagePaths: string[]): Promise<Set<string>> {
  return getOwnedStoragePaths(userId, storagePaths);
}

/**
 * Create a signed URL for a storage path with purpose-based expiry.
 * Refuses to sign paths the user does not own.
 *
 * @example
 * const url = await signFor("preview", "generations/abc123.mp3", { userId });
 */
export async function signFor(
  purpose: SignedUrlPurpose,
  storagePath: string,
  opts: { userId: string; bucket?: string }
): Promise<string> {
  const allowed = await assertOwnsPaths(opts.userId, [storagePath]);
  if (!allowed.has(storagePath)) {
    throw new StorageOwnershipError(`User ${opts.userId} does not own ${storagePath}`);
  }

  const expiry = EXPIRY_MAP[purpose];
  return createStorageObjectUrl(storagePath, expiry);
}

/**
 * Batch-sign multiple paths for the same purpose. Any path the user does not
 * own is returned with signedUrl=null instead of being signed.
 *
 * @example
 * const urls = await signBatchFor("preview", ["path1.mp3", "path2.mp3"], { userId });
 */
export async function signBatchFor(
  purpose: SignedUrlPurpose,
  storagePaths: string[],
  opts: { userId: string; bucket?: string }
): Promise<Array<{ path: string; signedUrl: string | null }>> {
  if (storagePaths.length === 0) return [];

  const allowed = await assertOwnsPaths(opts.userId, storagePaths);
  const ownedPaths = storagePaths.filter((p) => allowed.has(p));

  const expiry = EXPIRY_MAP[purpose];

  const data = ownedPaths.length
    ? await createStorageObjectUrls(ownedPaths, expiry)
    : [];
  const signedByPath = new Map<string, string>();
  ownedPaths.forEach((path, i) => {
    const url = data?.[i]?.signedUrl;
    if (url) signedByPath.set(path, url);
  });

  return storagePaths.map((path) => ({
    path,
    signedUrl: signedByPath.get(path) ?? null,
  }));
}

/** Get the configured expiry seconds for a purpose (useful for debugging/tests) */
export function getExpiry(purpose: SignedUrlPurpose): number {
  return EXPIRY_MAP[purpose];
}
