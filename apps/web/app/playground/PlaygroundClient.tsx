"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

/* ---------- types ---------- */

interface Provider {
  provider_id: string;
  name: string;
  type: string;
  runtime: string;
  status: string;
  status_reason: string;
  supports_loop: boolean;
  supports_seed: boolean;
  max_duration_seconds: number | null;
}

interface AtlasPrompt {
  prompt_id: string;
  prompt_text: string;
  category: string;
  intended_sources: string[];
  forbidden_sources: string[];
  duration_target: number;
  loop_required: boolean;
  difficulty: string;
}

interface Analysis {
  duration: number;
  sample_rate: number;
  channels: number;
  rms: number;
  peak_level: number;
  spectral_centroid_hz: number;
  spectral_bandwidth_hz: number;
  spectral_flatness: number;
  zero_crossing_rate: number;
  silence_ratio: number;
  onset_count: number;
  event_density_per_sec: number;
  loop_boundary_discontinuity: number | null;
}

interface Claim {
  statement: string;
  confidence: string;
  basis: string;
}

interface Report {
  report_id: string;
  audio_id: string;
  prompt_id: string;
  review_status: string;
  basic_description: string;
  claim_taxonomy: Record<string, Claim[]>;
  sources: {
    detected: string[];
    inferred: string[];
    absent_expected: string[];
    forbidden_detected: string[];
    hallucinated: string[];
  };
  spatial_structure: Record<string, string>;
  temporal_behavior: Record<string, unknown>;
  ecological_plausibility: string;
  causal_coherence: string;
  cultural_assumptions: string;
  prompt_comparison: string;
  suggested_prompt_revision: string;
  regeneration_recommendation: string;
  scores: Record<string, number | string>;
  score_provenance: { axis: string; score: number; scorer: string; evidence: string; confidence: string; notes: string }[];
}

interface GenerationMeta {
  audio_id: string;
  prompt_id: string;
  model: string;
  model_version: string;
  duration: number;
  seed: number | null;
  file_format: string;
  storage_uri: string;
  sha256?: string;
  license_status: string;
}

interface GenerationResult {
  ok: boolean;
  audio_id: string;
  generation: GenerationMeta;
  analysis: Analysis;
  report: Report;
  error: string | null;
}

interface UploadResult {
  audio_id: string;
  storage_uri: string;
  file_format: string;
  sha256: string;
  file_size?: number;
  source_type: string;
  upload_metadata: Record<string, string>;
  analysis: Analysis | null;
  report: Report | null;
  note?: string;
}

type PlaygroundMode = "generate" | "listen";

const SOURCE_TYPES = [
  { value: "found_sound", label: "Found Sound / Archive" },
  { value: "field_recording", label: "Field Recording" },
  { value: "generated_ml", label: "Generated (ML)" },
  { value: "generated_procedural", label: "Generated (Procedural)" },
  { value: "hybrid", label: "Hybrid" },
];

/* ---------- constants ---------- */

const CATEGORIES = [
  "forest", "city", "coast", "interior", "machine",
  "ritual", "archive", "club_exterior", "ruin", "impossible_ecology",
];

const STEPS = ["Prompt", "Configure", "Generate", "Listen", "Report"];

const SCORE_AXES = [
  "prompt_adherence", "source_accuracy", "spatial_coherence",
  "event_density_score", "ecological_plausibility", "causal_coherence",
  "false_source_index", "generic_naturalism_index", "cultural_cliche_index",
  "loopability",
];

const RISK_AXES = new Set(["false_source_index", "generic_naturalism_index", "cultural_cliche_index"]);

const CLAIM_COLORS: Record<string, string> = {
  heard: "var(--accent)",
  measured: "var(--cyan)",
  inferred: "var(--amber)",
  interpreted: "#c084fc",
  speculative: "var(--red)",
  undetermined: "var(--text-muted)",
};

/* ---------- component ---------- */

export default function PlaygroundPage({ playgroundToken = "" }: { playgroundToken?: string }) {
  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => {
      return { ...(playgroundToken ? { "x-playground-token": playgroundToken } : {}), ...(extra || {}) };
    },
    [playgroundToken],
  );

  /* state — mode */
  const [mode, setMode] = useState<PlaygroundMode>("generate");

  /* state — prompt */
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState("forest");
  const [intendedSources, setIntendedSources] = useState("");
  const [forbiddenSources, setForbiddenSources] = useState("");

  /* state — config */
  const [providerId, setProviderId] = useState("synth_baseline");
  const [duration, setDuration] = useState(30);
  const [loop, setLoop] = useState(false);
  const [seed, setSeed] = useState("");

  /* state — providers & atlas */
  const [providers, setProviders] = useState<Provider[]>([]);
  const [atlasPrompts, setAtlasPrompts] = useState<AtlasPrompt[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  /* state — workflow */
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* state — upload (listen mode) */
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSourceType, setUploadSourceType] = useState("found_sound");
  const [uploadLocation, setUploadLocation] = useState("");
  const [uploadRecorder, setUploadRecorder] = useState("");
  const [uploadEquipment, setUploadEquipment] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  /* state — human scoring */
  const [humanGuess, setHumanGuess] = useState<string>("uncertain");
  const [humanDiscriminability, setHumanDiscriminability] = useState(3);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* load providers + atlas on mount */
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/providers", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProviders(data);
        setLoadingProviders(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setLoadingProviders(false);
      });

    fetch("/api/prompts", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAtlasPrompts(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  /* import from atlas */
  const importPrompt = useCallback(
    (promptId: string) => {
      const prompt = atlasPrompts.find((p) => p.prompt_id === promptId);
      if (!prompt) return;
      setPromptText(prompt.prompt_text);
      setCategory(prompt.category);
      setIntendedSources(prompt.intended_sources.join(", "));
      setForbiddenSources(prompt.forbidden_sources.join(", "));
      setDuration(prompt.duration_target);
      setLoop(prompt.loop_required);
    },
    [atlasPrompts],
  );

  /* generate */
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const body = {
        prompt_text: promptText,
        category,
        provider_id: providerId,
        duration,
        loop,
        seed: seed ? parseInt(seed, 10) : null,
        intended_sources: intendedSources
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        forbidden_sources: forbiddenSources
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (!data.ok) {
        setError(data.error || "Generation failed.");
        setGenerating(false);
        return;
      }

      setResult(data);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setGenerating(false);
    }
  }, [promptText, category, providerId, duration, loop, seed, intendedSources, forbiddenSources]);

  /* upload handler */
  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("metadata", JSON.stringify({
        source_type: uploadSourceType,
        location: uploadLocation,
        recorder: uploadRecorder,
        equipment: uploadEquipment,
        notes: uploadNotes,
      }));

      const resp = await fetch("/api/upload", { method: "POST", body: formData, headers: authHeaders() });
      const data = await resp.json();

      if (data.error) {
        setError(data.error);
      } else {
        setUploadResult(data);
        setStep(2); // jump to listen step in listen mode
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, [authHeaders, uploadFile, uploadSourceType, uploadLocation, uploadRecorder, uploadEquipment, uploadNotes]);

  /* file drop handlers */
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setUploadFile(f);
  };

  /* navigation */
  const LISTEN_STEPS = ["Upload", "Analyze", "Listen", "Report"];
  const activeSteps = mode === "generate" ? STEPS : LISTEN_STEPS;

  const canAdvance = (): boolean => {
    if (mode === "generate") {
      if (step === 0) return promptText.trim().length > 0;
      if (step === 1) return !!providerId;
      if (step === 2) return false;
      if (step === 3) return !!result;
      return true;
    } else {
      if (step === 0) return !!uploadFile;
      if (step === 1) return false;
      if (step === 2) return !!uploadResult;
      return true;
    }
  };

  const selectedProvider = providers.find(
    (p) => p.provider_id === providerId,
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Playground</h1>
        <p className="page-subtitle">
          Interactive generation & listening workbench
        </p>
      </div>

      {/* mode toggle */}
      <div className="pg-mode-toggle">
        <button
          type="button"
          className={`pg-mode-btn ${mode === "generate" ? "pg-mode-active" : ""}`}
          onClick={() => { setMode("generate"); setStep(0); setResult(null); setUploadResult(null); setError(null); }}
        >
          ⚡ Generate
        </button>
        <button
          type="button"
          className={`pg-mode-btn ${mode === "listen" ? "pg-mode-active" : ""}`}
          onClick={() => { setMode("listen"); setStep(0); setResult(null); setUploadResult(null); setError(null); }}
        >
          👂 Listen
        </button>
      </div>

      {/* stepper */}
      <div className="pg-stepper">
        {activeSteps.map((label, i) => (
          <button
            key={label}
            className={`pg-step ${i === step ? "pg-step-active" : ""} ${i < step ? "pg-step-done" : ""}`}
            onClick={() => {
              if (i <= step || (mode === "generate" && i <= 4 && result) || (mode === "listen" && i <= 3 && uploadResult)) setStep(i);
            }}
            type="button"
          >
            <span className="pg-step-num">{i + 1}</span>
            <span className="pg-step-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ===== LISTEN MODE: step 0 - Upload ===== */}
      {mode === "listen" && step === 0 && (
        <div className="pg-panel">
          <div className="pg-panel-header">Upload a soundscape</div>

          <div
            className={`pg-dropzone ${dragOver ? "pg-dropzone-active" : ""} ${uploadFile ? "pg-dropzone-has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.flac,.aiff,.ogg"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }}
            />
            {uploadFile ? (
              <div className="pg-dropzone-info">
                <div className="pg-dropzone-filename">{uploadFile.name}</div>
                <div className="pg-dropzone-size">{(uploadFile.size / (1024 * 1024)).toFixed(1)} MB</div>
              </div>
            ) : (
              <div className="pg-dropzone-placeholder">
                <div className="pg-dropzone-icon">🎙</div>
                <div>Drop audio file here or click to browse</div>
                <div className="pg-dropzone-formats">WAV · MP3 · FLAC · AIFF · OGG (max 50MB)</div>
              </div>
            )}
          </div>

          <div className="pg-field" style={{ marginTop: 16 }}>
            <label className="pg-label">Source type</label>
            <select className="pg-select" value={uploadSourceType} onChange={(e) => setUploadSourceType(e.target.value)}>
              {SOURCE_TYPES.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          <div className="pg-grid-3" style={{ marginTop: 12 }}>
            <div className="pg-field">
              <label className="pg-label">Location</label>
              <input className="pg-input" value={uploadLocation} onChange={(e) => setUploadLocation(e.target.value)} placeholder="e.g. Río Medellín, Antioquia" />
            </div>
            <div className="pg-field">
              <label className="pg-label">Recorder</label>
              <input className="pg-input" value={uploadRecorder} onChange={(e) => setUploadRecorder(e.target.value)} placeholder="Name or alias" />
            </div>
            <div className="pg-field">
              <label className="pg-label">Equipment</label>
              <input className="pg-input" value={uploadEquipment} onChange={(e) => setUploadEquipment(e.target.value)} placeholder="e.g. Zoom H6" />
            </div>
          </div>

          <div className="pg-field" style={{ marginTop: 12 }}>
            <label className="pg-label">Notes</label>
            <textarea className="pg-textarea" rows={2} value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="Context, conditions, observations…" />
          </div>

          {error && <div className="pg-error">{error}</div>}

          <div className="pg-actions">
            <button
              className="pg-btn pg-btn-generate"
              disabled={!uploadFile || uploading}
              onClick={handleUpload}
              type="button"
            >
              {uploading ? (<><span className="pg-spinner" /> Analyzing…</>) : "🔬 Upload & Analyze"}
            </button>
          </div>
        </div>
      )}

      {/* ===== LISTEN MODE: step 2 - Listen to upload ===== */}
      {mode === "listen" && step === 2 && uploadResult && (
        <div className="pg-panel">
          <div className="pg-panel-header">Listen to upload</div>
          <div className="pg-audio-card">
            <div className="pg-audio-id">{uploadResult.audio_id}</div>
            <audio controls preload="metadata" src={`/audio/${uploadResult.audio_id}`} style={{ width: "100%" }} />
            <div className="pg-audio-meta">
              {uploadResult.source_type.replace(/_/g, " ")} · {uploadResult.file_format} · {uploadResult.upload_metadata?.original_filename}
            </div>
          </div>

          {uploadResult.analysis && (
            <>
              <div className="pg-panel-header" style={{ marginTop: 24 }}>Signal analysis</div>
              <div className="pg-analysis-grid">
                {[
                  ["RMS", uploadResult.analysis.rms.toFixed(4)],
                  ["Peak", uploadResult.analysis.peak_level.toFixed(4)],
                  ["Centroid", `${uploadResult.analysis.spectral_centroid_hz.toFixed(0)} Hz`],
                  ["Bandwidth", `${uploadResult.analysis.spectral_bandwidth_hz.toFixed(0)} Hz`],
                  ["Flatness", uploadResult.analysis.spectral_flatness.toFixed(4)],
                  ["ZCR", uploadResult.analysis.zero_crossing_rate.toFixed(4)],
                  ["Silence", `${(uploadResult.analysis.silence_ratio * 100).toFixed(1)}%`],
                  ["Onsets", String(uploadResult.analysis.onset_count)],
                  ["Density", `${uploadResult.analysis.event_density_per_sec.toFixed(2)}/s`],
                  ["Loop disc.", uploadResult.analysis.loop_boundary_discontinuity?.toFixed(4) ?? "n/a"],
                ].map(([label, value]) => (
                  <div className="pg-metric" key={label}>
                    <div className="pg-metric-value">{value}</div>
                    <div className="pg-metric-label">{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Human discriminability question */}
          <div className="pg-panel-header" style={{ marginTop: 24 }}>Turing Question</div>
          <div className="pg-turing-card">
            <p className="pg-turing-question">Does this soundscape sound generated or field-recorded?</p>
            <div className="pg-turing-options">
              {["generated", "field_recording", "uncertain"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`pg-turing-btn ${humanGuess === opt ? "pg-turing-btn-active" : ""}`}
                  onClick={() => setHumanGuess(opt)}
                >
                  {opt === "generated" ? "Generated" : opt === "field_recording" ? "Field-recorded" : "Uncertain"}
                </button>
              ))}
            </div>
            <div className="pg-field" style={{ marginTop: 12 }}>
              <label className="pg-label">Discriminability confidence (0 = indistinguishable, 5 = clearly identifiable)</label>
              <input
                className="pg-input"
                type="range"
                min={0}
                max={5}
                step={1}
                value={humanDiscriminability}
                onChange={(e) => setHumanDiscriminability(parseInt(e.target.value, 10))}
              />
              <div className="pg-turing-scale">
                <span>0 · indistinguishable</span>
                <span className="pg-turing-current">{humanDiscriminability}</span>
                <span>5 · clearly identifiable</span>
              </div>
            </div>
          </div>

          <div className="pg-actions">
            <button className="pg-btn pg-btn-ghost" onClick={() => setStep(0)} type="button">← Upload another</button>
            <button className="pg-btn pg-btn-primary" onClick={() => setStep(3)} type="button">Next → View Report</button>
          </div>
        </div>
      )}

      {/* ===== LISTEN MODE: step 3 - Report ===== */}
      {mode === "listen" && step === 3 && uploadResult && (
        <div className="pg-panel">
          <div className="pg-panel-header">AKOÚŌ Listening Report</div>
          <div className="pg-report-meta">
            <span className="badge badge-status-playground_draft">playground draft</span>
            <span className={`badge badge-${uploadResult.source_type.startsWith("generated") ? "revise" : "keep"}`}>{uploadResult.source_type.replace(/_/g, " ")}</span>
          </div>

          {uploadResult.report ? (
            <>
              <p className="pg-description">{uploadResult.report.basic_description}</p>
              <div className="pg-panel-header" style={{ marginTop: 24 }}>Scores</div>
              <div className="pg-scores-grid">
                {SCORE_AXES.map((axis) => {
                  const value = typeof uploadResult.report!.scores[axis] === "number" ? (uploadResult.report!.scores[axis] as number) : 0;
                  const risk = RISK_AXES.has(axis);
                  const pct = (value / 5) * 100;
                  const level = risk ? (value <= 1 ? "high" : value <= 2.5 ? "mid" : "low") : (value <= 2 ? "low" : value <= 3.5 ? "mid" : "high");
                  return (
                    <div className="pg-score-row" key={axis}>
                      <span className="pg-score-axis">{axis.replace(/_/g, " ").replace("score", "").trim()}</span>
                      <span className="pg-score-bar-wrap"><span className="score-bar-track"><span className="score-bar-fill" style={{ width: `${pct}%` }} data-level={level} /></span></span>
                      <span className="pg-score-val">{value}</span>
                      {risk && <span className="pg-score-risk">risk</span>}
                    </div>
                  );
                })}
              </div>

              {/* Turing result */}
              <div className="pg-panel-header" style={{ marginTop: 24 }}>Discriminability Assessment</div>
              <div className="pg-turing-result">
                <div className="pg-summary-row"><span className="pg-summary-label">Ground truth</span><span className="pg-summary-value">{uploadResult.source_type.replace(/_/g, " ")}</span></div>
                <div className="pg-summary-row"><span className="pg-summary-label">Your guess</span><span className="pg-summary-value">{humanGuess.replace(/_/g, " ")}</span></div>
                <div className="pg-summary-row"><span className="pg-summary-label">Correct?</span><span className="pg-summary-value">{(humanGuess === "generated" && uploadResult.source_type.startsWith("generated")) || (humanGuess === "field_recording" && uploadResult.source_type === "field_recording") ? "✓ Yes" : humanGuess === "uncertain" ? "— Uncertain" : "✗ No"}</span></div>
                <div className="pg-summary-row"><span className="pg-summary-label">Discriminability</span><span className="pg-summary-value">{humanDiscriminability}/5</span></div>
              </div>
            </>
          ) : (
            <div className="pg-text-block"><p>Upload analysis completed. Report generation requires the full Python pipeline. Signal metrics are available in the Listen step.</p></div>
          )}

          <div className="pg-actions">
            <button className="pg-btn pg-btn-ghost" onClick={() => setStep(2)} type="button">← Listen again</button>
            <button className="pg-btn pg-btn-ghost" onClick={() => { setUploadResult(null); setUploadFile(null); setStep(0); }} type="button">New upload</button>
          </div>
        </div>
      )}

      {/* ===== GENERATE MODE ===== */}

      {/* step 0: prompt */}
      {mode === "generate" && step === 0 && (
        <div className="pg-panel">
          <div className="pg-panel-header">Write or import a prompt</div>

          {atlasPrompts.length > 0 && (
            <div className="pg-field">
              <label className="pg-label">Import from Atlas</label>
              <select
                className="pg-select"
                onChange={(e) => {
                  if (e.target.value) importPrompt(e.target.value);
                }}
                defaultValue=""
              >
                <option value="">— select a prompt —</option>
                {atlasPrompts.map((p) => (
                  <option key={p.prompt_id} value={p.prompt_id}>
                    {p.prompt_id} · {p.category} · {p.prompt_text.slice(0, 70)}…
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pg-field">
            <label className="pg-label">Prompt text</label>
            <textarea
              className="pg-textarea"
              rows={5}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="A humid lowland forest before dawn, dense insect chorus in the background…"
            />
          </div>

          <div className="pg-grid-3">
            <div className="pg-field">
              <label className="pg-label">Category</label>
              <select className="pg-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="pg-field">
              <label className="pg-label">Intended sources</label>
              <input
                className="pg-input"
                value={intendedSources}
                onChange={(e) => setIntendedSources(e.target.value)}
                placeholder="insect chorus, distant frogs"
              />
            </div>
            <div className="pg-field">
              <label className="pg-label">Forbidden sources</label>
              <input
                className="pg-input"
                value={forbiddenSources}
                onChange={(e) => setForbiddenSources(e.target.value)}
                placeholder="music, sirens"
              />
            </div>
          </div>

          <div className="pg-actions">
            <button
              className="pg-btn pg-btn-primary"
              disabled={!canAdvance()}
              onClick={() => setStep(1)}
              type="button"
            >
              Next → Configure
            </button>
          </div>
        </div>
      )}

      {/* step 1: configure */}
      {mode === "generate" && step === 1 && (
        <div className="pg-panel">
          <div className="pg-panel-header">Configure generation</div>

          <div className="pg-field">
            <label className="pg-label">Provider</label>
            {loadingProviders ? (
              <p className="pg-muted">Loading providers…</p>
            ) : (
              <div className="pg-provider-grid">
                {providers.map((p) => (
                  <button
                    key={p.provider_id}
                    type="button"
                    className={`pg-provider-card ${providerId === p.provider_id ? "pg-provider-selected" : ""} ${p.status !== "available" ? "pg-provider-disabled" : ""}`}
                    onClick={() => {
                      if (p.status === "available") setProviderId(p.provider_id);
                    }}
                  >
                    <div className="pg-provider-name">{p.name}</div>
                    <div className="pg-provider-meta">
                      <span className={`badge badge-provider-${p.status}`}>{p.status.replace(/_/g, " ")}</span>
                      <span className="pg-provider-type">{p.type.replace(/_/g, " ")}</span>
                    </div>
                    {p.runtime && <div className="pg-provider-runtime">{p.runtime}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pg-grid-3">
            <div className="pg-field">
              <label className="pg-label">Duration (seconds)</label>
              <input
                className="pg-input"
                type="number"
                min={5}
                max={selectedProvider?.max_duration_seconds || 120}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
              />
              {selectedProvider?.max_duration_seconds && (
                <span className="pg-hint">max {selectedProvider.max_duration_seconds}s for this provider</span>
              )}
            </div>
            <div className="pg-field">
              <label className="pg-label">Loop</label>
              <label className="pg-toggle">
                <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
                <span className="pg-toggle-track" />
                <span className="pg-toggle-label">{loop ? "Required" : "Off"}</span>
              </label>
            </div>
            <div className="pg-field">
              <label className="pg-label">Seed (optional)</label>
              <input
                className="pg-input"
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Random"
              />
            </div>
          </div>

          <div className="pg-actions">
            <button className="pg-btn pg-btn-ghost" onClick={() => setStep(0)} type="button">← Back</button>
            <button className="pg-btn pg-btn-primary" onClick={() => setStep(2)} type="button">Next → Generate</button>
          </div>
        </div>
      )}

      {/* step 2: generate */}
      {mode === "generate" && step === 2 && (
        <div className="pg-panel">
          <div className="pg-panel-header">Generate soundscape</div>

          <div className="pg-summary-card">
            <div className="pg-summary-row"><span className="pg-summary-label">Prompt</span><span className="pg-summary-value pg-prompt-preview">{promptText}</span></div>
            <div className="pg-summary-row"><span className="pg-summary-label">Category</span><span className="pg-summary-value">{category.replace(/_/g, " ")}</span></div>
            <div className="pg-summary-row"><span className="pg-summary-label">Provider</span><span className="pg-summary-value">{selectedProvider?.name || providerId}</span></div>
            <div className="pg-summary-row"><span className="pg-summary-label">Duration</span><span className="pg-summary-value">{duration}s{loop ? " · loop" : ""}</span></div>
            {intendedSources && <div className="pg-summary-row"><span className="pg-summary-label">Intended</span><span className="pg-summary-value">{intendedSources}</span></div>}
            {forbiddenSources && <div className="pg-summary-row"><span className="pg-summary-label">Forbidden</span><span className="pg-summary-value pg-forbidden">{forbiddenSources}</span></div>}
          </div>

          {error && <div className="pg-error">{error}</div>}

          <div className="pg-actions">
            <button className="pg-btn pg-btn-ghost" onClick={() => setStep(1)} type="button">← Back</button>
            <button
              className="pg-btn pg-btn-generate"
              disabled={generating}
              onClick={handleGenerate}
              type="button"
            >
              {generating ? (
                <><span className="pg-spinner" /> Generating…</>
              ) : (
                "⚡ Generate"
              )}
            </button>
          </div>
        </div>
      )}

      {/* step 3: listen */}
      {mode === "generate" && step === 3 && result && (
        <div className="pg-panel">
          <div className="pg-panel-header">Listen to result</div>

          <div className="pg-audio-card">
            <div className="pg-audio-id">{result.audio_id}</div>
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={`/audio/${result.audio_id}`}
              style={{ width: "100%" }}
            />
            <div className="pg-audio-meta">
              {result.generation.model} · {result.generation.file_format} · {result.analysis.duration}s · {result.analysis.sample_rate} Hz
            </div>
          </div>

          <div className="pg-panel-header" style={{ marginTop: 24 }}>Signal analysis</div>
          <div className="pg-analysis-grid">
            {[
              ["RMS", result.analysis.rms.toFixed(4)],
              ["Peak", result.analysis.peak_level.toFixed(4)],
              ["Centroid", `${result.analysis.spectral_centroid_hz.toFixed(0)} Hz`],
              ["Bandwidth", `${result.analysis.spectral_bandwidth_hz.toFixed(0)} Hz`],
              ["Flatness", result.analysis.spectral_flatness.toFixed(4)],
              ["ZCR", result.analysis.zero_crossing_rate.toFixed(4)],
              ["Silence", `${(result.analysis.silence_ratio * 100).toFixed(1)}%`],
              ["Onsets", String(result.analysis.onset_count)],
              ["Density", `${result.analysis.event_density_per_sec.toFixed(2)}/s`],
              ["Loop disc.", result.analysis.loop_boundary_discontinuity?.toFixed(4) ?? "n/a"],
            ].map(([label, value]) => (
              <div className="pg-metric" key={label}>
                <div className="pg-metric-value">{value}</div>
                <div className="pg-metric-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="pg-actions">
            <button className="pg-btn pg-btn-ghost" onClick={() => setStep(2)} type="button">← Regenerate</button>
            <button className="pg-btn pg-btn-primary" onClick={() => setStep(4)} type="button">Next → View Report</button>
          </div>
        </div>
      )}

      {/* step 4: report */}
      {mode === "generate" && step === 4 && result && (
        <div className="pg-panel">
          <div className="pg-panel-header">AKOÚŌ Listening Report</div>

          <div className="pg-report-meta">
            <span className="badge badge-status-playground_draft">playground draft</span>
            <span className={`badge badge-${result.report.regeneration_recommendation}`}>
              {result.report.regeneration_recommendation}
            </span>
            <span className="pg-report-id">{result.report.report_id}</span>
          </div>

          <p className="pg-description">{result.report.basic_description}</p>

          {/* scores */}
          <div className="pg-panel-header" style={{ marginTop: 24 }}>Scores</div>
          <div className="pg-scores-grid">
            {SCORE_AXES.map((axis) => {
              const value = typeof result.report.scores[axis] === "number" ? (result.report.scores[axis] as number) : 0;
              const risk = RISK_AXES.has(axis);
              const pct = (value / 5) * 100;
              const level = risk
                ? value <= 1 ? "high" : value <= 2.5 ? "mid" : "low"
                : value <= 2 ? "low" : value <= 3.5 ? "mid" : "high";
              return (
                <div className="pg-score-row" key={axis}>
                  <span className="pg-score-axis">{axis.replace(/_/g, " ").replace("score", "").trim()}</span>
                  <span className="pg-score-bar-wrap">
                    <span className="score-bar-track">
                      <span className="score-bar-fill" style={{ width: `${pct}%` }} data-level={level} />
                    </span>
                  </span>
                  <span className="pg-score-val">{value}</span>
                  {risk && <span className="pg-score-risk">risk</span>}
                </div>
              );
            })}
          </div>

          {/* claim taxonomy */}
          <div className="pg-panel-header" style={{ marginTop: 24 }}>Claim Taxonomy</div>
          <div className="pg-claims">
            {Object.entries(result.report.claim_taxonomy).map(([bucket, claims]) => (
              <div className="pg-claim-bucket" key={bucket}>
                <div className="pg-claim-bucket-header" style={{ borderLeftColor: CLAIM_COLORS[bucket] || "var(--border)" }}>
                  {bucket}
                  <span className="pg-claim-count">{(claims as Claim[]).length}</span>
                </div>
                {(claims as Claim[]).length === 0 ? (
                  <div className="pg-claim-empty">None recorded.</div>
                ) : (
                  (claims as Claim[]).map((claim, i) => (
                    <div className="pg-claim" key={i}>
                      <div className="pg-claim-statement">{claim.statement}</div>
                      <div className="pg-claim-footer">
                        <span className="pg-claim-confidence">{claim.confidence}</span>
                        <span className="pg-claim-basis">{claim.basis}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>

          {/* sources */}
          <div className="pg-panel-header" style={{ marginTop: 24 }}>Sources</div>
          <div className="pg-sources-grid">
            {result.report.sources.detected.length > 0 && (
              <div><div className="source-heading">Detected</div>{result.report.sources.detected.map((s) => <span className="source-tag source-intended" key={s}>{s}</span>)}</div>
            )}
            {result.report.sources.absent_expected.length > 0 && (
              <div><div className="source-heading">Absent / Expected</div>{result.report.sources.absent_expected.map((s) => <span className="source-tag source-absent" key={s}>{s}</span>)}</div>
            )}
            {result.report.sources.forbidden_detected.length > 0 && (
              <div><div className="source-heading">Forbidden detected</div>{result.report.sources.forbidden_detected.map((s) => <span className="source-tag source-forbidden" key={s}>{s}</span>)}</div>
            )}
            {result.report.sources.hallucinated.length > 0 && (
              <div><div className="source-heading">Hallucinated</div>{result.report.sources.hallucinated.map((s) => <span className="source-tag source-forbidden" key={s}>{s}</span>)}</div>
            )}
          </div>

          {/* text sections */}
          <div className="pg-text-sections">
            <div className="pg-text-block">
              <div className="pg-text-title">Ecological Plausibility</div>
              <p>{result.report.ecological_plausibility}</p>
            </div>
            <div className="pg-text-block">
              <div className="pg-text-title">Causal Coherence</div>
              <p>{result.report.causal_coherence}</p>
            </div>
            <div className="pg-text-block">
              <div className="pg-text-title">Cultural Assumptions</div>
              <p>{result.report.cultural_assumptions}</p>
            </div>
            <div className="pg-text-block">
              <div className="pg-text-title">Prompt Comparison</div>
              <p>{result.report.prompt_comparison}</p>
            </div>
            <div className="pg-text-block">
              <div className="pg-text-title">Suggested Prompt Revision</div>
              <p>{result.report.suggested_prompt_revision}</p>
            </div>
          </div>

          <div className="pg-actions">
            <button className="pg-btn pg-btn-ghost" onClick={() => setStep(3)} type="button">← Listen again</button>
            <button className="pg-btn pg-btn-ghost" onClick={() => { setResult(null); setStep(0); }} type="button">New prompt</button>
          </div>
        </div>
      )}
    </>
  );
}
