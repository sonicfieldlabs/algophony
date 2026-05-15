import { CATEGORIES, POSITIVE_AXES, RISK_AXES, SCORE_AXES, axisDirection, getPrompts, getScores } from "../lib/data";

function avg(nums: number[]): number {
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : 0;
}

function composite(axes: Record<string, number[]>): number {
  const positive = POSITIVE_AXES.map((axis) => avg(axes[axis] || [])).filter((value) => value > 0);
  const risks = RISK_AXES.map((axis) => avg(axes[axis] || []));
  const positiveNorm = positive.length ? positive.reduce((sum, value) => sum + (value - 1) / 4, 0) / positive.length : 0;
  const riskNorm = risks.length ? risks.reduce((sum, value) => sum + value / 5, 0) / risks.length : 0;
  return Math.round((positiveNorm * 0.72 + (1 - riskNorm) * 0.28) * 10000) / 100;
}

function ScoreBar({ value, axis }: { value: number; axis: string }) {
  const pct = (value / 5) * 100;
  const risk = axisDirection(axis) === "risk";
  const level = risk ? (value <= 1 ? "high" : value <= 2.5 ? "mid" : "low") : (value <= 2 ? "low" : value <= 3.5 ? "mid" : "high");
  return (
    <span className="score-bar">
      <span className="score-value">{value}</span>
      <span className="score-bar-track"><span className="score-bar-fill" style={{ width: `${pct}%` }} data-level={level}></span></span>
    </span>
  );
}

export default function ComparisonPage() {
  const scores = getScores();
  const promptMap = Object.fromEntries(getPrompts().map((prompt) => [prompt.prompt_id, prompt]));
  const models = [...new Set(scores.map((score) => score.model.provider))];

  const modelGlobal: Record<string, Record<string, number[]>> = {};
  const modelCategory: Record<string, Record<string, Record<string, number[]>>> = {};

  for (const score of scores) {
    const model = score.model.provider;
    const category = promptMap[score.prompt_id]?.category || "unknown";
    modelGlobal[model] ||= {};
    modelCategory[model] ||= {};
    modelCategory[model][category] ||= {};
    for (const axis of SCORE_AXES) {
      const value = score.final_scores[axis];
      if (typeof value === "number") {
        modelGlobal[model][axis] ||= [];
        modelCategory[model][category][axis] ||= [];
        modelGlobal[model][axis].push(value);
        modelCategory[model][category][axis].push(value);
      }
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Model Comparison</h1>
        <p className="page-subtitle">{models.length} procedural controls · {scores.length} score records · risk indices are lower-is-better</p>
      </div>
      {scores.length === 0 && (
        <div className="notice-card">
          No score records are mounted. Public code exports include comparison code without local benchmark results.
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">Overall Scores</div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Composite 0-100</th>
                {SCORE_AXES.map((axis) => <th key={axis}>{axis.replace(/_/g, " ").replace("score", "").trim().slice(0, 14)}</th>)}
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model}>
                  <td><strong>{model}</strong><div className="table-note">procedural control</div></td>
                  <td><span className="composite-score">{composite(modelGlobal[model])}</span></td>
                  {SCORE_AXES.map((axis) => <td key={axis}><ScoreBar value={avg(modelGlobal[model][axis] || [])} axis={axis} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Per-Category Breakdown</div>
        {CATEGORIES.map((category) => (
          <div key={category} style={{ marginBottom: 16 }}>
            <h3 className="subheading">{category.replace(/_/g, " ")}</h3>
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    {["prompt_adherence", "spatial_coherence", "event_density_score", "ecological_plausibility", "generic_naturalism_index", "loopability"].map((axis) => (
                      <th key={axis}>{axis.replace(/_/g, " ").replace("score", "").trim().slice(0, 14)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => {
                    const categoryData = modelCategory[model]?.[category] || {};
                    return (
                      <tr key={model}>
                        <td>{model}</td>
                        {["prompt_adherence", "spatial_coherence", "event_density_score", "ecological_plausibility", "generic_naturalism_index", "loopability"].map((axis) => (
                          <td key={axis}><ScoreBar value={avg(categoryData[axis] || [])} axis={axis} /></td>
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
    </>
  );
}
