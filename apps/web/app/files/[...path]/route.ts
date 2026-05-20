import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { notFound } from "next/navigation";

const REPO_ROOT = path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..");

const ALLOWED_ROOTS = [
  { prefix: "atlas/prompts/", root: path.join(REPO_ROOT, "atlas", "prompts") },
  { prefix: "generations/metadata/", root: path.join(REPO_ROOT, "generations", "metadata") },
  { prefix: "benchmark/scores/", root: path.join(REPO_ROOT, "benchmark", "scores") },
  { prefix: "benchmark/exports/", root: path.join(REPO_ROOT, "benchmark", "exports") },
  { prefix: "docs/", root: path.join(REPO_ROOT, "docs") },
];

const MIME_BY_EXT: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const relPath = parts.join("/");
  const allowed = ALLOWED_ROOTS.find((entry) => relPath.startsWith(entry.prefix));
  if (!allowed) notFound();

  const suffix = relPath.slice(allowed.prefix.length);
  if (suffix.includes("\0")) notFound();
  const target = path.resolve(/* turbopackIgnore: true */ allowed.root, suffix);
  if (!target.startsWith(allowed.root + path.sep) && target !== allowed.root) notFound();

  let fileStat;
  try {
    fileStat = await stat(target);
  } catch {
    notFound();
  }
  if (!fileStat.isFile()) notFound();

  const ext = path.extname(target).toLowerCase();
  const type = MIME_BY_EXT[ext] || "text/plain; charset=utf-8";

  const stream = createReadStream(target);
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(fileStat.size),
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
