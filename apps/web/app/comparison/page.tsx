import { getScores, getPrompts, SCORE_AXES, CATEGORIES } from "../lib/data";

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

function avg(nums: number[]): number {
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : 0;
}

export default function ComparisonPage() {
  const scores = getScores();
  const prompts = getPrompts();
  const promptMap = Object.fromEntries(prompts.map((p) => [p.prompt_id, p]));

  // Identify models
  const models = [...new Set(scores.map((s) => (typeof s.model === "object" ? s.model.provider : String(s.model))))];

  // Per-model global averages
  const modelGlobal: Record<string, Record<string, number[]>> = {};
  for (const s of scores) {
    const m = typeof s.model === "object" ? s.model.provider : String(s.model);
    if (!modelGlobal[m]) modelGlobal[m] = {};
    for (const axis of SCORE_AXES) {
      const val = s.scores[axis];
      if (typeof val === "number") {
        if (!modelGlobal[m][axis]) modelGlobal[m][axis] = [];
        modelGlobal[m][axis].push(val);
      }
    }
  }

  // Per-model per-category
  const modelCategory: Record<string, Record<string, Record<string, number[]>>> = {};
  for (const s of scores) {
    const m = typeof s.model === "object" ? s.model.provider : String(s.model);
    const cat = promptMap[s.prompt_id]?.category || "unknown";
    if (!modelCategory[m]) modelCategory[m] = {};
    if (!modelCategory[m][cat]) modelCategory[m][cat] = {};
    for (const axis of SCORE_AXES) {
      const val = s.scores[axis];
      if (typeof val === "number") {
        if (!modelCategory[m][cat][axis]) modelCategory[m][cat][axis] = [];
        modelCategory[m][cat][axis].push(val);
      }
    }
  }

  // Compute composite score
  const composite = (axes: Record<string, number[]>): number => {
    const positiveAxes = ["prompt_adherence", "source_accuracy", "spatial_coherence", "event_density_score", "ecological_plausibility", "causal_coherence", "loopability"];
    const negativeAxes = ["false_source_index", "generic_naturalism_index", "cultural_cliche_index"];
    let score = 0;
    for (const a of positiveAxes) score += avg(axes[a] || []);
    for (const a of negativeAxes) score -= avg(axes[a] || []);
    return Math.round(score * 100) / 100;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Model Comparison</h1>
        <p className="page-subtitle">{models.length} models · {scores.length} score records · {CATEGORIES.length} categories</p>
      </div>

      {/* Global comparison */}
      <div className="detail-section">
        <div className="detail-section-title">Overall Scores</div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Composite</th>
                {SCORE_AXES.map((a) => <th key={a}>{a.replace(/_/g, " ").replace("score", "").trim().slice(0, 14)}</th>)}
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m}</td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>
                      {composite(modelGlobal[m])}
                    </span>
                  </td>
                  {SCORE_AXES.map((a) => (
                    <td key={a}><ScoreBar value={avg(modelGlobal[m][a] || [])} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-category comparison */}
      <div className="detail-section">
        <div className="detail-section-title">Per-Category Breakdown</div>
        {CATEGORIES.map((cat) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textTransform: "capitalize", color: "var(--text-secondary)" }}>
              {cat.replace(/_/g, " ")}
            </h3>
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    {["prompt_adherence", "spatial_coherence", "event_density_score", "ecological_plausibility", "loopability"].map((a) => (
                      <th key={a}>{a.replace(/_/g, " ").replace("score", "").trim().slice(0, 14)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => {
                    const catData = modelCategory[m]?.[cat] || {};
                    return (
                      <tr key={m}>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{m}</td>
                        {["prompt_adherence", "spatial_coherence", "event_density_score", "ecological_plausibility", "loopability"].map((a) => (
                          <td key={a}><ScoreBar value={avg(catData[a] || [])} /></td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Methodology note */}
      <div className="detail-section">
        <div className="detail-section-title">Methodology</div>
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            Scores computed from automated signal-level analysis using librosa feature extraction.
            Both procedural baselines establish the floor for comparison with ML-based generation models.
            Composite score = Σ(positive axes) − Σ(negative indices). Range: theoretical −15 to +35.
            Positive axes (1–5): prompt adherence, source accuracy, spatial coherence, event density,
            ecological plausibility, causal coherence, loopability.
            Negative axes (0–5): false source index, generic naturalism index, cultural cliché index.
          </p>
        </div>
      </div>
    </>
  );
}
