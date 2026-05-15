import fs from "node:fs";
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

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const relPath = parts.join("/");
  const allowed = ALLOWED_ROOTS.find((entry) => relPath.startsWith(entry.prefix));
  if (!allowed) notFound();

  const suffix = relPath.slice(allowed.prefix.length);
  const target = path.resolve(/* turbopackIgnore: true */ allowed.root, suffix);
  if (!target.startsWith(allowed.root) || !fs.existsSync(target)) notFound();

  const ext = path.extname(target);
  const type = ext === ".json" || ext === ".jsonl"
    ? "application/json; charset=utf-8"
    : ext === ".csv"
      ? "text/csv; charset=utf-8"
      : "text/plain; charset=utf-8";

  return new Response(fs.readFileSync(target), { headers: { "Content-Type": type } });
}
