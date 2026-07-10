import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { getProviderStatuses, getSuite } from "../lib/data";

const execFileAsync = promisify(execFile);
const REPO_ROOT = process.env.ALGOPHONY_DATA_ROOT || path.resolve(process.cwd(), "../..");

export const dynamic = "force-dynamic";

const DEFAULT_CHAIN = [
  "el_sfx",
  "stable_audio_3_stability_api",
  "stable_audio_25_stability_api",
  "stable_audio_25_fal",
  "stable_audio_25_replicate",
  "tangoflux_local",
  "stable_audio_open_local",
  "audiogen_local",
  "moss_sfx_mlx",
  "moss_sfx_local",
];

async function getLiveProviderStatuses() {
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
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : getProviderStatuses();
  } catch (err) {
    console.error("[providers page] live provider probe failed:", err);
    return getProviderStatuses();
  }
}

export default async function ProvidersPage() {
  const providers = await getLiveProviderStatuses();
  const suite = getSuite();
  const benchmarked = new Set((suite?.models_compared || []).map((model) => model.provider_id));
  const availableDefaults = DEFAULT_CHAIN.filter((id) => providers.find((provider) => provider.provider_id === id)?.status === "available");
  const grouped = {
    api: providers.filter((provider) => provider.runtime === "api"),
    local: providers.filter((provider) => provider.runtime === "local" && provider.type === "ml_model"),
    controls: providers.filter((provider) => provider.type !== "ml_model"),
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Providers</h1>
        <p className="page-subtitle">{providers.length} configured provider contracts · ElevenLabs / Stable Audio default chain</p>
      </div>

      {availableDefaults.length === 0 && (
        <div className="notice-card">
          No default ML/API provider is available. Configure ElevenLabs or another provider before running `generate_matrix.py` without `--providers`.
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{providers.filter((p) => p.status === "available").length}</div><div className="stat-label">Available</div></div>
        <div className="stat-card"><div className="stat-value">{providers.filter((p) => p.runtime === "api").length}</div><div className="stat-label">API providers</div></div>
        <div className="stat-card"><div className="stat-value">{providers.filter((p) => p.runtime === "local").length}</div><div className="stat-label">Local providers</div></div>
        <div className="stat-card"><div className="stat-value">{availableDefaults[0] || "none"}</div><div className="stat-label">Selected default</div></div>
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div className="detail-section" key={group}>
          <div className="detail-section-title">{group}</div>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Runtime</th>
                  <th>Version</th>
                  <th>Role</th>
                  <th>Config</th>
                </tr>
              </thead>
              <tbody>
                {items.map((provider) => (
                  <tr key={provider.provider_id}>
                    <td>
                      <strong>{provider.name}</strong>
                      <div className="mono-cell">{provider.provider_id}</div>
                      <div className="table-note">{provider.license_status}</div>
                    </td>
                    <td>
                      <span className={`badge badge-provider-${provider.status}`}>{provider.status.replace(/_/g, " ")}</span>
                      <div className="table-note">{provider.status_reason}</div>
                    </td>
                    <td><span className="badge badge-control">{provider.runtime}</span>{provider.openness && <div className="table-note">{provider.openness.replace(/_/g, " ")}</div>}</td>
                    <td className="mono-cell">{provider.version}</td>
                    <td>
                      {DEFAULT_CHAIN.includes(provider.provider_id) && <span className="badge badge-loop">default chain</span>}
                      {benchmarked.has(provider.provider_id) ? <span className="badge badge-keep" style={{ marginLeft: 4 }}>benchmarked</span> : <span className="badge badge-control" style={{ marginLeft: 4 }}>not benchmarked</span>}
                    </td>
                    <td className="table-text">
                      {provider.install_hint}
                      {provider.env_requirements.length > 0 && <div className="mono-cell">env: {provider.env_requirements.join(", ")}</div>}
                      {provider.optional_dependencies.length > 0 && <div className="mono-cell">deps: {provider.optional_dependencies.join(", ")}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
