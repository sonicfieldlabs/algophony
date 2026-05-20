import { getGeneration, getGenerations, getPrompt, getReportsForAudio, modelTypeLabel } from "../../lib/data";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CopyButton } from "../../components/CopyButton";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return getGenerations().map((generation) => ({ id: generation.audio_id }));
}

export default async function GenerationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = getGeneration(id);
  if (!generation) notFound();

  const prompt = getPrompt(generation.prompt_id);
  const reports = getReportsForAudio(generation.audio_id);

  return (
    <>
      <Breadcrumb items={[{ label: "Generations", href: "/generations" }, { label: generation.audio_id }]} />
      <div className="page-header">
        <h1 className="page-title">
          {generation.audio_id} <CopyButton value={generation.audio_id} />
        </h1>
        <p className="page-subtitle">
          <span className="badge badge-control">{modelTypeLabel(generation.model)}</span>{" "}
          {generation.model} · {generation.model_version}
        </p>
      </div>

      {prompt && (
        <div className="detail-section">
          <div className="detail-section-title">Prompt</div>
          <div className="card">
            <Link href={`/prompts/${prompt.prompt_id}`} className="mono-link">{prompt.prompt_id}</Link>
            <p className="prompt-text" style={{ marginTop: 10 }}>{prompt.prompt_text}</p>
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">Audio</div>
        <div className="card">
          <audio controls preload="metadata" src={`/audio/${generation.audio_id}`} style={{ width: "100%" }} />
          <p className="section-note">Local audio is served from the gitignored `generations/audio` directory.</p>
        </div>
      </div>

      <div className="compare-grid">
        <div className="detail-section">
          <div className="detail-section-title">Metadata</div>
          <div className="card">
            <div className="detail-row"><span className="detail-label">Model</span><span className="detail-value">{generation.model}</span></div>
            <div className="detail-row"><span className="detail-label">Version</span><span className="detail-value">{generation.model_version}</span></div>
            <div className="detail-row"><span className="detail-label">Duration</span><span className="detail-value">{generation.duration}s</span></div>
            <div className="detail-row"><span className="detail-label">Format</span><span className="detail-value">{generation.file_format}</span></div>
            <div className="detail-row"><span className="detail-label">Seed</span><span className="detail-value">{generation.seed ?? "random"}</span></div>
            <div className="detail-row"><span className="detail-label">Storage</span><span className="detail-value">{generation.storage_uri}</span></div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">Integrity</div>
          <div className="card">
            <div className="detail-row">
              <span className="detail-label">SHA-256</span>
              <span className="detail-value hash-value">
                {generation.sha256} <CopyButton value={generation.sha256} />
              </span>
            </div>
            <div className="detail-row"><span className="detail-label">License</span><span className="detail-value">{generation.license_status}</span></div>
            <div className="detail-row"><span className="detail-label">Report link</span><span className="detail-value">{generation.akouo_report_id}</span></div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Reports</div>
        {reports.length > 0 ? (
          <div className="card-grid">
            {reports.map((report) => (
              <div className="card compact-card" key={report.report_id}>
                <div className="card-title">
                  <Link href={`/reports/${report.report_id}`}>{report.report_id}</Link>
                </div>
                <div className="card-meta">{report.review_status} · {report.regeneration_recommendation}</div>
                <p className="table-text" style={{ marginTop: 8 }}>{report.basic_description}</p>
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
