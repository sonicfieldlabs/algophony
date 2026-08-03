/**
 * Shared type definitions used by both server (data.ts) and client components.
 * Keep this the single source of truth; do not redeclare these in pages.
 */

export type SourceType =
  | "generated_procedural"
  | "generated_ml"
  | "field_recording"
  | "found_sound"
  | "hybrid";

export type ReviewStatus =
  | "unreviewed"
  | "agent_draft"
  | "human_reviewed"
  | "hybrid_reviewed"
  | "playground_draft";

export type ListenerType = "human" | "agent" | "hybrid";

export type ListeningProcess =
  | "agent_automated"
  | "agent_interactive"
  | "human_blind"
  | "human_informed"
  | "hybrid";

export type RegenerationRecommendation = "keep" | "revise" | "reject";

export interface UploadMetadata {
  original_filename?: string;
  recorder?: string;
  location?: string;
  date_recorded?: string;
  equipment?: string;
  notes?: string;
}

export interface EarwormTrace {
  trace_status:
    | "not_recorded"
    | "planned"
    | "active"
    | "exported"
    | "forgotten"
    | "partial"
    | "unknown";
  session_id: string | null;
  app_id?: string;
  akousmata_operations: ("remember" | "list" | "search" | "similarity" | "export" | "forget")[];
  event_chain: {
    event_id: string;
    type: string;
    actor: "user" | "agent" | "system" | "provider";
    wall_clock: string;
    parent_event_ids: string[];
    provenance_id?: string;
    event_hash?: string;
    summary?: string;
  }[];
  asset_refs: {
    asset_id: string;
    type?: "audio" | "midi" | "text" | "control" | "video" | "image" | "metadata" | "analysis";
    uri?: string;
    duration_seconds?: number;
    sample_rate?: number;
    channels?: number;
    provenance_id?: string;
  }[];
  provenance_refs: {
    provenance_id: string;
    source_type: "generated" | "recorded" | "imported" | "cloned" | "designed" | "unknown";
    provider?: string;
    model_id?: string;
    request_hash?: string;
    asset_hash?: string;
    consent_status: "owned" | "licensed" | "public_domain" | "unknown" | "restricted";
    usage_constraints?: string[];
  }[];
  signal_packets: {
    packet_id: string;
    signal_type: "audio" | "midi" | "text" | "control" | "video" | "image";
    asset_ref?: string;
    segment_id?: string;
    time_range: { start: number; end: number; unit: "seconds" | "samples" | "frames" };
    context_refs: string[];
    features_ref?: string;
    feature_stream_ref?: string;
    provenance_id?: string;
    tags: string[];
  }[];
  context_bundle_refs: {
    bundle_id: string;
    selector: Record<string, unknown>;
    summary: string;
    event_ids?: string[];
    asset_ids?: string[];
    provenance_ids?: string[];
  }[];
  retention_policy: {
    retention_class: "ephemeral" | "session" | "project" | "release" | "restricted" | "forget_requested" | "unknown";
    consent_status: "owned" | "licensed" | "public_domain" | "unknown" | "restricted" | "not_applicable";
    local_only: boolean;
    deletion_supported: boolean;
    expires_at?: string | null;
    restricted_fields?: string[];
  };
  notes?: string[];
}

export interface Prompt {
  prompt_id: string;
  prompt_text: string;
  category: string;
  subcategories: string[];
  intended_sources: string[];
  forbidden_sources: string[];
  location_imaginary: string;
  listening_mode: string;
  duration_target: number;
  loop_required: boolean;
  difficulty: string;
  evaluation_focus: string[];
}

export interface Generation {
  audio_id: string;
  prompt_id: string;
  model: string;
  model_version: string;
  generation_date: string;
  duration: number;
  seed: number | null;
  storage_uri: string;
  parameters: Record<string, unknown>;
  license_status: string;
  file_format: string;
  sha256: string;
  akouo_report_id: string;
  human_notes: string[];
  source_type: SourceType;
  upload_metadata: UploadMetadata | null;
  earworm_trace?: EarwormTrace | null;
}

export interface ScoreSet {
  prompt_adherence: number;
  source_accuracy: number;
  spatial_coherence: number;
  event_density_score: number;
  ecological_plausibility: number;
  causal_coherence: number;
  false_source_index: number;
  generic_naturalism_index: number;
  cultural_cliche_index: number;
  loopability: number;
  regeneration_potential: RegenerationRecommendation;
  artificiality_discriminability?: number | null;
  disclosure_integrity?: number | null;
  homogenization_index?: number | null;
  voice_consent_risk?: number | null;
}

export interface Claim {
  statement: string;
  confidence: "high" | "medium" | "low" | "undetermined";
  basis: string;
  source?: "audio" | "dsp" | "metadata" | "model" | "transcript" | "context" | "memory" | "human" | "other";
  listening_pass_id?: string | null;
  time_range?: { start_s: number; end_s: number };
}

export type ReportClaimTaxonomy = Record<
  "heard" | "measured" | "inferred" | "interpreted" | "speculative" | "undetermined",
  Claim[]
>;

export interface Report {
  report_id: string;
  report_type: "signal_report" | "listening_report";
  audio_id: string;
  prompt_id: string;
  listening_date: string;
  listener_type: ListenerType;
  review_status: ReviewStatus;
  listening_process: ListeningProcess;
  source_type_ground_truth: SourceType | null;
  source_type_listener_guess: "generated" | "field_recording" | "uncertain" | null;
  reviewer_notes: string[];
  evidence_inputs: string[];
  classifier_outputs: Record<string, unknown>[];
  revision_history: Record<string, unknown>[];
  claim_taxonomy: ReportClaimTaxonomy;
  akouo_contract_version?: string | null;
  akouo_router_output?: {
    object_listened_to: string;
    input_type: string;
    user_intent: string;
    available_evidence: string[];
    unavailable_evidence: string[];
    primary_mode: string;
    secondary_mode: string;
    corrective_mode: string;
    route_reasoning: string[];
    risks: string[];
    must_not_assume: string[];
    recommended_command: string;
    recommended_next_mode: string;
  } | null;
  akouo_mode_outputs?: {
    object_listened_to: string;
    input_type: string;
    listening_mode: string;
    listening_claims: ReportClaimTaxonomy;
    what_appears: string[];
    what_remains_hidden: string[];
    mediations: Record<string, string[]>;
    risks: Record<string, string[]>;
    main_reading: string;
    alternative_reading: string;
    recommended_next_mode: string;
    akouo_version?: string;
    apparatus?: {
      substrate: string;
      perception_sources?: string[];
      model_ids?: string[];
      sample_rate_hz?: number | null;
      channels?: number | null;
      bandwidth_limit_hz?: number | null;
      known_blind_spots: string[];
      capture_notes?: string[];
    };
    listener?: { type: "human" | "agent" | "hybrid"; process?: string };
    memory?: { akousma_id?: string | null; akousmata_refs?: string[]; lineage_note?: string | null };
  }[];
  akouo_routing_plan?: {
    object_listened_to: string;
    input_type: string;
    route_confidence: string;
    evidence_level: string;
    mode_chain: { mode: string; role: string; reason: string }[];
    claim_permissions: {
      heard_allowed: boolean;
      measured_allowed: boolean;
      inferred_allowed: boolean;
      interpreted_allowed: boolean;
      speculative_allowed: boolean;
      must_include_undetermined: boolean;
    };
    agent_handoff: {
      summary: string;
      required_inputs: string[];
      forbidden_assumptions: string[];
      recommended_command: string;
    };
    stop_conditions: string[];
    budget?: "light" | "standard" | "deep";
    preset_id?: string;
  } | null;
  akouo_reference_map?: {
    concepts_triggered: string[];
    sonic_methodologies: string[];
    authors_or_traditions: string[];
    possible_research_routes: string[];
    research_questions: string[];
    cautions: string[];
    adjacent_modes: string[];
  } | null;
  earworm_trace?: EarwormTrace | null;
  basic_description: string;
  sources: {
    detected: string[];
    inferred: string[];
    absent_expected: string[];
    forbidden_detected: string[];
    hallucinated: string[];
  };
  spatial_structure: Record<string, unknown>;
  temporal_behavior: Record<string, unknown>;
  ecological_plausibility: string;
  causal_coherence: string;
  cultural_assumptions: string;
  false_sources: string[];
  prompt_comparison: string;
  suggested_prompt_revision: string;
  regeneration_recommendation: RegenerationRecommendation;
  score_sets: {
    signal_scores: ScoreSet;
    agent_scores: ScoreSet;
    human_scores: ScoreSet | null;
    final_scores: ScoreSet;
  };
  score_provenance: {
    axis: string;
    score: number;
    scorer: string;
    evidence: string;
    confidence: string;
    notes: string;
  }[];
  scores: ScoreSet;
}

export interface ScoreRecord {
  suite_id: string;
  prompt_id: string;
  audio_id: string;
  report_id: string;
  model: { provider: string; version: string; type: string };
  score_sets: Report["score_sets"];
  score_provenance: Report["score_provenance"];
  final_scores: ScoreSet;
  date: string;
}

export interface BenchmarkSuite {
  id: string;
  title: string;
  description: string;
  benchmark_status: "procedural_pilot" | "ml_benchmark" | "hybrid_benchmark" | "archived";
  version: string;
  models_compared: {
    provider_id: string;
    name: string;
    type: string;
    status: string;
    version?: string;
    description: string;
    synthesis_method: string;
  }[];
  score_axes: { axis: string; range: number[]; direction: string; description: string }[];
  total_generations: number;
  total_reports: number;
  ml_generation_count: number;
  procedural_generation_count: number;
  limitations: string[];
  exports: { csv: string; markdown: string; json: string };
}

export interface ProviderStatus {
  provider_id: string;
  name: string;
  type: string;
  runtime: "api" | "local";
  version: string;
  license_status: string;
  install_hint: string;
  env_requirements: string[];
  optional_dependencies: string[];
  max_duration_seconds: number | null;
  supports_loop: boolean;
  supports_seed: boolean;
  default_parameters: Record<string, unknown>;
  status: "available" | "configured_missing_key" | "not_installed" | "not_implemented" | "failed";
  status_reason: string;
  openness?: "open_source_internal" | "open_weights_local" | "open_code_hosted" | "closed_api";
}
