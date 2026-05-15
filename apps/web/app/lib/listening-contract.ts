/**
 * Algophony Listening Contract
 *
 * Self-contained AKOÚŌ-derived vocabulary for soundscape evaluation.
 * This file intentionally copies the public contract shape needed by
 * Algophony instead of importing from an adjacent local repository.
 */

export const AKOUO_NAME = "AKOÚŌ" as const;

export const CLAIM_CATEGORIES = [
  "heard",
  "measured",
  "inferred",
  "interpreted",
  "speculative",
  "undetermined",
] as const;

export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number];
export type ClaimConfidence = "high" | "medium" | "low" | "undetermined";

export interface AkouoClaim {
  statement: string;
  confidence: ClaimConfidence;
  basis: string;
}

export type ClaimTaxonomy = Record<ClaimCategory, AkouoClaim[]>;

export const CLAIM_LABELS: Record<ClaimCategory, string> = {
  heard: "Heard",
  measured: "Measured",
  inferred: "Inferred",
  interpreted: "Interpreted",
  speculative: "Speculative",
  undetermined: "Undetermined",
};

export const CLAIM_DESCRIPTIONS: Record<ClaimCategory, string> = {
  heard: "Directly present in the audio, prompt, transcript, or provided description",
  measured: "Produced by file, signal, waveform, spectrogram, or metadata inspection",
  inferred: "Plausible logical deductions (not theory or culture)",
  interpreted: "Cultural, theoretical, affective, or contextual reading",
  speculative: "Fictional, symbolic, imaginative, or possible-world reading",
  undetermined: "What cannot be responsibly claimed",
};

export const CLAIM_COLORS: Record<ClaimCategory, string> = {
  heard: "#4fb286",
  measured: "#5bb8c2",
  inferred: "#d4a843",
  interpreted: "#c084fc",
  speculative: "#e85d5d",
  undetermined: "#666666",
};

export const AKOUO_LISTENING_MODES = [
  "signal-inspection-listening",
  "acoulogical-object-listening",
  "embodied-affective-listening",
  "transductive-media-listening",
  "forensic-archival-listening",
  "ecological-posthuman-listening",
  "critical-political-listening",
  "musical-aesthetic-listening",
  "symbolic-fictional-listening",
] as const;

export type AkouoListeningMode = (typeof AKOUO_LISTENING_MODES)[number];

export const AKOUO_INPUT_TYPES = [
  "audio_file",
  "sound_prompt",
  "transcript",
  "field_note",
  "archive_note",
  "dataset_description",
  "spectrogram",
  "waveform",
  "video",
  "metadata",
  "model_output",
  "mixed",
  "unknown",
  "other",
] as const;

export type AkouoInputType = (typeof AKOUO_INPUT_TYPES)[number];

export const AKOUO_COMMAND_NAMES = [
  "/listen",
  "/full-ear",
  "/study",
  "/tech",
  "/reference",
  "/litany",
  "/fiction",
  "/forensic",
  "/transduce",
  "/one-sound-many-ears",
] as const;

export type AkouoCommandName = (typeof AKOUO_COMMAND_NAMES)[number];

export interface AkouoMediations {
  technical: string[];
  cultural: string[];
  spatial: string[];
  bodily: string[];
  archival: string[];
  computational: string[];
}

export interface AkouoRisks {
  hallucination: string[];
  over_identification: string[];
  cultural_flattening: string[];
  forensic_overreach: string[];
  source_confusion: string[];
  aesthetic_overstatement: string[];
}

export interface AkouoRouterOutput {
  object_listened_to: string;
  input_type: AkouoInputType;
  user_intent: string;
  available_evidence: string[];
  unavailable_evidence: string[];
  primary_mode: AkouoListeningMode;
  secondary_mode: AkouoListeningMode;
  corrective_mode: AkouoListeningMode;
  route_reasoning: string[];
  risks: string[];
  must_not_assume: string[];
  recommended_command: AkouoCommandName;
  recommended_next_mode: AkouoListeningMode;
}

export interface AkouoListeningOutput {
  object_listened_to: string;
  input_type: AkouoInputType;
  listening_mode: AkouoListeningMode;
  listening_claims: ClaimTaxonomy;
  what_appears: string[];
  what_remains_hidden: string[];
  mediations: AkouoMediations;
  risks: AkouoRisks;
  main_reading: string;
  alternative_reading: string;
  recommended_next_mode: AkouoListeningMode | "none" | "undetermined";
}

export const LISTENING_MODE_LABELS: Record<AkouoListeningMode, string> = {
  "signal-inspection-listening": "Signal Inspection",
  "acoulogical-object-listening": "Acoulogical Object",
  "embodied-affective-listening": "Embodied Affective",
  "transductive-media-listening": "Transductive Media",
  "forensic-archival-listening": "Forensic Archival",
  "ecological-posthuman-listening": "Ecological Posthuman",
  "critical-political-listening": "Critical Political",
  "musical-aesthetic-listening": "Musical Aesthetic",
  "symbolic-fictional-listening": "Symbolic Fictional",
};
