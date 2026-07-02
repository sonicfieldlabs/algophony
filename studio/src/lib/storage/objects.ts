import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { createServiceLocalClient } from "@/lib/local/db-client";

export type StoredObject = {
  body: BodyInit;
  contentType: string;
  contentLength: number | null;
  uploadedAt: string | null;
};

export class StorageQuotaError extends Error {
  limitBytes: number;
  usedBytes: number;
  incomingBytes: number;

  constructor(limitBytes: number, usedBytes: number, incomingBytes: number) {
    super("Storage quota exceeded");
    this.name = "StorageQuotaError";
    this.limitBytes = limitBytes;
    this.usedBytes = usedBytes;
    this.incomingBytes = incomingBytes;
  }
}

export class StorageObjectNotFoundError extends Error {
  constructor(path: string) {
    super(`Storage object not found: ${path}`);
    this.name = "StorageObjectNotFoundError";
  }
}

const DEFAULT_STORAGE_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;
const DEFAULT_STORAGE_BUCKET = "algophony-studio-sounds";

function getStorageBucketName(): string {
  return process.env.ALGOPHONY_STUDIO_STORAGE_BUCKET?.trim() || DEFAULT_STORAGE_BUCKET;
}

export function getStorageLimitBytes(): number {
  const raw = process.env.ATLAS_STORAGE_LIMIT_BYTES;
  if (!raw) return DEFAULT_STORAGE_LIMIT_BYTES;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STORAGE_LIMIT_BYTES;
}

export function formatStorageBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

export function isValidStoragePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 1024 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.split("/").includes("..")
  );
}

export async function getStorageUsageBytes(): Promise<number> {
  const service = createServiceLocalClient();
  let total = 0;

  const { data: generations, error: generationsError } = await service
    .from("generations")
    .select("audio_size_bytes");
  if (generationsError) {
    if (generationsError.code !== "42703") {
      throw new Error(`Failed to read generation storage usage: ${generationsError.message}`);
    }
  } else {
    for (const row of generations ?? []) {
      total += positiveNumber(row.audio_size_bytes);
    }
  }

  const { data: references, error: referencesError } = await service
    .from("reference_uploads")
    .select("size_bytes, isolated_size_bytes");
  if (referencesError) {
    if (referencesError.code !== "42703") {
      throw new Error(`Failed to read reference storage usage: ${referencesError.message}`);
    }
    const { data: referenceSizes, error: referenceSizeError } = await service
      .from("reference_uploads")
      .select("size_bytes");
    if (referenceSizeError) {
      throw new Error(`Failed to read reference storage usage: ${referenceSizeError.message}`);
    }
    for (const row of referenceSizes ?? []) {
      total += positiveNumber(row.size_bytes);
    }
  } else {
    for (const row of references ?? []) {
      total += positiveNumber(row.size_bytes);
      total += positiveNumber(row.isolated_size_bytes);
    }
  }

  return total;
}

export async function assertStorageQuotaAvailable(incomingBytes: number): Promise<void> {
  if (incomingBytes <= 0) return;
  const limitBytes = getStorageLimitBytes();
  const usedBytes = await getStorageUsageBytes();
  if (usedBytes + incomingBytes > limitBytes) {
    throw new StorageQuotaError(limitBytes, usedBytes, incomingBytes);
  }
}

export async function putStorageObject(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (!isValidStoragePath(path)) {
    throw new Error(`Invalid storage path: ${path}`);
  }

  await assertStorageQuotaAvailable(body.byteLength);

  const service = createServiceLocalClient();
  const bucketName = getStorageBucketName();
  const { error } = await service.storage
    .from(bucketName)
    .upload(path, body, { contentType, upsert: true });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

export async function getStorageObject(path: string): Promise<StoredObject | null> {
  if (!isValidStoragePath(path)) return null;

  const service = createServiceLocalClient();
  const bucketName = getStorageBucketName();
  const { data, error } = await service.storage.from(bucketName).download(path);
  if (error || !data) return null;
  return {
    body: data.stream() as BodyInit,
    contentType: data.type || "application/octet-stream",
    contentLength: data.size,
    uploadedAt: null,
  };
}

export async function removeStorageObjects(paths: string[]): Promise<void> {
  const validPaths = paths.filter(isValidStoragePath);
  if (validPaths.length === 0) return;

  const service = createServiceLocalClient();
  const bucketName = getStorageBucketName();
  await service.storage.from(bucketName).remove(validPaths);
}

export async function createStorageObjectUrl(
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  if (!isValidStoragePath(path)) {
    throw new Error(`Invalid storage path: ${path}`);
  }

  return createSignedAppStorageUrl(path, expiresInSeconds);
}

export async function createStorageObjectUrls(
  paths: string[],
  expiresInSeconds: number,
): Promise<Array<{ path: string; signedUrl: string | null }>> {
  const validPaths = paths.filter(isValidStoragePath);
  if (validPaths.length === 0) {
    return paths.map((path) => ({ path, signedUrl: null }));
  }

  const signed = await Promise.all(
    validPaths.map(async (path) => [path, await createSignedAppStorageUrl(path, expiresInSeconds)] as const),
  );
  const signedByPath = new Map(signed);
  return paths.map((path) => ({ path, signedUrl: signedByPath.get(path) ?? null }));
}

export async function getOwnedStoragePaths(
  userId: string,
  storagePaths: string[],
): Promise<Set<string>> {
  const paths = Array.from(new Set(storagePaths.filter(isValidStoragePath)));
  const allowed = new Set<string>();
  if (paths.length === 0) return allowed;

  const service = createServiceLocalClient();

  const { data: generations, error: generationError } = await service
    .from("generations")
    .select("audio_storage_path,user_id")
    .eq("user_id", userId)
    .in("audio_storage_path", paths);
  if (generationError) {
    throw new Error(`Generation ownership lookup failed: ${generationError.message}`);
  }
  for (const row of generations ?? []) {
    if (typeof row.audio_storage_path === "string") allowed.add(row.audio_storage_path);
  }

  const { data: uploadedReferences, error: uploadError } = await service
    .from("reference_uploads")
    .select("storage_path,user_id")
    .eq("user_id", userId)
    .in("storage_path", paths);
  if (uploadError) {
    throw new Error(`Reference ownership lookup failed: ${uploadError.message}`);
  }
  for (const row of uploadedReferences ?? []) {
    if (typeof row.storage_path === "string") allowed.add(row.storage_path);
  }

  const { data: isolatedReferences, error: isolatedError } = await service
    .from("reference_uploads")
    .select("isolated_storage_path,user_id")
    .eq("user_id", userId)
    .in("isolated_storage_path", paths);
  if (isolatedError) {
    throw new Error(`Isolated reference ownership lookup failed: ${isolatedError.message}`);
  }
  for (const row of isolatedReferences ?? []) {
    if (typeof row.isolated_storage_path === "string") allowed.add(row.isolated_storage_path);
  }

  return allowed;
}

export async function userOwnsStoragePath(userId: string, storagePath: string): Promise<boolean> {
  const allowed = await getOwnedStoragePaths(userId, [storagePath]);
  return allowed.has(storagePath);
}

export async function createSignedAppStorageUrl(
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sig = await signStorageToken(path, exp);
  const url = new URL("/api/storage/object", getAppUrl());
  url.searchParams.set("path", path);
  url.searchParams.set("exp", String(exp));
  url.searchParams.set("sig", sig);
  return url.toString();
}

export async function verifyStorageToken(
  path: string,
  exp: string | null,
  sig: string | null,
): Promise<boolean> {
  if (!exp || !sig || !isValidStoragePath(path)) return false;
  const expSeconds = Number.parseInt(exp, 10);
  if (!Number.isFinite(expSeconds) || expSeconds < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = await signStorageToken(path, expSeconds);
  return safeTextEqual(expected, sig);
}

function positiveNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

async function signStorageToken(path: string, exp: number): Promise<string> {
  const secret = process.env.ALGOPHONY_STUDIO_LOCAL_STORAGE_SECRET || "algophony-studio-local-storage";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${path}.${exp}`),
  );
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function safeTextEqual(a: string, b: string): Promise<boolean> {
  const [aHash, bHash] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  return a.length === b.length && aHash === bHash;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}
