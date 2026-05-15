"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ---------- types ---------- */

interface Prompt {
  prompt_id: string;
  category: string;
}

interface Report {
  report_id: string;
  audio_id: string;
  prompt_id: string;
  listener_type: string;
  review_status: string;
  listening_process?: string;
  source_type_ground_truth?: string | null;
  regeneration_recommendation: string;
  scores: Record<string, number | string | null>;
  score_sets?: { final_scores: Record<string, number | string | null> };
}

interface Generation {
  audio_id: string;
  source_type: string;
}

/* ---------- constants ---------- */

const SCORE_AXES = [
  "prompt_adherence", "source_accuracy", "spatial_coherence",
  "event_density_score", "ecological_plausibility",
];
const RISK_AXES_SET = new Set(["false_source_index", "generic_naturalism_index", "cultural_cliche_index"]);

const SOURCE_TYPES = [
  { value: "", label: "All sources" },
  { value: "generated_procedural", label: "Generated (Procedural)" },
  { value: "generated_ml", label: "Generated (ML)" },
  { value: "field_recording", label: "Field Recording" },
  { value: "found_sound", label: "Found Sound" },
  { value: "hybrid", label: "Hybrid" },
];
const LISTENER_TYPES = [
  { value: "", label: "All listeners" },
  { value: "human", label: "Human" },
  { value: "agent", label: "Agent" },
  { value: "hybrid", label: "Hybrid" },
];
const LISTENING_PROCESSES = [
  { value: "", label: "All processes" },
  { value: "agent_automated", label: "Agent (Automated)" },
  { value: "agent_interactive", label: "Agent (Interactive)" },
  { value: "human_blind", label: "Human (Blind)" },
  { value: "human_informed", label: "Human (Informed)" },
  { value: "hybrid", label: "Hybrid" },
];
const REVIEW_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "agent_draft", label: "Agent Draft" },
  { value: "human_reviewed", label: "Human Reviewed" },
  { value: "hybrid_reviewed", label: "Hybrid Reviewed" },
  { value: "playground_draft", label: "Playground Draft" },
];

/* ---------- score bar ---------- */

function ScoreBar({ value, axis }: { value: number; axis: string }) {
  const pct = (value / 5) * 100;
  const risk = RISK_AXES_SET.has(axis);
  const level = risk ? (value <= 1 ? "high" : value <= 2.5 ? "mid" : "low") : (value <= 2 ? "low" : value <= 3.5 ? "mid" : "high");
  return (
    <span className="score-bar">
      <span className="score-value">{value}</span>
      <span className="score-bar-track"><span className="score-bar-fill" style={{ width: `${pct}%` }} data-level={level}></span></span>
    </span>
  );
}

/* ---------- component ---------- */

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  /* filters */
  const [filterSource, setFilterSource] = useState("");
  const [filterListener, setFilterListener] = useState("");
  const [filterProcess, setFilterProcess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then((r) => r.json()),
      fetch("/api/prompts").then((r) => r.json()),
      fetch("/api/generations").then((r) => r.json()),
    ]).then(([r, p, g]) => {
      setReports(Array.isArray(r) ? r : []);
      setPrompts(Array.isArray(p) ? p : []);
      setGenerations(Array.isArray(g) ? g : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const promptMap = useMemo(() => Object.fromEntries(prompts.map((p) => [p.prompt_id, p])), [prompts]);
  const genMap = useMemo(() => Object.fromEntries(generations.map((g) => [g.audio_id, g])), [generations]);

  const categories = useMemo(() => {
    const cats = new Set(prompts.map((p) => p.category));
    return ["", ...Array.from(cats).sort()];
  }, [prompts]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filterListener && r.listener_type !== filterListener) return false;
      if (filterProcess && r.listening_process !== filterProcess) return false;
      if (filterStatus && r.review_status !== filterStatus) return false;
      if (filterCategory) {
        const prompt = promptMap[r.prompt_id];
        if (!prompt || prompt.category !== filterCategory) return false;
      }
      if (filterSource) {
        const gen = genMap[r.audio_id];
        if (!gen || gen.source_type !== filterSource) return false;
      }
      return true;
    });
  }, [reports, filterSource, filterListener, filterProcess, filterStatus, filterCategory, promptMap, genMap]);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Listening Reports</h1>
          <p className="page-subtitle">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Listening Reports</h1>
        <p className="page-subtitle">
          {filtered.length} of {reports.length} reports
          {filterSource || filterListener || filterProcess || filterStatus || filterCategory ? " (filtered)" : ""}
        </p>
      </div>
      {reports.length === 0 && (
        <div className="notice-card">
          No listening reports are mounted. Public code exports exclude the local report corpus.
        </div>
      )}

      {/* filter panel */}
      <div className="card" style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select className="pg-select" style={{ minWidth: 150 }} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            {SOURCE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="pg-select" style={{ minWidth: 130 }} value={filterListener} onChange={(e) => setFilterListener(e.target.value)}>
            {LISTENER_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="pg-select" style={{ minWidth: 150 }} value={filterProcess} onChange={(e) => setFilterProcess(e.target.value)}>
            {LISTENING_PROCESSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="pg-select" style={{ minWidth: 130 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {REVIEW_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="pg-select" style={{ minWidth: 130 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c ? c.replace(/_/g, " ") : "All categories"}</option>)}
          </select>
          {(filterSource || filterListener || filterProcess || filterStatus || filterCategory) && (
            <button
              type="button"
              className="pg-btn pg-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => { setFilterSource(""); setFilterListener(""); setFilterProcess(""); setFilterStatus(""); setFilterCategory(""); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Prompt</th>
              <th>Audio</th>
              <th>Source</th>
              <th>Category</th>
              <th>Listener</th>
              <th>Status</th>
              <th>Rec.</th>
              {SCORE_AXES.map((axis) => <th key={axis}>{axis.replace(/_/g, " ").replace("score", "").trim().slice(0, 12)}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((report) => {
              const prompt = promptMap[report.prompt_id];
              const gen = genMap[report.audio_id];
              const scores = report.scores || report.score_sets?.final_scores;
              return (
                <tr key={report.report_id}>
                  <td><Link href={`/reports/${report.report_id}`} className="mono-link">{report.report_id}</Link></td>
                  <td><Link href={`/prompts/${report.prompt_id}`} className="mono-link">{report.prompt_id}</Link></td>
                  <td><Link href={`/generations/${report.audio_id}`} className="mono-link muted-link">{report.audio_id}</Link></td>
                  <td>{gen && <span className="badge badge-category">{gen.source_type.replace(/_/g, " ").replace("generated ", "gen.")}</span>}</td>
                  <td>{prompt && <span className="badge badge-category">{prompt.category.replace(/_/g, " ")}</span>}</td>
                  <td><span className="badge badge-category">{report.listener_type}</span></td>
                  <td><span className={`badge badge-status-${report.review_status}`}>{report.review_status.replace(/_/g, " ")}</span></td>
                  <td><span className={`badge badge-${report.regeneration_recommendation}`}>{report.regeneration_recommendation}</span></td>
                  {SCORE_AXES.map((axis) => {
                    const value = scores?.[axis];
                    return <td key={axis}>{typeof value === "number" ? <ScoreBar value={value} axis={axis} /> : "-"}</td>;
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
