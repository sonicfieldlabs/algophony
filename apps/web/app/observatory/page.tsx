"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------- types ---------- */

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
  listening_process?: string;
  source_type_ground_truth?: string | null;
  source_type_listener_guess?: string | null;
  claim_taxonomy?: Record<string, { statement: string }[]>;
  scores: Record<string, number | string | null>;
}

interface Generation {
  audio_id: string;
  prompt_id: string;
  model: string;
  source_type: string;
  duration: number;
}

/* ---------- constants ---------- */

const POSITIVE_AXES = [
  "prompt_adherence", "source_accuracy", "spatial_coherence",
  "event_density_score", "ecological_plausibility", "causal_coherence", "loopability",
];
const RISK_AXES = ["false_source_index", "generic_naturalism_index", "cultural_cliche_index"];
const ALL_AXES = [...POSITIVE_AXES, ...RISK_AXES];
const CLAIM_BUCKETS = ["heard", "measured", "inferred", "interpreted", "speculative", "undetermined"];

const CLAIM_COLORS: Record<string, string> = {
  heard: "#4fb286",
  measured: "#5bb8c2",
  inferred: "#d4a843",
  interpreted: "#c084fc",
  speculative: "#e85d5d",
  undetermined: "#666",
};

const SOURCE_COLORS: Record<string, string> = {
  generated_procedural: "#5bb8c2",
  generated_ml: "#c084fc",
  field_recording: "#4fb286",
  found_sound: "#d4a843",
  hybrid: "#e85d5d",
};

/* ---------- helpers ---------- */

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/* ---------- component ---------- */

export default function ObservatoryPage() {
  const [tab, setTab] = useState<"analytics" | "field">("analytics");
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const constellationRef = useRef<HTMLCanvasElement>(null);
  const auroraRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);

  /* fetch data — use summary endpoints */
  useEffect(() => {
    Promise.all([
      fetch("/api/scores?summary=1").then((r) => r.json()),
      fetch("/api/reports?summary=1").then((r) => r.json()),
      fetch("/api/generations").then((r) => r.json()),
    ]).then(([s, r, g]) => {
      setScores(Array.isArray(s) ? s : []);
      setReports(Array.isArray(r) ? r : []);
      setGenerations(Array.isArray(g) ? g : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* memoize computed data */
  const modelGroups = useMemo(() => {
    const groups = new Map<string, ScoreRecord[]>();
    scores.forEach((s) => {
      const key = s.model?.provider || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });
    return groups;
  }, [scores]);

  const sourceGroups = useMemo(() => {
    const groups = new Map<string, Generation[]>();
    generations.forEach((g) => {
      const key = g.source_type || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    return groups;
  }, [generations]);

  /* bar chart renderer */
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
    const barW = Math.min(28, (rect.width - 80) / (models.length * ALL_AXES.length));
    const groupW = barW * ALL_AXES.length + 12;
    const colors = ["#4fb286", "#5bb8c2", "#d4a843", "#c084fc", "#e85d5d", "#68c9a3", "#9ecfdb", "#e0c96a", "#d4a3ff", "#ef8a8a"];

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

        ctx.fillStyle = colors[ai % colors.length] + "cc";
        ctx.fillRect(x, y, barW - 2, h);
      });

      ctx.fillStyle = "#95a098";
      ctx.save();
      ctx.translate(x0 + groupW / 2 - 6, rect.height - 8);
      ctx.fillText(model.slice(0, 12), 0, 0);
      ctx.restore();
    });

    // Y axis labels
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

  /* radar chart renderer */
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

    // grid
    for (let ring = 1; ring <= 5; ring++) {
      const r = (ring / 5) * radius;
      ctx.beginPath();
      for (let i = 0; i <= axes.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#2a3830";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // axis labels
    ctx.fillStyle = "#95a098";
    ctx.font = "10px monospace";
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + Math.cos(angle) * (radius + 22);
      const y = cy + Math.sin(angle) * (radius + 22);
      ctx.textAlign = "center";
      ctx.fillText(axis.slice(0, 10), x, y + 4);
    });

    // model shapes
    const models = Array.from(modelGroups.keys());
    const shapeColors = ["#4fb286", "#5bb8c2", "#c084fc", "#d4a843"];

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
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = shapeColors[mi % shapeColors.length];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = shapeColors[mi % shapeColors.length] + "22";
      ctx.fill();
    });

    // legend
    models.forEach((model, mi) => {
      ctx.fillStyle = shapeColors[mi % shapeColors.length];
      ctx.fillRect(12, 12 + mi * 18, 10, 10);
      ctx.fillStyle = "#c1cac3";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(model.slice(0, 20), 28, 21 + mi * 18);
    });
  }, [scores, modelGroups]);

  /* constellation renderer */
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

    // Map generations to positions based on index (spectral data not available client-side)
    const padding = 40;
    const w = rect.width - padding * 2;
    const h = rect.height - padding * 2;

    generations.forEach((gen) => {
      // Pseudo-spatial positioning from ID hash
      let hash = 0;
      for (let c = 0; c < gen.audio_id.length; c++) {
        hash = ((hash << 5) - hash) + gen.audio_id.charCodeAt(c);
        hash |= 0;
      }
      const x = padding + (Math.abs(hash % 1000) / 1000) * w;
      const y = padding + (Math.abs((hash >> 10) % 1000) / 1000) * h;
      const size = 3 + (gen.duration / 60) * 6;
      const color = SOURCE_COLORS[gen.source_type] || "#666";

      // Glow
      ctx.beginPath();
      ctx.arc(x, y, size + 4, 0, Math.PI * 2);
      ctx.fillStyle = color + "18";
      ctx.fill();

      // Particle
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color + "bb";
      ctx.fill();
    });

    // Legend
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

    // Axis labels
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

  /* aurora renderer */
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

    // Count claims per bucket
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

      // Flowing gradient band
      const grad = ctx.createLinearGradient(0, y, rect.width, y + bandH);
      grad.addColorStop(0, color + "05");
      grad.addColorStop(0.2, color + "30");
      grad.addColorStop(0.5, color + "55");
      grad.addColorStop(0.8, color + "30");
      grad.addColorStop(1, color + "05");

      ctx.fillStyle = grad;
      ctx.fillRect(0, y, rect.width, bandH);

      // Bright center line
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

      // Label
      ctx.fillStyle = color;
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${bucket} (${counts[bucket]})`, 12, y + bandH / 2 + 4);
    });
  }, [reports]);

  /* draw charts when tab or data changes */
  const drawAll = useCallback(() => {
    if (loading) return;
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
  }, [tab, loading, drawBarChart, drawRadar, drawConstellation, drawAurora]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  /* resize observer — redraw canvases when container changes size */
  useEffect(() => {
    const canvases = [barChartRef.current, radarRef.current, constellationRef.current, auroraRef.current].filter(Boolean) as HTMLCanvasElement[];
    if (!canvases.length) return;

    const observer = new ResizeObserver(() => {
      drawAll();
    });

    canvases.forEach((c) => {
      if (c.parentElement) observer.observe(c.parentElement);
    });

    return () => observer.disconnect();
  }, [drawAll]);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Observatory</h1>
          <p className="page-subtitle">Loading data…</p>
        </div>
      </>
    );
  }

  /* aggregated stats */
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
          No visualization data is mounted. Public code exports keep the visualization system available while excluding local benchmark data.
        </div>
      )}

      {/* summary cards */}
      <div className="compare-grid" style={{ marginBottom: 24 }}>
        <div className="detail-section">
          <div className="detail-section-title">Source Distribution</div>
          <div className="card">
            {Object.entries(sourceTypeCounts).map(([st, count]) => (
              <div className="detail-row" key={st}>
                <span className="detail-label">
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: SOURCE_COLORS[st] || "#666", marginRight: 8 }} />
                  {st.replace(/_/g, " ")}
                </span>
                <span className="detail-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section-title">Listener Distribution</div>
          <div className="card">
            {Object.entries(listenerTypeCounts).map(([lt, count]) => (
              <div className="detail-row" key={lt}>
                <span className="detail-label">{lt}</span>
                <span className="detail-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="obs-tabs">
        <button type="button" className={`obs-tab ${tab === "analytics" ? "obs-tab-active" : ""}`} onClick={() => setTab("analytics")}>
          📊 Analytics
        </button>
        <button type="button" className={`obs-tab ${tab === "field" ? "obs-tab-active" : ""}`} onClick={() => setTab("field")}>
          ✦ Field
        </button>
      </div>

      {/* Analytics tab */}
      {tab === "analytics" && (
        <div className="obs-chart-grid">
          <div className="obs-chart-card">
            <div className="obs-chart-title">Score Distribution by Model</div>
            <canvas ref={barChartRef} className="obs-chart-canvas" />
          </div>
          <div className="obs-chart-card">
            <div className="obs-chart-title">Axis Radar — Model Comparison</div>
            <canvas ref={radarRef} className="obs-chart-canvas" />
          </div>
          <div className="obs-chart-card obs-full-width">
            <div className="obs-chart-title">Score Summary Table</div>
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
          </div>
        </div>
      )}

      {/* Field tab */}
      {tab === "field" && (
        <div className="obs-chart-grid">
          <div className="obs-chart-card obs-full-width">
            <div className="obs-chart-title">Constellation — Soundscape Particle Map</div>
            <canvas ref={constellationRef} className="obs-chart-canvas" style={{ height: 400 }} />
          </div>
          <div className="obs-chart-card obs-full-width">
            <div className="obs-chart-title">Taxonomy Aurora — Claim Distribution</div>
            <canvas ref={auroraRef} className="obs-chart-canvas" style={{ height: 260 }} />
          </div>
        </div>
      )}
    </>
  );
}
