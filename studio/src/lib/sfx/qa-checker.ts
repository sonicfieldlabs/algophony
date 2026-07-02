/**
 * Algophony Studio — Technical QA / Conformance Checker
 *
 * Runs a pre-export quality assurance pass on generated assets.
 * Checks metadata completeness, naming conformance, duration rules,
 * loop candidacy, format compliance, and provenance chain integrity.
 *
 * Tier: Studio / Pro
 */

// ── QA Check Definitions ─────────────────────────────────────

export type QaCheckId =
  | "duration_match"
  | "loop_candidate"
  | "filename_valid"
  | "metadata_complete"
  | "format_correct"
  | "sample_rate"
  | "not_too_long_ui"
  | "not_too_short_ambience"
  | "has_project_tags"
  | "has_provenance"
  | "has_license_note"
  // DSP checks (future / optional)
  | "peak_level"
  | "rms_lufs"
  | "silence_detection"
  | "clipping_detection"
  | "spectral_centroid"
  | "transient_density"
  | "loop_seam";

export type QaSeverity = "error" | "warning" | "info" | "pass";

export interface QaCheckDef {
  id: QaCheckId;
  label: string;
  description: string;
  group: "metadata" | "technical" | "naming" | "content" | "dsp";
  isDsp: boolean;
  severity: QaSeverity;
}

export const QA_CHECKS: QaCheckDef[] = [
  // Metadata checks
  { id: "metadata_complete", label: "Metadata Complete", description: "All required metadata fields are populated", group: "metadata", isDsp: false, severity: "error" },
  { id: "has_project_tags", label: "Project / Cue / Category Tags", description: "Has project, cue, and category assigned", group: "metadata", isDsp: false, severity: "warning" },
  { id: "has_provenance", label: "Prompt Provenance", description: "Has original prompt, model ID, and generation date", group: "metadata", isDsp: false, severity: "warning" },
  { id: "has_license_note", label: "License / Compliance Note", description: "Has a license or usage compliance note", group: "metadata", isDsp: false, severity: "info" },
  // Technical checks
  { id: "duration_match", label: "Duration Matches Target", description: "Actual duration is within 20% of requested duration", group: "technical", isDsp: false, severity: "warning" },
  { id: "format_correct", label: "Format Correct", description: "Output format matches the requested format", group: "technical", isDsp: false, severity: "error" },
  { id: "sample_rate", label: "Sample Rate / Bitrate", description: "Sample rate is 44.1 kHz or 48 kHz (broadcast standard)", group: "technical", isDsp: false, severity: "info" },
  // Content checks
  { id: "loop_candidate", label: "Loop Candidacy", description: "If marked as loop, verify loop flag is set", group: "content", isDsp: false, severity: "warning" },
  { id: "not_too_long_ui", label: "Not Too Long for UI", description: "UI sounds should be under 2 seconds", group: "content", isDsp: false, severity: "warning" },
  { id: "not_too_short_ambience", label: "Not Too Short for Ambience", description: "Ambience should be at least 8 seconds", group: "content", isDsp: false, severity: "warning" },
  // Naming checks
  { id: "filename_valid", label: "File Naming Valid", description: "Filename follows naming convention (no spaces, no special chars)", group: "naming", isDsp: false, severity: "error" },
  // Future DSP checks
  { id: "peak_level", label: "Peak Level", description: "Peak level is below 0 dBFS", group: "dsp", isDsp: true, severity: "warning" },
  { id: "rms_lufs", label: "RMS / LUFS Estimate", description: "RMS level within expected range", group: "dsp", isDsp: true, severity: "info" },
  { id: "silence_detection", label: "Silence Detection", description: "No excessive silence in the asset", group: "dsp", isDsp: true, severity: "warning" },
  { id: "clipping_detection", label: "Clipping Detection", description: "No digital clipping detected", group: "dsp", isDsp: true, severity: "error" },
  { id: "spectral_centroid", label: "Spectral Centroid", description: "Spectral balance within expected range", group: "dsp", isDsp: true, severity: "info" },
  { id: "transient_density", label: "Transient Density", description: "Transient count is appropriate for the category", group: "dsp", isDsp: true, severity: "info" },
  { id: "loop_seam", label: "Loop Seam Roughness", description: "Loop transition is seamless", group: "dsp", isDsp: true, severity: "warning" },
];

export const QA_CHECK_GROUPS = ["metadata", "technical", "content", "naming", "dsp"] as const;
export type QaCheckGroup = (typeof QA_CHECK_GROUPS)[number];

export const QA_GROUP_LABELS: Record<QaCheckGroup, string> = {
  metadata: "Metadata & Provenance",
  technical: "Technical Specs",
  content: "Content Rules",
  naming: "Naming Convention",
  dsp: "DSP Analysis (Future)",
};

// ── QA Result ────────────────────────────────────────────────

export interface QaCheckResult {
  checkId: QaCheckId;
  passed: boolean;
  severity: QaSeverity;
  message: string;
  details?: string;
}

export interface QaAssetReport {
  assetId: string;
  filename: string;
  results: QaCheckResult[];
  passCount: number;
  warnCount: number;
  errorCount: number;
  infoCount: number;
  overallStatus: "pass" | "warn" | "fail";
}

export interface QaBatchReport {
  totalAssets: number;
  passedAssets: number;
  warnedAssets: number;
  failedAssets: number;
  assetReports: QaAssetReport[];
  runAt: string;
  checksEnabled: QaCheckId[];
}

// ── QA Engine ────────────────────────────────────────────────

const FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-\.]*$/;
const UI_CATEGORIES = ["ui", "interface", "notification", "button", "click", "toggle"];
const AMBIENCE_CATEGORIES = ["ambience", "atmosphere", "room tone", "environment", "background"];

/**
 * Run QA checks on a single asset.
 */
export function runAssetQa(
  asset: Record<string, unknown>,
  checksToRun: QaCheckId[] = QA_CHECKS.filter((c) => !c.isDsp).map((c) => c.id)
): QaAssetReport {
  const results: QaCheckResult[] = [];
  const payload = (asset.request_payload ?? {}) as Record<string, unknown>;
  const meta = (asset.metadata ?? {}) as Record<string, unknown>;
  const category = String(asset.category ?? payload.category ?? meta.category ?? "").toLowerCase();

  for (const checkId of checksToRun) {
    const def = QA_CHECKS.find((c) => c.id === checkId);
    if (!def || def.isDsp) continue;

    switch (checkId) {
      case "metadata_complete": {
        const missing: string[] = [];
        if (!asset.id) missing.push("id");
        if (!payload.text) missing.push("prompt");
        if (!asset.elevenlabs_model_id && !payload.model_id) missing.push("model_id");
        if (asset.duration_seconds == null) missing.push("duration");
        if (!asset.output_format) missing.push("output_format");
        results.push({
          checkId,
          passed: missing.length === 0,
          severity: missing.length > 0 ? "error" : "pass",
          message: missing.length === 0 ? "All required fields present" : `Missing: ${missing.join(", ")}`,
          details: missing.length > 0 ? `${missing.length} field(s) missing` : undefined,
        });
        break;
      }

      case "has_project_tags": {
        const missing: string[] = [];
        if (!asset.project_id && !meta.project) missing.push("project");
        if (!category) missing.push("category");
        if (!meta.cueId && !meta.scene) missing.push("cue/scene");
        results.push({
          checkId,
          passed: missing.length === 0,
          severity: missing.length > 0 ? "warning" : "pass",
          message: missing.length === 0 ? "Tags complete" : `Missing: ${missing.join(", ")}`,
        });
        break;
      }

      case "has_provenance": {
        const hasPrompt = Boolean(payload.text);
        const hasModel = Boolean(asset.elevenlabs_model_id ?? payload.model_id);
        const hasDate = Boolean(asset.created_at);
        const hasRequestId = Boolean(asset.request_id);
        const score = [hasPrompt, hasModel, hasDate, hasRequestId].filter(Boolean).length;
        results.push({
          checkId,
          passed: score >= 3,
          severity: score < 3 ? "warning" : "pass",
          message: score >= 3 ? "Full provenance chain" : `Provenance ${score}/4 (prompt, model, date, request ID)`,
        });
        break;
      }

      case "has_license_note": {
        const hasLicense = Boolean(meta.license ?? meta.compliance ?? meta.usage_rights);
        results.push({
          checkId,
          passed: hasLicense,
          severity: hasLicense ? "pass" : "info",
          message: hasLicense ? "License note present" : "No license/compliance note — consider adding one",
        });
        break;
      }

      case "duration_match": {
        const requested = Number(payload.duration_seconds ?? 0);
        const actual = Number(asset.duration_seconds ?? 0);
        if (requested > 0 && actual > 0) {
          const ratio = actual / requested;
          const passed = ratio >= 0.8 && ratio <= 1.2;
          results.push({
            checkId, passed,
            severity: passed ? "pass" : "warning",
            message: passed
              ? `Duration ${actual}s matches target ${requested}s`
              : `Duration ${actual}s deviates from target ${requested}s (${Math.round((ratio - 1) * 100)}%)`,
          });
        } else {
          results.push({ checkId, passed: true, severity: "pass", message: "No duration target to verify" });
        }
        break;
      }

      case "format_correct": {
        const reqFormat = String(payload.output_format ?? "");
        const actualFormat = String(asset.output_format ?? "");
        if (reqFormat && actualFormat) {
          const passed = reqFormat.toLowerCase() === actualFormat.toLowerCase();
          results.push({ checkId, passed, severity: passed ? "pass" : "error", message: passed ? `Format matches (${actualFormat})` : `Format mismatch: requested ${reqFormat}, got ${actualFormat}` });
        } else {
          results.push({ checkId, passed: true, severity: "pass", message: "Format not specified" });
        }
        break;
      }

      case "sample_rate": {
        // Inferred from format — MP3 is typically 44.1k or 48k
        const format = String(asset.output_format ?? "mp3").toLowerCase();
        const isStandard = ["mp3_44100_128", "mp3_44100_192", "pcm_44100", "pcm_48000", "mp3_22050_32"].some((f) => format.includes(f)) || ["mp3", "wav", "pcm"].includes(format);
        results.push({ checkId, passed: isStandard, severity: "pass", message: `Format: ${format}` });
        break;
      }

      case "loop_candidate": {
        const isLoop = Boolean(payload.loop);
        const markedLoop = Boolean(asset.loop ?? payload.loop);
        if (isLoop && !markedLoop) {
          results.push({ checkId, passed: false, severity: "warning", message: "Requested as loop but loop flag not set" });
        } else {
          results.push({ checkId, passed: true, severity: "pass", message: isLoop ? "Loop flag consistent" : "Not a loop candidate" });
        }
        break;
      }

      case "not_too_long_ui": {
        const isUi = UI_CATEGORIES.some((c) => category.includes(c));
        const duration = Number(asset.duration_seconds ?? 0);
        if (isUi && duration > 2) {
          results.push({ checkId, passed: false, severity: "warning", message: `UI sound is ${duration}s (recommended < 2s)` });
        } else {
          results.push({ checkId, passed: true, severity: "pass", message: isUi ? `UI sound at ${duration}s — OK` : "Not a UI category" });
        }
        break;
      }

      case "not_too_short_ambience": {
        const isAmbience = AMBIENCE_CATEGORIES.some((c) => category.includes(c));
        const duration = Number(asset.duration_seconds ?? 0);
        if (isAmbience && duration < 8) {
          results.push({ checkId, passed: false, severity: "warning", message: `Ambience is ${duration}s (recommended ≥ 8s)` });
        } else {
          results.push({ checkId, passed: true, severity: "pass", message: isAmbience ? `Ambience at ${duration}s — OK` : "Not an ambience category" });
        }
        break;
      }

      case "filename_valid": {
        const path = String(asset.audio_storage_path ?? "");
        const filename = path.split("/").pop() ?? "";
        const passed = filename.length > 0 && FILENAME_PATTERN.test(filename);
        results.push({
          checkId, passed,
          severity: passed ? "pass" : "error",
          message: passed ? `Filename valid: ${filename}` : `Invalid filename: "${filename}" (spaces or special chars)`,
        });
        break;
      }
    }
  }

  const passCount = results.filter((r) => r.severity === "pass").length;
  const warnCount = results.filter((r) => r.severity === "warning").length;
  const errorCount = results.filter((r) => r.severity === "error").length;
  const infoCount = results.filter((r) => r.severity === "info").length;

  return {
    assetId: String(asset.id ?? ""),
    filename: String(asset.audio_storage_path ?? "").split("/").pop() ?? "unknown",
    results,
    passCount,
    warnCount,
    errorCount,
    infoCount,
    overallStatus: errorCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass",
  };
}

/**
 * Run QA on a batch of assets.
 */
export function runBatchQa(
  assets: Record<string, unknown>[],
  checksToRun?: QaCheckId[]
): QaBatchReport {
  const enabled = Array.isArray(checksToRun)
    ? checksToRun
    : QA_CHECKS.filter((c) => !c.isDsp).map((c) => c.id);
  const reports = assets.map((a) => runAssetQa(a, enabled));

  return {
    totalAssets: reports.length,
    passedAssets: reports.filter((r) => r.overallStatus === "pass").length,
    warnedAssets: reports.filter((r) => r.overallStatus === "warn").length,
    failedAssets: reports.filter((r) => r.overallStatus === "fail").length,
    assetReports: reports,
    runAt: new Date().toISOString(),
    checksEnabled: enabled,
  };
}
