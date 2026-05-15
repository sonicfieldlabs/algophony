import { getPrompts, getGenerations, getReports, getScores, getSuite, SCORE_AXES, CATEGORIES } from "./lib/data";

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const cls = value <= 2 ? "low" : value <= 3.5 ? "mid" : "high";
  return (
    <span className="score-bar">
      <span className="score-value">{value}</span>
      <span className="score-bar-track">
        <span className="score-bar-fill" style={{ width: `${pct}%` }} data-level={cls}></span>
      </span>
    </span>
  );
}

export default function Overview() {
  const prompts = getPrompts();
  const generations = getGenerations();
  const reports = getReports();
  const scores = getScores();
  const suite = getSuite();

  const models = suite?.models_compared.filter((m) => m.status !== "pending") || [];

  // Compute per-model averages
  const modelAvgs: Record<string, Record<string, number>> = {};
  for (const s of scores) {
    const provider = typeof s.model === "object" ? s.model.provider : String(s.model);
    if (!modelAvgs[provider]) modelAvgs[provider] = {};
    for (const axis of SCORE_AXES) {
      const val = s.scores[axis];
      if (typeof val === "number") {
        if (!modelAvgs[provider][axis]) modelAvgs[provider][axis] = 0;
        modelAvgs[provider][axis] += val;
      }
    }
  }
  const modelCounts: Record<string, number> = {};
  for (const s of scores) {
    const provider = typeof s.model === "object" ? s.model.provider : String(s.model);
    modelCounts[provider] = (modelCounts[provider] || 0) + 1;
  }
  for (const m of Object.keys(modelAvgs)) {
    for (const axis of Object.keys(modelAvgs[m])) {
      modelAvgs[m][axis] = Math.round((modelAvgs[m][axis] / modelCounts[m]) * 100) / 100;
    }
  }

  // Category distribution
  const catCounts: Record<string, number> = {};
  for (const p of prompts) catCounts[p.category] = (catCounts[p.category] || 0) + 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Algophony Benchmark Dashboard</h1>
        <p className="page-subtitle">Text-to-soundscape generation benchmark — {suite?.version || "v0.1"}</p>
      </div>

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
          <div className="stat-value">{Object.keys(modelAvgs).length}</div>
          <div className="stat-label">Models</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{CATEGORIES.length}</div>
          <div className="stat-label">Categories</div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Model Comparison</div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                {SCORE_AXES.map((a) => <th key={a}>{a.replace(/_/g, " ").replace("score", "").trim()}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(modelAvgs).map(([model, axes]) => (
                <tr key={model}>
                  <td style={{ fontWeight: 600 }}>{model}</td>
                  {SCORE_AXES.map((a) => (
                    <td key={a}>
                      <ScoreBar value={axes[a] || 0} max={a.includes("index") ? 5 : 5} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Category Distribution</div>
        <div className="card-grid">
          {CATEGORIES.map((cat) => (
            <div className="card" key={cat}>
              <div className="card-title" style={{ textTransform: "capitalize" }}>
                {cat.replace(/_/g, " ")}
              </div>
              <div className="card-meta">{catCounts[cat] || 0} prompts · {(catCounts[cat] || 0) * Object.keys(modelAvgs).length} generations</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
