import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { getProviderStatuses } from "../../lib/data";

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(process.cwd(), "../..");

export const dynamic = "force-dynamic";

export async function GET() {
  const staticProviders = getProviderStatuses();

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [
        "-c",
        "import sys; sys.path.insert(0, '.'); from workers.provider_registry import list_provider_statuses; import json; print(json.dumps(list_provider_statuses()))",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        timeout: 15_000,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      },
    );
    const providers = JSON.parse(stdout);
    return Response.json(providers);
  } catch (err) {
    console.error("[providers] probe failed:", err);
    if (staticProviders.length > 0) {
      return Response.json(staticProviders, { headers: { "x-algophony-provider-status": "static-fallback" } });
    }
    return Response.json({ error: "Provider status unavailable." }, { status: 500 });
  }
}
