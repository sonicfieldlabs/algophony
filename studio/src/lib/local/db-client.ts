import "server-only";

import { createLocalDatabaseClient } from "@/lib/local/database";

/**
 * Local compatibility client.
 *
 * These helpers return a local JSON/storage facade backed by `.algophony-studio/`;
 * no hosted database client or hosted credentials are used.
 *
 * The public return type stays intentionally loose while the remaining
 * repository modules are migrated from their historical SDK-shaped query API.
 */

type LocalCompatClient = ReturnType<typeof JSON.parse>;

export async function createServerLocalClient(): Promise<LocalCompatClient> {
  return createLocalDatabaseClient() as LocalCompatClient;
}

let serviceClient: LocalCompatClient | null = null;

export function createServiceLocalClient(): LocalCompatClient {
  if (!serviceClient) serviceClient = createLocalDatabaseClient() as LocalCompatClient;
  return serviceClient;
}
