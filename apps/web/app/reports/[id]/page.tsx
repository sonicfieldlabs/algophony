import { getReports, getPrompts, SCORE_AXES } from "../../lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return getReports().map((r) => ({ id: r.report_id }));
}

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

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReports().find((r) => r.report_id === id);
  if (!report) notFound();

  const prompt = getPrompts().find((p) => p.prompt_id === report.prompt_id);
  const scores = report.scores || {};

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{report.report_id}</h1>
        <p className="page-subtitle">
          <Link href={`/prompts/${report.prompt_id}`}>{report.prompt_id}</Link>
          {" → "}{report.audio_id}
          {" · "}
          <span className={`badge badge-${report.regeneration_recommendation}`}>{report.regeneration_recommendation}</span>
        </p>
      </div>

      {prompt && (
        <div className="detail-section">
          <div className="detail-section-title">Prompt</div>
          <div className="card">
            <p className="prompt-text">{prompt.prompt_text}</p>
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">Description</div>
        <div className="card">
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{report.basic_description}</p>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Scores</div>
        <div className="card">
          {SCORE_AXES.map((axis) => {
            const val = scores[axis];
            return (
              <div className="detail-row" key={axis}>
                <span className="detail-label">{axis.replace(/_/g, " ")}</span>
                <span>{typeof val === "number" ? <ScoreBar value={val} /> : String(val || "—")}</span>
              </div>
            );
          })}
          <div className="detail-row">
            <span className="detail-label">regeneration potential</span>
            <span className="detail-value">{String(scores.regeneration_potential || "—")}</span>
          </div>
        </div>
      </div>

      <div className="compare-grid">
        <div className="detail-section">
          <div className="detail-section-title">Sources</div>
          <div className="card">
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Detected:</p>
            {report.sources?.detected?.length
              ? report.sources.detected.map((s) => <span key={s} className="source-tag source-intended">{s}</span>)
              : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None</span>}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, marginBottom: 8 }}>Inferred:</p>
            {report.sources?.inferred?.map((s) => <span key={s} className="source-tag" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>{s}</span>)}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, marginBottom: 8 }}>Absent expected:</p>
            {report.sources?.absent_expected?.length
              ? report.sources.absent_expected.map((s) => <span key={s} className="source-tag source-absent">{s}</span>)
              : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None</span>}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">Assessment</div>
          <div className="card">
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Ecological Plausibility:</p>
            <p style={{ fontSize: 13, marginBottom: 12 }}>{report.ecological_plausibility}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Causal Coherence:</p>
            <p style={{ fontSize: 13, marginBottom: 12 }}>{report.causal_coherence}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Prompt Comparison:</p>
            <p style={{ fontSize: 13 }}>{report.prompt_comparison}</p>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Metadata</div>
        <div className="card">
          <div className="detail-row"><span className="detail-label">Listener</span><span className="detail-value">{report.listener_type}</span></div>
          <div className="detail-row"><span className="detail-label">Date</span><span className="detail-value">{report.listening_date}</span></div>
          <div className="detail-row"><span className="detail-label">Audio ID</span><span className="detail-value">{report.audio_id}</span></div>
        </div>
      </div>
    </>
  );
}
