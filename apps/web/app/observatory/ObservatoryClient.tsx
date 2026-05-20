"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AXIS_PALETTE, CLAIM_COLORS, MODEL_PALETTE, SOURCE_COLORS } from "../lib/colors";
import { POSITIVE_AXES, RISK_AXES } from "../lib/score-bar";

interface ScoreRecord {
  prompt_id: string;
  audio_id: string;
  report_id: string;
  model: { provider: string; version: string; type: string };
  final_scores: Record<string, number | string | null>;
  date: string;
}

interface Report {
  report_id: string;
  audio_id: string;
  prompt_id: string;
  listener_type: string;
  claim_taxonomy?: Record<string, { statement: string }[]>;
}

interface Generation {
  audio_id: string;
  prompt_id: string;
  model: string;
  source_type: string;
  duration: number;
}

const ALL_AXES = [...POSITIVE_AXES, ...RISK_AXES];
const CLAIM_BUCKETS = ["heard", "measured", "inferred", "interpreted", "speculative", "undetermined"];

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function hashHue(input: string, max: number): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % max;
}

export default function ObservatoryClient({
  scores,
  reports,
  generations,
}: {
  scores: ScoreRecord[];
  reports: Report[];
  generations: Generation[];
}) {
  const [tab, setTab] = useState<"analytics" | "field">("analytics");

  const constellationRef = useRef<HTMLCanvasElement>(null);
  const auroraRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);

  const modelGroups = useMemo(() => {
    const groups = new Map<string, ScoreRecord[]>();
    scores.forEach((s) => {
      const key = s.model?.provider || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });
    return groups;
  }, [scores]);

  const drawBarChart = useCallback(() => {
    const canvas = barChartRef.current;
    if (!canvas || !scores.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const models = Array.from(modelGroups.keys());
    const barW = Math.min(28, (rect.width - 80) / Math.max(1, models.length * ALL_AXES.length));
    const groupW = barW * ALL_AXES.length + 12;

    ctx.font = "11px monospace";
    ctx.fillStyle = "#666";

    models.forEach((model, mi) => {
      const records = modelGroups.get(model)!;
      const x0 = 50 + mi * groupW;

      ALL_AXES.forEach((axis, ai) => {
        const vals = records.map((r) => {
          const v = r.final_scores[axis];
          return typeof v === "number" ? v : 0;
        });
        const avg = mean(vals);
        const h = (avg / 5) * (rect.height - 60);
        const x = x0 + ai * barW;
        const y = rect.height - 30 - h;
        ctx.fillStyle = AXIS_PALETTE[ai % AXIS_PALETTE.length] + "cc";
        ctx.fillRect(x, y, barW - 2, h);
      });

      ctx.fillStyle = "#95a098";
      ctx.save();
      ctx.translate(x0 + groupW / 2 - 6, rect.height - 8);
      ctx.fillText(model.slice(0, 12), 0, 0);
      ctx.restore();
    });

    ctx.fillStyle = "#666";
    for (let i = 0; i <= 5; i++) {
      const y = rect.height - 30 - (i / 5) * (rect.height - 60);
      ctx.fillText(String(i), 12, y + 4);
      ctx.strokeStyle = "#2a3830";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
  }, [scores, modelGroups]);

  const drawRadar = useCallback(() => {
    const canvas = radarRef.current;
    if (!canvas || !scores.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(cx, cy) - 40;
    const axes = POSITIVE_AXES;
    const angleStep = (Math.PI * 2) / axes.length;

    for (let ring = 1; ring <= 5; ring++) {
      const r = (ring / 5) * radius;
      ctx.beginPath();
      for (let i = 0; i <= axes.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#2a3830";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.fillStyle = "#95a098";
    ctx.font = "10px monospace";
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * (radius + 22);
      const y = cy + Math.sin(angle) * (radius + 22);
      ctx.textAlign = "center";
      ctx.fillText(axis.slice(0, 10), x, y + 4);
    });

    const models = Array.from(modelGroups.keys());
    models.forEach((model, mi) => {
      const records = modelGroups.get(model)!;
      ctx.beginPath();
      axes.forEach((axis, i) => {
        const vals = records.map((r) => {
          const v = r.final_scores[axis];
          return typeof v === "number" ? v : 0;
        });
        const avg = mean(vals);
        const r = (avg / 5) * radius;
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = MODEL_PALETTE[mi % MODEL_PALETTE.length];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = MODEL_PALETTE[mi % MODEL_PALETTE.length] + "22";
      ctx.fill();
    });

    models.forEach((model, mi) => {
      ctx.fillStyle = MODEL_PALETTE[mi % MODEL_PALETTE.length];
      ctx.fillRect(12, 12 + mi * 18, 10, 10);
      ctx.fillStyle = "#c1cac3";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(model.slice(0, 20), 28, 21 + mi * 18);
    });
  }, [scores, modelGroups]);

  const drawConstellation = useCallback(() => {
    const canvas = constellationRef.current;
    if (!canvas || !generations.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const padding = 40;
    const w = rect.width - padding * 2;
    const h = rect.height - padding * 2;

    generations.forEach((gen) => {
      const xPos = padding + (hashHue(gen.audio_id, 1000) / 1000) * w;
      const yPos = padding + (hashHue(gen.audio_id + "y", 1000) / 1000) * h;
      const size = Math.min(12, 3 + (gen.duration / 60) * 6);
      const color = SOURCE_COLORS[gen.source_type] || "#666";

      ctx.beginPath();
      ctx.arc(xPos, yPos, size + 4, 0, Math.PI * 2);
      ctx.fillStyle = color + "18";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(xPos, yPos, size, 0, Math.PI * 2);
      ctx.fillStyle = color + "bb";
      ctx.fill();
    });

    const sourceTypes = Array.from(new Set(generations.map((g) => g.source_type)));
    sourceTypes.forEach((st, i) => {
      const color = SOURCE_COLORS[st] || "#666";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(rect.width - 150, 20 + i * 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c1cac3";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(st.replace(/_/g, " "), rect.width - 138, 24 + i * 22);
    });

    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("spectral distribution →", rect.width / 2, rect.height - 8);
    ctx.save();
    ctx.translate(12, rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("event density →", 0, 0);
    ctx.restore();
  }, [generations]);

  const drawAurora = useCallback(() => {
    const canvas = auroraRef.current;
    if (!canvas || !reports.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const counts: Record<string, number> = {};
    CLAIM_BUCKETS.forEach((b) => (counts[b] = 0));
    reports.forEach((r) => {
      if (!r.claim_taxonomy) return;
      CLAIM_BUCKETS.forEach((b) => {
        const arr = r.claim_taxonomy?.[b];
        if (Array.isArray(arr)) counts[b] += arr.length;
      });
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const bandH = rect.height / CLAIM_BUCKETS.length;

    CLAIM_BUCKETS.forEach((bucket, i) => {
      const proportion = counts[bucket] / total;
      const y = i * bandH;
      const color = CLAIM_COLORS[bucket];

      const grad = ctx.createLinearGradient(0, y, rect.width, y + bandH);
      grad.addColorStop(0, color + "05");
      grad.addColorStop(0.2, color + "30");
      grad.addColorStop(0.5, color + "55");
      grad.addColorStop(0.8, color + "30");
      grad.addColorStop(1, color + "05");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, rect.width, bandH);

      ctx.strokeStyle = color + "88";
      ctx.lineWidth = Math.max(1, proportion * 8);
      ctx.beginPath();
      const centerY = y + bandH / 2;
      ctx.moveTo(0, centerY);
      for (let x = 0; x < rect.width; x += 4) {
        const wave = Math.sin(x * 0.02 + i * 1.2) * 8 * proportion;
        ctx.lineTo(x, centerY + wave);
      }
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${bucket} (${counts[bucket]})`, 12, y + bandH / 2 + 4);
    });
  }, [reports]);

  const drawAll = useCallback(() => {
    if (tab === "analytics") {
      requestAnimationFrame(() => {
        drawBarChart();
        drawRadar();
      });
    } else {
      requestAnimationFrame(() => {
        drawConstellation();
        drawAurora();
      });
    }
  }, [tab, drawBarChart, drawRadar, drawConstellation, drawAurora]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  useEffect(() => {
    const canvases = [barChartRef.current, radarRef.current, constellationRef.current, auroraRef.current].filter(
      Boolean,
    ) as HTMLCanvasElement[];
    if (!canvases.length) return;

    let raf = 0;
    const observer = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => drawAll());
    });
    canvases.forEach((c) => {
      if (c.parentElement) observer.observe(c.parentElement);
    });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [drawAll]);

  const sourceTypeCounts: Record<string, number> = {};
  generations.forEach((g) => {
    sourceTypeCounts[g.source_type] = (sourceTypeCounts[g.source_type] || 0) + 1;
  });

  const listenerTypeCounts: Record<string, number> = {};
  reports.forEach((r) => {
    listenerTypeCounts[r.listener_type] = (listenerTypeCounts[r.listener_type] || 0) + 1;
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Observatory</h1>
        <p className="page-subtitle">
          Data visualizations across {scores.length} scored items · {reports.length} reports · {generations.length} generations
        </p>
      </div>
      {scores.length === 0 && reports.length === 0 && generations.length === 0 && (
        <div className="notice-card">
          No visualization data is mounted. Public code exports keep the visualization system available while excluding local
          benchmark data.
        </div>
      )}

      <div className="compare-grid" style={{ marginBottom: 24 }}>
        <div className="detail-section">
          <div className="detail-section-title">Source Distribution</div>
          <div className="card">
            {Object.entries(sourceTypeCounts).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No generations.</p>
            ) : (
              Object.entries(sourceTypeCounts).map(([st, count]) => (
                <div className="detail-row" key={st}>
                  <span className="detail-label">
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: SOURCE_COLORS[st] || "#666",
                        marginRight: 8,
                      }}
                    />
                    {st.replace(/_/g, " ")}
                  </span>
                  <span className="detail-value">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">Listener Distribution</div>
          <div className="card">
            {Object.entries(listenerTypeCounts).length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No reports.</p>
            ) : (
              Object.entries(listenerTypeCounts).map(([lt, count]) => (
                <div className="detail-row" key={lt}>
                  <span className="detail-label">{lt}</span>
                  <span className="detail-value">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="obs-tabs">
        <button
          type="button"
          className={`obs-tab ${tab === "analytics" ? "obs-tab-active" : ""}`}
          onClick={() => setTab("analytics")}
        >
          ◈ Analytics
        </button>
        <button
          type="button"
          className={`obs-tab ${tab === "field" ? "obs-tab-active" : ""}`}
          onClick={() => setTab("field")}
        >
          ✦ Field
        </button>
      </div>

      {tab === "analytics" && (
        <div className="obs-chart-grid">
          <div className="obs-chart-card">
            <div className="obs-chart-title">Score Distribution by Model</div>
            {scores.length === 0 ? (
              <div className="chart-empty">
                <span className="chart-empty-glyph">◌</span>
                No score data
              </div>
            ) : (
              <canvas ref={barChartRef} className="obs-chart-canvas" />
            )}
          </div>
          <div className="obs-chart-card">
            <div className="obs-chart-title">Axis Radar — Model Comparison</div>
            {scores.length === 0 ? (
              <div className="chart-empty">
                <span className="chart-empty-glyph">◌</span>
                No score data
              </div>
            ) : (
              <canvas ref={radarRef} className="obs-chart-canvas" />
            )}
          </div>
          <div className="obs-chart-card obs-full-width">
            <div className="obs-chart-title">Score Summary Table</div>
            {scores.length === 0 ? (
              <div className="chart-empty">
                <span className="chart-empty-glyph">◌</span>
                No scores to summarize
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      {ALL_AXES.map((axis) => (
                        <th key={axis}>{axis.replace(/_/g, " ").slice(0, 12)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(modelGroups.entries()).map(([model, records]) => (
                      <tr key={model}>
                        <td>{model}</td>
                        {ALL_AXES.map((axis) => {
                          const vals = records.map((r) => {
                            const v = r.final_scores[axis];
                            return typeof v === "number" ? v : 0;
                          });
                          return <td key={axis}>{mean(vals).toFixed(2)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "field" && (
        <div className="obs-chart-grid">
          <div className="obs-chart-card obs-full-width">
            <div className="obs-chart-title">Constellation — Soundscape Particle Map</div>
            {generations.length === 0 ? (
              <div className="chart-empty">
                <span className="chart-empty-glyph">✦</span>
                No generations to map
              </div>
            ) : (
              <canvas ref={constellationRef} className="obs-chart-canvas" style={{ height: 400 }} />
            )}
          </div>
          <div className="obs-chart-card obs-full-width">
            <div className="obs-chart-title">Taxonomy Aurora — Claim Distribution</div>
            {reports.length === 0 ? (
              <div className="chart-empty">
                <span className="chart-empty-glyph">✦</span>
                No claim data
              </div>
            ) : (
              <canvas ref={auroraRef} className="obs-chart-canvas" style={{ height: 260 }} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
