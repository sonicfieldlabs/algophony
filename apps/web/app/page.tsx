import {
  CATEGORIES,
  SCORE_AXES,
  getGenerations,
  getPrompts,
  getReports,
  getScores,
  getSuite,
  modelTypeLabel,
} from "./lib/data";
import { ScoreBar } from "./components/ScoreBar";

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export default function Overview() {
  const prompts = getPrompts();
  const generations = getGenerations();
  const reports = getReports();
  const scores = getScores();
  const suite = getSuite();
  const reviewed = reports.filter(
    (report) => report.review_status === "hybrid_reviewed" || report.review_status === "human_reviewed",
  );

  const modelAvgs: Record<string, Record<string, number[]>> = {};
  for (const score of scores) {
    const provider = score.model.provider;
    modelAvgs[provider] ||= {};
    for (const axis of SCORE_AXES) {
      const value = score.final_scores[axis];
      if (typeof value === "number") {
        modelAvgs[provider][axis] ||= [];
        modelAvgs[provider][axis].push(value);
      }
    }
  }

  const categoryCounts: Record<string, number> = {};
  for (const prompt of prompts) categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
  const suiteTitle = suite?.title || "Algophony Framework";
  const benchmarkStatus = suite?.benchmark_status?.replace(/_/g, " ") || "public code release";
  const dataMode = suite ? "Local corpus mounted" : "Code-only checkout";

  return (
    <>
      <section className="bench-hero">
        <div>
          <p className="bench-eyebrow">Benchmark workspace</p>
          <h1 className="page-title">Algophony Bench Dashboard</h1>
          <p className="page-subtitle">
            Studio-aligned benchmark controls for inspecting Atlas coverage, AKOUO listening reports, provider status,
            and model score provenance.
          </p>
        </div>
        <div className="bench-hero-panel">
          <span className="status-pill">{benchmarkStatus}</span>
          <div className="bench-metadata">
            <div className="bench-metadata-row">
              <span className="bench-metadata-label">Suite</span>
              <span className="bench-metadata-value">{suiteTitle}</span>
            </div>
            <div className="bench-metadata-row">
              <span className="bench-metadata-label">Data</span>
              <span className="bench-metadata-value">{dataMode}</span>
            </div>
            <div className="bench-metadata-row">
              <span className="bench-metadata-label">ML generations</span>
              <span className="bench-metadata-value">{suite?.ml_generation_count || 0}</span>
            </div>
          </div>
        </div>
      </section>

      {!suite && prompts.length === 0 && (
        <div className="notice-card">
          No local corpus is mounted. The public code release ships empty by design; set `ALGOPHONY_DATA_ROOT` to inspect
          local research data.
        </div>
      )}

      {suite?.benchmark_status === "procedural_pilot" && (
        <div className="notice-card">
          This release is a procedural pilot. It validates the Atlas, reports, score provenance, and dashboard before ML
          text-to-audio generations are published.
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{prompts.length}</div>
          <div className="stat-label">Prompts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{generations.length}</div>
          <div className="stat-label">Generations</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{reports.length}</div>
          <div className="stat-label">Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{reviewed.length}</div>
          <div className="stat-label">Reviewed seed reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{suite?.ml_generation_count || 0}</div>
          <div className="stat-label">ML generations</div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Model Comparison</div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                {SCORE_AXES.map((axis) => (
                  <th key={axis}>{axis.replace(/_/g, " ").replace("score", "").trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(modelAvgs).map(([model, axes]) => (
                <tr key={model}>
                  <td>
                    <strong>{model}</strong>
                    <div className="table-note">{modelTypeLabel(model)}</div>
                  </td>
                  {SCORE_AXES.map((axis) => (
                    <td key={axis}>
                      <ScoreBar value={avg(axes[axis] || [])} axis={axis} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="section-note">Positive axes: higher is better. Risk indices: lower is better.</p>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Atlas Distribution</div>
        <div className="card-grid">
          {CATEGORIES.map((category) => (
            <div className="card compact-card" key={category}>
              <div className="card-title">{category.replace(/_/g, " ")}</div>
              <div className="card-meta">
                {categoryCounts[category] || 0} prompts ·{" "}
                {(categoryCounts[category] || 0) * Object.keys(modelAvgs).length} generations
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
