import { getSuite, getReports, getGenerations } from "../lib/data";

export default function BenchmarkPage() {
  const suite = getSuite();
  const reports = getReports();
  const generations = getGenerations();

  // Compute source distribution
  const sourceCounts: Record<string, number> = {};
  generations.forEach((g) => {
    sourceCounts[g.source_type] = (sourceCounts[g.source_type] || 0) + 1;
  });

  // Compute Turing index
  const turingReports = reports.filter((r) => r.source_type_ground_truth && r.source_type_listener_guess);
  const correctGuesses = turingReports.filter((r) => {
    if (r.source_type_listener_guess === "generated" && r.source_type_ground_truth?.startsWith("generated")) return true;
    if (r.source_type_listener_guess === "field_recording" && r.source_type_ground_truth === "field_recording") return true;
    return false;
  });
  const turingIndex = turingReports.length > 0 ? ((correctGuesses.length / turingReports.length) * 100).toFixed(1) : "—";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Algophony Bench Dashboard</h1>
        <p className="page-subtitle">{suite ? `${suite.title} · ${suite.benchmark_status.replace(/_/g, " ")}` : "No benchmark suite mounted"}</p>
      </div>
      {!suite && (
        <div className="notice-card">
          No benchmark suite data is mounted. Public code exports include benchmark machinery without local result data.
        </div>
      )}
      <div className="notice-card">
        This suite is currently labeled as a procedural pilot. It should not be presented as an ML model leaderboard until ML generations are added.
      </div>
      <div className="compare-grid">
        <div className="detail-section">
          <div className="detail-section-title">Coverage</div>
          <div className="card">
            <div className="detail-row"><span className="detail-label">Generations</span><span className="detail-value">{suite?.total_generations}</span></div>
            <div className="detail-row"><span className="detail-label">Reports</span><span className="detail-value">{suite?.total_reports}</span></div>
            <div className="detail-row"><span className="detail-label">Procedural</span><span className="detail-value">{suite?.procedural_generation_count}</span></div>
            <div className="detail-row"><span className="detail-label">ML</span><span className="detail-value">{suite?.ml_generation_count}</span></div>
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">Models</div>
          <div className="card">
            {(suite?.models_compared || []).map((model) => (
              <div className="detail-row" key={model.provider_id}>
                <span className="detail-label">{model.name}</span>
                <span className="detail-value">{model.type} · {model.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="compare-grid">
        <div className="detail-section">
          <div className="detail-section-title">Source Provenance</div>
          <div className="card">
            {Object.entries(sourceCounts).map(([st, count]) => (
              <div className="detail-row" key={st}>
                <span className="detail-label">{st.replace(/_/g, " ")}</span>
                <span className="detail-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">Turing Index</div>
          <div className="card">
            <div className="detail-row">
              <span className="detail-label">Reports with guess</span>
              <span className="detail-value">{turingReports.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Correct identifications</span>
              <span className="detail-value">{correctGuesses.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Accuracy</span>
              <span className="detail-value" style={{ fontSize: 18, fontWeight: 700 }}>{turingIndex}{turingReports.length > 0 ? "%" : ""}</span>
            </div>
            {turingReports.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                No discriminability data yet. Upload field recordings in the Playground and answer the Turing question.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="detail-section">
        <div className="detail-section-title">Score Axes</div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr><th>Axis</th><th>Range</th><th>Direction</th><th>Description</th></tr></thead>
            <tbody>
              {(suite?.score_axes || []).map((axis) => (
                <tr key={axis.axis}>
                  <td>{axis.axis}</td>
                  <td>{axis.range.join("-")}</td>
                  <td>{axis.direction.replace(/_/g, " ")}</td>
                  <td className="table-text">{axis.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contribute — integrated from Collaborate */}
      <div className="detail-section">
        <div className="detail-section-title">Contribute</div>
        <div className="card-grid">
          {[
            ["Prompt", "Submit a structured soundscape prompt with intended and forbidden sources."],
            ["Listening annotation", "Add human or hybrid review notes using the AKOÚŌ claim taxonomy."],
            ["Model output", "Contribute generated audio with model version, parameters, checksum, and license status."],
            ["Correction", "Report metadata, score, schema, or documentation issues."],
          ].map(([title, body]) => (
            <div className="card" key={title}>
              <div className="card-title">{title}</div>
              <p className="body-copy">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
