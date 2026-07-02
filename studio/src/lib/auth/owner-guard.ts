/**
 * Algophony Studio — Owner Guard
 *
 * Service-client ownership verification helper.
 * Used across API routes that bypass RLS via createServiceLocalClient()
 * to ensure users can only access their own resources.
 *
 * §1.3 / §2.3 — Prevents IDOR vulnerabilities.
 */

import { createServiceLocalClient } from "@/lib/local/db-client";

/**
 * Error thrown when a resource is not found or not owned by the requesting user.
 * Returns 404 (not 403) to avoid leaking existence of other users' resources.
 */
export class NotFoundError extends Error {
  readonly status = 404;

  constructor(resource?: string) {
    super(resource ? `${resource} not found` : "Not found");
    this.name = "NotFoundError";
  }
}

/**
 * Assert that a record exists and belongs to the given user.
 * Throws NotFoundError if record is null or user_id doesn't match.
 *
 * @example
 * const { data: ref } = await service.from("reference_uploads").select("*").eq("id", id).single();
 * assertOwner(ref, profile.id); // throws NotFoundError if ref is null or belongs to another user
 * // ref is now narrowed to non-null T
 */
export function assertOwner<T extends Record<string, unknown>>(
  record: T | null,
  userId: string,
  resource?: string
): asserts record is T & { user_id: string } {
  if (!record || record.user_id !== userId) {
    throw new NotFoundError(resource);
  }
}

export async function assertOwnedProject(
  projectId: string | null | undefined,
  userId: string
): Promise<void> {
  if (!projectId) return;

  const service = createServiceLocalClient();
  const { data } = await service
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  assertOwner(data, userId, "Project");
}

export async function assertOwnedReferenceUpload(
  referenceUploadId: string | null | undefined,
  userId: string
): Promise<void> {
  if (!referenceUploadId) return;

  const service = createServiceLocalClient();
  const { data } = await service
    .from("reference_uploads")
    .select("id, user_id")
    .eq("id", referenceUploadId)
    .maybeSingle();

  assertOwner(data, userId, "Reference upload");
}
