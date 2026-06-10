import { SCORE_AXES, getPrompts, getReport, getReports } from "../../lib/data";
import { LISTENING_MODE_LABELS, type AkouoListeningMode } from "../../lib/listening-contract";
import { ScoreBar } from "../../components/ScoreBar";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CopyButton } from "../../components/CopyButton";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return getReports().map((report) => ({ id: report.report_id }));
}

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReport(id);
  if (!report) notFound();

  const prompt = getPrompts().find((item) => item.prompt_id === report.prompt_id);
  const scores = report.scores || report.score_sets.final_scores;
  const route = report.akouo_router_output;
  const modeOutputs = report.akouo_mode_outputs || [];
  const plan = report.akouo_routing_plan;
  const referenceMap = report.akouo_reference_map;

  return (
    <>
      <Breadcrumb items={[{ label: "Reports", href: "/reports" }, { label: report.report_id }]} />
      <div className="page-header">
        <h1 className="page-title">
          {report.report_id} <CopyButton value={report.report_id} />
        </h1>
        <p className="page-subtitle">
          <Link href={`/prompts/${report.prompt_id}`}>{report.prompt_id}</Link> →{" "}
          <Link href={`/generations/${report.audio_id}`}>{report.audio_id}</Link>{" "}
          · <span className={`badge badge-status-${report.review_status}`}>{report.review_status.replace(/_/g, " ")}</span>
        </p>
      </div>

      {prompt && (
        <div className="detail-section">
          <div className="detail-section-title">Prompt</div>
          <div className="card"><p className="prompt-text">{prompt.prompt_text}</p></div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">Description</div>
        <div className="card">
          <p className="body-copy">{report.basic_description}</p>
          <div style={{ marginTop: 12 }}>
            <span className={`badge badge-${report.regeneration_recommendation}`}>{report.regeneration_recommendation}</span>
            <span className="badge badge-control" style={{ marginLeft: 6 }}>{report.report_type.replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">AKOÚŌ Claim Taxonomy</div>
        {!route && !plan && (
          <div className="notice-card" style={{ marginBottom: 16 }}>
            This report preserves the AKOÚŌ claim taxonomy, but it predates the explicit router, routing-plan, and mode-output contract.
          </div>
        )}
        <div className="claim-grid">
          {Object.entries(report.claim_taxonomy).map(([bucket, claims]) => (
            <div className="card compact-card" key={bucket}>
              <div className="card-title">{bucket}</div>
              {claims.length ? (
                claims.map((claim, index) => (
                  <p className="claim-text" key={`${bucket}-${index}`}>
                    <span className="claim-confidence">{claim.confidence}</span> {claim.statement}
                    <span className="claim-basis">Basis: {claim.basis}</span>
                  </p>
                ))
              ) : (
                <p className="section-note">None recorded.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {route && (
        <div className="detail-section">
          <div className="detail-section-title">AKOÚŌ Route</div>
          <div className="card">
            <div className="detail-row"><span className="detail-label">Primary ear</span><span className="detail-value">{LISTENING_MODE_LABELS[route.primary_mode as AkouoListeningMode] || route.primary_mode}</span></div>
            <div className="detail-row"><span className="detail-label">Secondary ear</span><span className="detail-value">{LISTENING_MODE_LABELS[route.secondary_mode as AkouoListeningMode] || route.secondary_mode}</span></div>
            <div className="detail-row"><span className="detail-label">Corrective ear</span><span className="detail-value">{LISTENING_MODE_LABELS[route.corrective_mode as AkouoListeningMode] || route.corrective_mode}</span></div>
            <div style={{ marginTop: 12 }}>
              {route.route_reasoning.map((item) => <p className="section-note" key={item}>{item}</p>)}
            </div>
          </div>
        </div>
      )}

      {plan && (
        <div className="detail-section">
          <div className="detail-section-title">AKOÚŌ Routing Plan</div>
          <div className="card">
            <div className="detail-row"><span className="detail-label">Object</span><span className="detail-value">{plan.object_listened_to}</span></div>
            <div className="detail-row"><span className="detail-label">Evidence level</span><span className="detail-value">{plan.evidence_level.replace(/_/g, " ")}</span></div>
            <div className="detail-row"><span className="detail-label">Route confidence</span><span className="detail-value">{plan.route_confidence}</span></div>
            <div style={{ marginTop: 12 }}>
              <p className="source-heading">Mode chain</p>
              {plan.mode_chain.map((step) => (
                <p className="claim-text" key={`${step.role}-${step.mode}`}>
                  <span className="claim-confidence">{step.role}</span>{" "}
                  {LISTENING_MODE_LABELS[step.mode as AkouoListeningMode] || step.mode}
                  <span className="claim-basis">{step.reason}</span>
                </p>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <p className="source-heading">Claim permissions</p>
              {Object.entries(plan.claim_permissions).map(([permission, allowed]) => (
                <span key={permission} className="source-tag">
                  {permission.replace(/_/g, " ")}: {allowed ? "yes" : "no"}
                </span>
              ))}
            </div>
            {plan.stop_conditions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="source-heading">Stop conditions</p>
                {plan.stop_conditions.map((item) => <p className="section-note" key={item}>{item}</p>)}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <p className="source-heading">Agent handoff</p>
              <p className="body-copy">{plan.agent_handoff.summary}</p>
              {plan.agent_handoff.forbidden_assumptions.map((item) => (
                <p className="section-note" key={item}>Must not assume: {item}</p>
              ))}
              <p className="section-note">Recommended command: {plan.agent_handoff.recommended_command}</p>
            </div>
          </div>
        </div>
      )}

      {modeOutputs.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">AKOÚŌ Mode Outputs</div>
          <div className="card-grid">
            {modeOutputs.map((output) => (
              <div className="card" key={output.listening_mode}>
                <div className="card-title">{LISTENING_MODE_LABELS[output.listening_mode as AkouoListeningMode] || output.listening_mode}</div>
                <p className="body-copy">{output.main_reading}</p>
                <p className="section-note">{output.what_remains_hidden.join(" ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {referenceMap && (
        <div className="detail-section">
          <div className="detail-section-title">AKOÚŌ Reference Map</div>
          <div className="card">
            {([
              "concepts_triggered",
              "sonic_methodologies",
              "authors_or_traditions",
              "possible_research_routes",
              "research_questions",
              "cautions",
            ] as const).map((kind) =>
              referenceMap[kind].length > 0 ? (
                <div key={kind} style={{ marginBottom: 10 }}>
                  <p className="source-heading">{kind.replace(/_/g, " ")}</p>
                  {referenceMap[kind].map((item) => <span key={item} className="source-tag">{item}</span>)}
                </div>
              ) : null
            )}
            {referenceMap.adjacent_modes.length > 0 && (
              <div>
                <p className="source-heading">adjacent modes</p>
                {referenceMap.adjacent_modes.map((mode) => (
                  <span key={mode} className="source-tag">{LISTENING_MODE_LABELS[mode as AkouoListeningMode] || mode}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title">Final Scores</div>
        <div className="card">
          {SCORE_AXES.map((axis) => (
            <div className="detail-row" key={axis}>
              <span className="detail-label">{axis.replace(/_/g, " ")}</span>
              <span><ScoreBar value={typeof scores[axis] === "number" ? (scores[axis] as number) : null} axis={axis} /></span>
            </div>
          ))}
          <div className="detail-row">
            <span className="detail-label">regeneration potential</span>
            <span className="detail-value">{scores.regeneration_potential}</span>
          </div>
        </div>
      </div>

      <div className="compare-grid">
        <div className="detail-section">
          <div className="detail-section-title">Sources</div>
          <div className="card">
            {(["detected", "inferred", "absent_expected", "forbidden_detected", "hallucinated"] as const).map((kind) => (
              <div key={kind} style={{ marginBottom: 10 }}>
                <p className="source-heading">{kind.replace(/_/g, " ")}</p>
                {report.sources[kind].length ? (
                  report.sources[kind].map((source) => <span key={source} className="source-tag">{source}</span>)
                ) : (
                  <span className="section-note">None</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">Assessment</div>
          <div className="card">
            <p className="source-heading">Ecological plausibility</p>
            <p className="body-copy">{report.ecological_plausibility}</p>
            <p className="source-heading">Causal coherence</p>
            <p className="body-copy">{report.causal_coherence}</p>
            <p className="source-heading">Cultural assumptions</p>
            <p className="body-copy">{report.cultural_assumptions}</p>
          </div>
        </div>
      </div>

      <details className="detail-section" style={{ marginBottom: 28 }}>
        <summary className="detail-section-title" style={{ cursor: "pointer", listStyle: "revert" }}>
          Score Provenance ({report.score_provenance.length})
        </summary>
        <div className="card" style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr><th>Axis</th><th>Score</th><th>Scorer</th><th>Evidence</th><th>Confidence</th></tr>
            </thead>
            <tbody>
              {report.score_provenance.map((item) => (
                <tr key={item.axis}>
                  <td>{item.axis}</td>
                  <td className="mono-cell">{item.score}</td>
                  <td>{item.scorer}</td>
                  <td className="table-text">{item.evidence}</td>
                  <td>{item.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="detail-section">
        <div className="detail-section-title">Prompt Revision</div>
        <div className="card"><p className="body-copy">{report.suggested_prompt_revision}</p></div>
      </div>
    </>
  );
}
