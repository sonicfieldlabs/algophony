import { getReports, getPrompts, SCORE_AXES } from "../lib/data";
import Link from "next/link";

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

export default function ReportsPage() {
  const reports = getReports();
  const promptMap = Object.fromEntries(getPrompts().map((p) => [p.prompt_id, p]));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Listening Reports</h1>
        <p className="page-subtitle">{reports.length} reports with AKOÚŌ claim taxonomy</p>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Prompt</th>
              <th>Audio</th>
              <th>Category</th>
              <th>Rec.</th>
              {SCORE_AXES.slice(0, 5).map((a) => (
                <th key={a}>{a.replace(/_/g, " ").replace("score", "").trim().slice(0, 12)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const prompt = promptMap[r.prompt_id];
              const scores = r.scores || {};
              return (
                <tr key={r.report_id}>
                  <td>
                    <Link href={`/reports/${r.report_id}`} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {r.report_id}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/prompts/${r.prompt_id}`} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {r.prompt_id}
                    </Link>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{r.audio_id}</td>
                  <td>{prompt && <span className="badge badge-category">{prompt.category.replace(/_/g, " ")}</span>}</td>
                  <td><span className={`badge badge-${r.regeneration_recommendation}`}>{r.regeneration_recommendation}</span></td>
                  {SCORE_AXES.slice(0, 5).map((a) => {
                    const val = scores[a];
                    return (
                      <td key={a}>
                        {typeof val === "number" ? <ScoreBar value={val} /> : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
