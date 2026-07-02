/**
 * Algophony Studio — Credits
 *
 * Local provider-cost accounting. Per-route cost units are used for
 * estimating batch work and keeping legacy route contracts stable.
 */

/** Provider-call estimate per API route. Kept as "credits" for legacy route contracts. */
export const CREDIT_COSTS: Record<string, number> = {
  sound_effects: 1,
  tts_creature_layer: 1,
  text_to_dialogue: 2,
  voice_design_preview: 1,
  music_synth_layer: 2,
  listen_mode_transcription: 1,
  audio_isolation: 1,
  // UI Elements route aliases
  ui_elements_sfx: 1,
  ui_elements_voice: 1,
  ui_elements_dialogue: 2,
  ui_elements_motif: 2,
  // Atmosphere Builder route aliases
  atmosphere_sfx: 1,
  atmosphere_bed: 2,
  // Variation Lab route aliases
  variation_lab_sfx: 1,
  // Stacker route aliases
  stacker_sfx: 1,
  // Foley Room route aliases
  foley_room_sfx: 1,
  // Human Lab route aliases
  human_lab_sfx: 1,
};

/** Get the provider-call estimate for a given API route (defaults to 1). */
export function getCreditCost(apiRoute: string): number {
  return CREDIT_COSTS[apiRoute] ?? 1;
}

export interface CreditState {
  creditsRemaining: number;
  monthlyLimit: number;
}

export interface LedgerEntry {
  delta: number;
  reason: string;
  generationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Check if the local compatibility quota allows a generation.
 */
export function canGenerate(state: CreditState): boolean {
  return state.creditsRemaining > 0;
}

/**
 * Create a legacy ledger entry for a generation debit.
 */
export function debitGeneration(generationId: string): LedgerEntry {
  return {
    delta: -1,
    reason: "sfx_generation",
    generationId,
  };
}

/**
 * Calculate new credit balance after applying a ledger entry.
 */
export function applyLedgerEntry(
  currentCredits: number,
  entry: LedgerEntry
): number {
  return Math.max(0, currentCredits + entry.delta);
}
