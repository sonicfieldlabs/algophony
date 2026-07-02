import "server-only";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";
import {
  ensureAlgophonyStudioDir,
} from "./workspace";

type LocalRow = Record<string, unknown>;
type LocalTables = Record<string, LocalRow[]>;

type QueryError = {
  message: string;
  code?: string;
};

type QueryResult<T = unknown> = {
  data: T | null;
  error: QueryError | null;
  count?: number | null;
};

type Filter = (row: LocalRow) => boolean;

type SortSpec = {
  column: string;
  ascending: boolean;
};

type SelectOptions = {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
};

type MutationKind = "select" | "insert" | "update" | "delete" | "upsert";

interface LocalDatabaseFile {
  version: 1;
  tables: LocalTables;
}

const DB_VERSION = 1;
const DEFAULT_STORAGE_BUCKET = "algophony-studio-sounds";

function databasePath(): string {
  return join(ensureAlgophonyStudioDir(), "local-db.json");
}

function storageRoot(): string {
  return join(ensureAlgophonyStudioDir(), "storage");
}

function nowIso(): string {
  return new Date().toISOString();
}

function localUser() {
  const id = process.env.ALGOPHONY_STUDIO_LOCAL_USER_ID ?? "local-workspace";
  const email = process.env.ALGOPHONY_STUDIO_LOCAL_EMAIL ?? "local@algophony.studio";
  return { id, email };
}

function readDatabase(): LocalDatabaseFile {
  const path = databasePath();
  if (!existsSync(path)) {
    const db: LocalDatabaseFile = { version: DB_VERSION, tables: {} };
    seedLocalProfile(db);
    writeDatabase(db);
    return db;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LocalDatabaseFile>;
    const db: LocalDatabaseFile = {
      version: DB_VERSION,
      tables: parsed.tables && typeof parsed.tables === "object" ? parsed.tables as LocalTables : {},
    };
    seedLocalProfile(db);
    return db;
  } catch {
    const db: LocalDatabaseFile = { version: DB_VERSION, tables: {} };
    seedLocalProfile(db);
    writeDatabase(db);
    return db;
  }
}

function writeDatabase(db: LocalDatabaseFile): void {
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(db, null, 2), "utf8");
}

function seedLocalProfile(db: LocalDatabaseFile): void {
  const { id, email } = localUser();
  const profiles = db.tables.profiles ?? [];
  const existing = profiles.find((row) => row.id === id);
  if (!existing) {
    profiles.push({
      id,
      email,
      display_name: "Local Workspace",
      plan: "team",
      monthly_credit_limit: Number.MAX_SAFE_INTEGER,
      credits_remaining: Number.MAX_SAFE_INTEGER,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
  db.tables.profiles = profiles;
}

function getTable(db: LocalDatabaseFile, table: string): LocalRow[] {
  if (!Array.isArray(db.tables[table])) db.tables[table] = [];
  return db.tables[table];
}

function cloneRow<T>(row: T): T {
  return JSON.parse(JSON.stringify(row)) as T;
}

function normalizeRows(input: LocalRow | LocalRow[]): LocalRow[] {
  return Array.isArray(input) ? input : [input];
}

function withDefaults(row: LocalRow): LocalRow {
  const timestamp = nowIso();
  return {
    id: typeof row.id === "string" && row.id ? row.id : randomUUID(),
    created_at: row.created_at ?? timestamp,
    updated_at: row.updated_at ?? timestamp,
    ...row,
  };
}

function getField(row: LocalRow, column: string): unknown {
  if (column.includes("->>")) {
    const [root, key] = column.split("->>").map((part) => part.trim());
    const value = row[root];
    if (value && typeof value === "object") {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }

  if (column.includes(".")) {
    return column.split(".").reduce<unknown>((value, part) => {
      if (value && typeof value === "object") {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, row);
  }

  return row[column];
}

function compareValues(left: unknown, right: unknown): number {
  const leftTime = typeof left === "string" ? Date.parse(left) : Number.NaN;
  const rightTime = typeof right === "string" ? Date.parse(right) : Number.NaN;
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }

  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left ?? "").localeCompare(String(right ?? ""));
}

function likePatternToRegExp(pattern: string): RegExp {
  const unescaped = pattern.replace(/\\([%_\\])/g, "$1");
  const escaped = unescaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${regex}$`, "i");
}

function matchesIlike(value: unknown, pattern: string): boolean {
  return likePatternToRegExp(pattern).test(String(value ?? ""));
}

function parseLiteral(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed) && value.trim() !== "") return parsed;
  return decodeURIComponent(value);
}

function projectRows(rows: LocalRow[], columns: string | undefined): LocalRow[] {
  if (!columns || columns.trim() === "" || columns.trim() === "*") return rows.map(cloneRow);

  const keys = columns
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => key.split(/\s+as\s+/i)[0]?.trim() ?? key);

  return rows.map((row) => {
    const projected: LocalRow = {};
    for (const key of keys) {
      projected[key] = getField(row, key);
    }
    return projected;
  });
}

function localError(message: string, code?: string): QueryError {
  return { message, code };
}

class LocalQueryBuilder {
  private filters: Filter[] = [];
  private sorts: SortSpec[] = [];
  private maxRows: number | null = null;
  private selectedColumns: string | undefined;
  private selectOptions: SelectOptions | undefined;
  private mutation: MutationKind = "select";
  private mutationRows: LocalRow[] = [];
  private updateValues: LocalRow = {};
  private upsertConflict = "id";

  constructor(private tableName: string) {}

  select(columns = "*", options?: SelectOptions): this {
    this.selectedColumns = columns;
    this.selectOptions = options;
    if (this.mutation === "select") this.mutation = "select";
    return this;
  }

  insert(rows: LocalRow | LocalRow[]): this {
    this.mutation = "insert";
    this.mutationRows = normalizeRows(rows);
    return this;
  }

  update(values: LocalRow): this {
    this.mutation = "update";
    this.updateValues = values;
    return this;
  }

  upsert(rows: LocalRow | LocalRow[], options?: { onConflict?: string }): this {
    this.mutation = "upsert";
    this.mutationRows = normalizeRows(rows);
    this.upsertConflict = options?.onConflict ?? "id";
    return this;
  }

  delete(): this {
    this.mutation = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => getField(row, column) === value);
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push((row) => getField(row, column) !== value);
    return this;
  }

  in(column: string, values: unknown[]): this {
    const set = new Set(values);
    this.filters.push((row) => set.has(getField(row, column)));
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push((row) => getField(row, column) === value);
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    if (operator === "is") {
      this.filters.push((row) => getField(row, column) !== value);
    } else if (operator === "eq") {
      this.filters.push((row) => getField(row, column) !== value);
    }
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push((row) => compareValues(getField(row, column), value) >= 0);
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push((row) => compareValues(getField(row, column), value) <= 0);
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push((row) => compareValues(getField(row, column), value) > 0);
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push((row) => compareValues(getField(row, column), value) < 0);
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.filters.push((row) => matchesIlike(getField(row, column), pattern));
    return this;
  }

  or(clause: string): this {
    const filters = clause
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => this.parseOrPart(part));

    if (filters.length) {
      this.filters.push((row) => filters.some((filter) => filter(row)));
    }
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.sorts.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(count: number): this {
    this.maxRows = count;
    return this;
  }

  range(from: number, to: number): this {
    this.filters.push((_, index?: number) => {
      const numericIndex = typeof index === "number" ? index : 0;
      return numericIndex >= from && numericIndex <= to;
    });
    return this;
  }

  async single(): Promise<QueryResult<LocalRow>> {
    const result = await this.execute();
    const rows = Array.isArray(result.data) ? result.data : [];
    if (rows.length === 0) return { data: null, error: localError("Row not found", "PGRST116") };
    if (rows.length > 1) return { data: null, error: localError("Multiple rows returned", "PGRST116") };
    return { data: rows[0] as LocalRow, error: null };
  }

  async maybeSingle(): Promise<QueryResult<LocalRow>> {
    const result = await this.execute();
    const rows = Array.isArray(result.data) ? result.data : [];
    if (rows.length === 0) return { data: null, error: null };
    if (rows.length > 1) return { data: null, error: localError("Multiple rows returned", "PGRST116") };
    return { data: rows[0] as LocalRow, error: null };
  }

  then<TResult1 = QueryResult<LocalRow[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<LocalRow[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<LocalRow[]>> {
    try {
      const db = readDatabase();
      const table = getTable(db, this.tableName);
      let rows: LocalRow[];

      if (this.mutation === "insert") {
        rows = this.mutationRows.map(withDefaults);
        table.push(...rows);
        writeDatabase(db);
      } else if (this.mutation === "upsert") {
        rows = this.mutationRows.map((row) => this.upsertRow(table, row));
        writeDatabase(db);
      } else if (this.mutation === "update") {
        rows = [];
        const timestamp = nowIso();
        for (const row of table) {
          if (this.matches(row)) {
            Object.assign(row, this.updateValues, { updated_at: timestamp });
            rows.push(row);
          }
        }
        writeDatabase(db);
      } else if (this.mutation === "delete") {
        rows = table.filter((row) => this.matches(row));
        db.tables[this.tableName] = table.filter((row) => !this.matches(row));
        writeDatabase(db);
      } else {
        rows = table.filter((row) => this.matches(row));
      }

      rows = this.applyOrder(rows);
      const count = rows.length;
      if (this.maxRows !== null) rows = rows.slice(0, this.maxRows);

      if (this.selectOptions?.head) {
        return { data: null as unknown as LocalRow[], error: null, count };
      }

      return {
        data: projectRows(rows, this.selectedColumns),
        error: null,
        count: this.selectOptions?.count ? count : null,
      };
    } catch (error) {
      return {
        data: null,
        error: localError(error instanceof Error ? error.message : "Local database error"),
      };
    }
  }

  private matches(row: LocalRow): boolean {
    return this.filters.every((filter) => filter(row));
  }

  private applyOrder(rows: LocalRow[]): LocalRow[] {
    if (!this.sorts.length) return [...rows];
    return [...rows].sort((a, b) => {
      for (const sort of this.sorts) {
        const result = compareValues(getField(a, sort.column), getField(b, sort.column));
        if (result !== 0) return sort.ascending ? result : -result;
      }
      return 0;
    });
  }

  private upsertRow(table: LocalRow[], input: LocalRow): LocalRow {
    const row = withDefaults(input);
    const conflictValue = row[this.upsertConflict];
    const existing = table.find((item) => item[this.upsertConflict] === conflictValue);
    if (existing) {
      Object.assign(existing, row, { updated_at: nowIso() });
      return existing;
    }
    table.push(row);
    return row;
  }

  private parseOrPart(part: string): Filter {
    const [column, operator, ...valueParts] = part.split(".");
    const value = valueParts.join(".");
    if (!column || !operator) return () => false;

    if (operator === "eq") {
      const expected = parseLiteral(value);
      return (row) => getField(row, column) === expected;
    }
    if (operator === "ilike") {
      return (row) => matchesIlike(getField(row, column), value);
    }

    return () => false;
  }
}

class LocalStorageBucket {
  constructor(private bucket: string) {}

  async upload(path: string, body: Buffer | ArrayBuffer | Uint8Array | Blob, opts?: { contentType?: string; upsert?: boolean }) {
    const filePath = this.filePath(path);
    if (!opts?.upsert && existsSync(filePath)) {
      return { data: null, error: localError("Storage object already exists") };
    }
    mkdirSync(dirname(filePath), { recursive: true });
    let bytes: Buffer;
    if (body instanceof Blob) {
      bytes = Buffer.from(await body.arrayBuffer());
    } else if (body instanceof ArrayBuffer) {
      bytes = Buffer.from(new Uint8Array(body));
    } else {
      bytes = Buffer.from(body);
    }
    writeFileSync(filePath, bytes);
    writeFileSync(`${filePath}.meta.json`, JSON.stringify({
      contentType: opts?.contentType ?? "application/octet-stream",
      size: bytes.byteLength,
      uploadedAt: nowIso(),
    }, null, 2), "utf8");
    return { data: { path }, error: null };
  }

  async download(path: string) {
    const filePath = this.filePath(path);
    if (!existsSync(filePath)) {
      return { data: null, error: localError("Storage object not found") };
    }
    const meta = this.readMeta(filePath);
    const bytes = readFileSync(filePath);
    return {
      data: new Blob([bytes], { type: meta.contentType }),
      error: null,
    };
  }

  async remove(paths: string[]) {
    for (const path of paths) {
      const filePath = this.filePath(path);
      rmSync(filePath, { force: true });
      rmSync(`${filePath}.meta.json`, { force: true });
    }
    return { data: null, error: null };
  }

  async createSignedUrl(path: string, _expiresInSeconds: number) {
    return { data: { signedUrl: this.objectUrl(path) }, error: null };
  }

  async createSignedUrls(paths: string[], expiresInSeconds: number) {
    return {
      data: paths.map((path) => ({
        path,
        signedUrl: this.objectUrl(path),
        expiresAt: Date.now() + expiresInSeconds * 1000,
      })),
      error: null,
    };
  }

  private filePath(path: string): string {
    return join(storageRoot(), this.bucket, path);
  }

  private objectUrl(path: string): string {
    const url = new URL("/api/storage/object", getAppUrl());
    url.searchParams.set("path", path);
    return url.toString();
  }

  private readMeta(filePath: string): { contentType: string; size: number; uploadedAt: string | null } {
    const metaPath = `${filePath}.meta.json`;
    if (!existsSync(metaPath)) {
      return { contentType: "application/octet-stream", size: 0, uploadedAt: null };
    }
    try {
      return JSON.parse(readFileSync(metaPath, "utf8")) as { contentType: string; size: number; uploadedAt: string | null };
    } catch {
      return { contentType: "application/octet-stream", size: 0, uploadedAt: null };
    }
  }
}

class LocalStorage {
  from(bucket = DEFAULT_STORAGE_BUCKET) {
    return new LocalStorageBucket(bucket);
  }
}

export function createLocalDatabaseClient() {
  return {
    from(table: string) {
      return new LocalQueryBuilder(table);
    },
    async rpc(name: string, params: Record<string, unknown>) {
      if (name === "debit_generation_credit") {
        return mutateLocalCredits(String(params.p_user_id), -Number(params.p_amount ?? 1));
      }
      if (name === "increment_credits") {
        return mutateLocalCredits(String(params.p_user_id), Number(params.p_amount ?? 1));
      }
      return { data: null, error: localError(`Unsupported local RPC: ${name}`) };
    },
    storage: new LocalStorage(),
    auth: {
      admin: {
        async getUserById(userId: string) {
          const db = readDatabase();
          const profile = getTable(db, "profiles").find((row) => row.id === userId);
          return {
            data: {
              user: profile
                ? { id: profile.id, email: profile.email ?? null }
                : { id: userId, email: null },
            },
            error: null,
          };
        },
      },
    },
    channel(_name: string) {
      return {
        on() {
          return this;
        },
        subscribe() {
          return { unsubscribe() {} };
        },
      };
    },
    removeChannel() {
      return Promise.resolve({ error: null });
    },
  };
}

export type LocalDatabaseClient = ReturnType<typeof createLocalDatabaseClient>;

function mutateLocalCredits(userId: string, delta: number) {
  const db = readDatabase();
  const profiles = getTable(db, "profiles");
  let profile = profiles.find((row) => row.id === userId);
  if (!profile) {
    profile = {
      id: userId,
      email: null,
      plan: "team",
      monthly_credit_limit: Number.MAX_SAFE_INTEGER,
      credits_remaining: Number.MAX_SAFE_INTEGER,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    profiles.push(profile);
  }

  const current = Number(profile.credits_remaining ?? Number.MAX_SAFE_INTEGER);
  if (delta < 0 && current < Math.abs(delta)) {
    return { data: null, error: localError("INSUFFICIENT_CREDITS") };
  }
  const next = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, current + delta));
  profile.credits_remaining = next;
  profile.updated_at = nowIso();
  writeDatabase(db);
  return { data: next, error: null };
}
