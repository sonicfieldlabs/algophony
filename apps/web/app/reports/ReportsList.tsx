"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ScoreBar } from "../components/ScoreBar";

interface LeanReport {
  report_id: string;
  audio_id: string;
  prompt_id: string;
  listener_type: string;
  review_status: string;
  listening_process?: string;
  regeneration_recommendation: string;
  scores: Record<string, number | string | null> | null;
}

const SCORE_AXES = [
  "prompt_adherence",
  "source_accuracy",
  "spatial_coherence",
  "event_density_score",
  "ecological_plausibility",
];

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

const PAGE_SIZE = 50;

export default function ReportsList({
  reports,
  promptMap,
  genMap,
  categories,
  totalReports,
}: {
  reports: LeanReport[];
  promptMap: Record<string, { prompt_id: string; category: string }>;
  genMap: Record<string, { audio_id: string; source_type: string }>;
  categories: string[];
  totalReports: number;
}) {
  const [filterSource, setFilterSource] = useState("");
  const [filterListener, setFilterListener] = useState("");
  const [filterProcess, setFilterProcess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (filterListener && r.listener_type !== filterListener) return false;
      if (filterProcess && r.listening_process !== filterProcess) return false;
      if (filterStatus && r.review_status !== filterStatus) return false;
      if (filterCategory) {
        const p = promptMap[r.prompt_id];
        if (!p || p.category !== filterCategory) return false;
      }
      if (filterSource) {
        const g = genMap[r.audio_id];
        if (!g || g.source_type !== filterSource) return false;
      }
      if (q) {
        const hay = `${r.report_id} ${r.prompt_id} ${r.audio_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, filterSource, filterListener, filterProcess, filterStatus, filterCategory, query, promptMap, genMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const hasFilters =
    filterSource || filterListener || filterProcess || filterStatus || filterCategory || query;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Listening Reports</h1>
        <p className="page-subtitle">
          {filtered.length} of {totalReports} reports{hasFilters ? " (filtered)" : ""}
        </p>
      </div>
      {totalReports === 0 && (
        <div className="notice-card">
          No listening reports are mounted. Public code exports exclude the local report corpus.
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="pg-input"
            style={{ minWidth: 200, padding: "6px 10px", fontSize: 13 }}
            placeholder="Search report / prompt / audio ID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            className="pg-select"
            style={{ minWidth: 150 }}
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(0);
            }}
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="pg-select"
            style={{ minWidth: 130 }}
            value={filterListener}
            onChange={(e) => {
              setFilterListener(e.target.value);
              setPage(0);
            }}
          >
            {LISTENER_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="pg-select"
            style={{ minWidth: 150 }}
            value={filterProcess}
            onChange={(e) => {
              setFilterProcess(e.target.value);
              setPage(0);
            }}
          >
            {LISTENING_PROCESSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="pg-select"
            style={{ minWidth: 130 }}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="pg-select"
            style={{ minWidth: 130 }}
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              className="pg-btn pg-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => {
                setFilterSource("");
                setFilterListener("");
                setFilterProcess("");
                setFilterStatus("");
                setFilterCategory("");
                setQuery("");
                setPage(0);
              }}
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
              {SCORE_AXES.map((axis) => (
                <th key={axis}>{axis.replace(/_/g, " ").replace("score", "").trim().slice(0, 12)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((report) => {
              const prompt = promptMap[report.prompt_id];
              const gen = genMap[report.audio_id];
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
                    const v = report.scores?.[axis];
                    return (
                      <td key={axis}>
                        <ScoreBar value={typeof v === "number" ? v : null} axis={axis} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, alignItems: "center" }}>
          <button
            type="button"
            className="filter-btn"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="filter-btn"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
