/**
 * Algophony Studio — Audit Log
 *
 * Request-level audit logging for security and debugging.
 * Local-first runtime: in-memory ring buffer (last 1000 entries).
 */

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  creditCost: number;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

// ── In-Memory Ring Buffer ────────────────────────────────────

const MAX_BUFFER_SIZE = 1000;
const auditBuffer: AuditEntry[] = [];

function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Logging ──────────────────────────────────────────────────

export interface LogApiRequestInput {
  userId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  creditCost?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an API request to the audit trail.
 * Non-blocking — errors are caught and logged, never thrown.
 */
export async function logApiRequest(input: LogApiRequestInput): Promise<void> {
  const entry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId: input.userId,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    creditCost: input.creditCost ?? 0,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  };

  // Always store in memory buffer
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.shift();
  }
}

// ── Querying ─────────────────────────────────────────────────

export interface AuditQueryOptions {
  userId?: string;
  path?: string;
  method?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  limit?: number;
}

/**
 * Query audit logs from the local in-memory buffer.
 */
export async function queryAuditLog(opts: AuditQueryOptions = {}): Promise<AuditEntry[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  let filtered = [...auditBuffer];
  if (opts.userId) filtered = filtered.filter((e) => e.userId === opts.userId);
  if (opts.path) filtered = filtered.filter((e) => e.path.includes(opts.path!));
  if (opts.method) filtered = filtered.filter((e) => e.method === opts.method);
  if (opts.from) filtered = filtered.filter((e) => e.timestamp >= opts.from!);
  if (opts.to) filtered = filtered.filter((e) => e.timestamp <= opts.to!);

  return filtered.slice(-limit).reverse();
}

// ── Helpers for Route Integration ────────────────────────────

/**
 * Extract client IP from a Next.js request.
 * Handles common proxy headers.
 */
export function extractClientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    null
  );
}

/**
 * Create a timer for measuring request duration.
 */
export function startRequestTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
