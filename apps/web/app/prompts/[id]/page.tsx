import { getPrompts, getGenerations, getReports, sourceTypeLabel } from "../../lib/data";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CopyButton } from "../../components/CopyButton";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return getPrompts().map((p) => ({ id: p.prompt_id }));
}

export default async function PromptDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompts = getPrompts();
  const prompt = prompts.find((p) => p.prompt_id === id);
  if (!prompt) notFound();

  const generations = getGenerations().filter((g) => g.prompt_id === id);
  const reports = getReports().filter((r) => r.prompt_id === id);

  return (
    <>
      <Breadcrumb items={[{ label: "Prompts", href: "/prompts" }, { label: prompt.prompt_id }]} />
      <div className="page-header">
        <h1 className="page-title">
          {prompt.prompt_id} <CopyButton value={prompt.prompt_id} />
        </h1>
        <p className="page-subtitle">
          <span className="badge badge-category">{prompt.category.replace(/_/g, " ")}</span>{" "}
          <span className={`badge badge-difficulty-${prompt.difficulty}`}>{prompt.difficulty}</span>
          {prompt.loop_required && (
            <span className="badge badge-loop" style={{ marginLeft: 4 }}>
              loop required
            </span>
          )}
        </p>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Prompt Text</div>
        <div className="card">
          <p className="prompt-text">{prompt.prompt_text}</p>
        </div>
      </div>

      <div className="compare-grid">
        <div className="detail-section">
          <div className="detail-section-title">Intended Sources</div>
          <div className="card">
            {prompt.intended_sources.map((s) => (
              <span key={s} className="source-tag source-intended">{s}</span>
            ))}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">Forbidden Sources</div>
          <div className="card">
            {prompt.forbidden_sources.length > 0 ? (
              prompt.forbidden_sources.map((s) => (
                <span key={s} className="source-tag source-forbidden">{s}</span>
              ))
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>None</span>
            )}
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Metadata</div>
        <div className="card">
          <div className="detail-row"><span className="detail-label">Location (imaginary)</span><span className="detail-value">{prompt.location_imaginary}</span></div>
          <div className="detail-row"><span className="detail-label">Listening mode</span><span className="detail-value">{prompt.listening_mode}</span></div>
          <div className="detail-row"><span className="detail-label">Duration target</span><span className="detail-value">{prompt.duration_target}s</span></div>
          <div className="detail-row"><span className="detail-label">Evaluation focus</span><span className="detail-value">{prompt.evaluation_focus.join(", ")}</span></div>
          <div className="detail-row"><span className="detail-label">Subcategories</span><span className="detail-value">{prompt.subcategories.join(", ")}</span></div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Generations ({generations.length})</div>
        {generations.length > 0 ? (
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audio ID</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.audio_id}>
                    <td>
                      <Link href={`/generations/${g.audio_id}`} className="mono-link">{g.audio_id}</Link>
                    </td>
                    <td>{g.model}</td>
                    <td>
                      <span className="badge badge-control">{sourceTypeLabel(g.source_type)}</span>
                    </td>
                    <td>{g.duration}s</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{g.generation_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <p style={{ color: "var(--text-muted)" }}>No generations yet.</p>
          </div>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Reports ({reports.length})</div>
        {reports.length > 0 ? (
          <div className="card-grid">
            {reports.map((r) => (
              <div className="card" key={r.report_id}>
                <div className="card-title">
                  {r.report_id} → {r.audio_id}
                </div>
                <div className="card-meta">
                  {r.listener_type} · {r.review_status} · {r.listening_date}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
                  {r.basic_description.slice(0, 150)}…
                </p>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge badge-${r.regeneration_recommendation}`}>{r.regeneration_recommendation}</span>
                  <Link href={`/reports/${r.report_id}`} className="inline-action">Open</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <p style={{ color: "var(--text-muted)" }}>No reports yet.</p>
          </div>
        )}
      </div>
    </>
  );
}
