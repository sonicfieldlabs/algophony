import { execSync } from "node:child_process";
import path from "node:path";
import { getProviderStatuses } from "../../lib/data";

const REPO_ROOT = path.resolve(process.cwd(), "../..");

export const dynamic = "force-dynamic";

export async function GET() {
  // Try static provider-status.json first (always safe for public)
  const staticProviders = getProviderStatuses();
  if (staticProviders.length > 0) {
    return Response.json(staticProviders);
  }

  // Fall back to dynamic Python probe (only useful locally)
  try {
    const result = execSync(
      `python3 -c "import sys; sys.path.insert(0, '.'); from workers.provider_registry import list_provider_statuses; import json; print(json.dumps(list_provider_statuses()))"`,
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        timeout: 15_000,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      },
    );
    const providers = JSON.parse(result);
    return Response.json(providers);
  } catch {
    return Response.json(
      { error: "Provider status unavailable." },
      { status: 500 },
    );
  }
}
