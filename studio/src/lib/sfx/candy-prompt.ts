/**
 * Algophony Studio — Misc Prompt Engine
 *
 * Builds ElevenLabs-ready prompts for the Misc tabs:
 *   push · artifacts · noise · impact
 *
 * Impact also supports a 3-band layered output (low / mid / high) where each
 * band gets its own prompt designed to play in a designer's DAW stack.
 */

import type {
  PushSettings,
  ArtifactSettings,
  NoiseSettings,
  ImpactSettings,
  ImpactBandLayer,
  PulseSettings,
  TimbreSettings,
} from "./candy-taxonomy";
import {
  PUSH_TYPE_LABELS,
  ARTIFACT_TYPE_LABELS,
  NOISE_FLAVOR_LABELS,
  IMPACT_FAMILY_LABELS,
  IMPACT_FAMILY_MATERIALS,
  PULSE_MOTION_TYPE_LABELS,
  PULSE_SPECTRAL_WEIGHT_LABELS,
  TIMBRE_MATERIAL_LABELS,
  TIMBRE_MOVEMENT_LABELS,
  TIMBRE_FUNCTION_LABELS,
} from "./candy-taxonomy";

const NO_DIALOGUE = "no dialogue, no music, isolated sound effect";

// ── Push ──────────────────────────────────────────────────────

export function buildPushPrompt(s: PushSettings): string {
  const type = PUSH_TYPE_LABELS[s.pushType].toLowerCase();
  const dir = s.direction.replace("→", " to ");
  const sweep =
    s.pitchSweep > 0.6 ? "strong upward pitch sweep" :
    s.pitchSweep > 0.2 ? "rising pitch" :
    s.pitchSweep < -0.6 ? "strong downward pitch sweep" :
    s.pitchSweep < -0.2 ? "falling pitch" :
    "neutral pitch contour";

  const intensity =
    s.intensity > 0.8 ? "very intense" :
    s.intensity > 0.5 ? "intense" :
    s.intensity > 0.25 ? "moderate" : "subtle";

  const tail =
    s.tail === "none" ? "no tail, hard cut" :
    s.tail === "short_tail" ? "short tail" :
    s.tail === "long_tail" ? "long reverberant tail" :
    "infinitely-decaying tail";

  const doppler = s.doppler ? "with pronounced doppler bend" : "";

  const parts = [
    `${intensity} cinematic ${type} of ${s.medium}`,
    `moving ${dir}, ${s.speed} motion`,
    sweep, doppler, tail,
    `${s.realism} style`,
    NO_DIALOGUE,
  ].filter(Boolean);
  return clean(parts.join(", ") + ".");
}

// ── Artifacts ─────────────────────────────────────────────────

export function buildArtifactPrompt(s: ArtifactSettings): string {
  const type = ARTIFACT_TYPE_LABELS[s.artifactType].toLowerCase();
  const eventsPerSec = `~${Math.round(s.speed)} events/sec`;
  const jitter =
    s.jitter > 0.7 ? "highly randomized timing" :
    s.jitter > 0.35 ? "loose timing" : "tight timing";
  const crush =
    s.bitCrush > 0.7 ? "heavily bit-crushed and aliased" :
    s.bitCrush > 0.35 ? "lightly bit-crushed" : "clean digital";

  const dryWet =
    s.dryWet > 0.7 ? "wet/processed" :
    s.dryWet > 0.35 ? "blended" : "dry";

  const parts = [
    `${s.density} ${type} artifacts in the ${s.pitch} band`,
    eventsPerSec,
    jitter, crush, dryWet,
    s.source ? `source: ${s.source}` : "",
    `${s.realism} style`,
    NO_DIALOGUE,
  ].filter(Boolean);
  return clean(parts.join(", ") + ".");
}

// ── Noise ─────────────────────────────────────────────────────

export function buildNoisePrompt(s: NoiseSettings): string {
  const flavor = NOISE_FLAVOR_LABELS[s.flavor].toLowerCase();
  const intensity =
    s.intensity > 0.8 ? "overwhelming" :
    s.intensity > 0.5 ? "thick" :
    s.intensity > 0.25 ? "present" : "subtle";

  const motion =
    s.motion === "static" ? "static field" :
    s.motion === "swelling" ? "swelling crescendo" :
    s.motion === "pulsing" ? "rhythmically pulsing" :
    s.motion === "scanning" ? "scanning across frequencies" :
    "erratic and unpredictable";

  const distortion =
    s.distortion === "clean" ? "clean noise" :
    s.distortion === "soft_saturation" ? "softly saturated" :
    s.distortion === "warm_overdrive" ? "warm overdrive" :
    s.distortion === "fuzz" ? "fuzz-distorted" :
    s.distortion === "destroyed" ? "fully destroyed signal" :
    "extreme distortion at the brink of clipping";

  const bandwidth =
    s.bandwidth === "telephone" ? "telephone-bandwidth (300Hz–3kHz)" :
    s.bandwidth === "lo_fi_narrow" ? "lo-fi narrow-band" :
    s.bandwidth === "broadband" ? "broadband full-range" :
    s.bandwidth === "ultrasonic" ? "ultrasonic high-frequency" :
    s.bandwidth === "sub_only" ? "sub-bass only" : "full range";

  const usage = `for ${s.usage.replace(/_/g, " ")} use`;
  const tags = s.tags.length ? `tags: ${s.tags.join(", ")}` : "";

  const parts = [
    `${intensity} ${flavor}`,
    motion, distortion, bandwidth, usage, tags,
    `${s.realism} style`,
    NO_DIALOGUE,
  ].filter(Boolean);
  return clean(parts.join(", ") + ".");
}

/**
 * Music-Compose prompt for "saturated room" / atmospheric noise beds.
 * We force `instrumental: true` server-side and ask for a textural pad.
 */
export function buildNoiseMusicPrompt(s: NoiseSettings): string {
  const intensity =
    s.intensity > 0.8 ? "overwhelming" :
    s.intensity > 0.5 ? "thick" :
    s.intensity > 0.25 ? "present" : "subtle";

  return clean([
    `An ${intensity} textural noise bed in the spirit of a ${NOISE_FLAVOR_LABELS[s.flavor].toLowerCase()},`,
    `with ${s.distortion.replace(/_/g, " ")} character and ${s.motion} motion.`,
    `Bandwidth feels ${s.bandwidth.replace(/_/g, " ")}, used as a ${s.usage.replace(/_/g, " ")} layer.`,
    `Strictly instrumental, no melody, no drums, no rhythm, no music — just atmospheric noise.`,
    s.tags.length ? `Traits: ${s.tags.join(", ")}.` : "",
  ].filter(Boolean).join(" "));
}

// ── Impact (single + 3-band) ──────────────────────────────────

export function buildImpactPrompt(s: ImpactSettings): string {
  const family = IMPACT_FAMILY_LABELS[s.family].toLowerCase();
  const material = s.material || IMPACT_FAMILY_MATERIALS[s.family];
  const target = s.target.replace(/_/g, " ");

  const tail =
    s.tail === "dry" ? "no tail, dry hit" :
    s.tail === "short_tail" ? "short tail" :
    s.tail === "medium_tail" ? "medium tail" :
    s.tail === "long_tail" ? "long resonant tail" :
    "cinematic sub-drop with long decay";

  const parts = [
    `${s.distance} ${s.realism} ${family} impact`,
    `${s.size} ${material} ${s.situation.replace(/_/g, " ")} on ${target}`,
    tail,
    NO_DIALOGUE,
  ].filter(Boolean);
  return clean(parts.join(", ") + ".");
}

/** Build one prompt per enabled band. Each band emphasizes its frequency range. */
export interface ImpactBandPrompt {
  band: "low" | "mid" | "high";
  prompt: string;
}

export function buildImpactBandPrompts(s: ImpactSettings): ImpactBandPrompt[] {
  if (!s.layeredDesign) return [];
  return s.bands
    .filter((b) => b.enabled)
    .map((band) => ({
      band: band.band,
      prompt: buildSingleBand(s, band),
    }));
}

function buildSingleBand(s: ImpactSettings, band: ImpactBandLayer): string {
  const family = IMPACT_FAMILY_LABELS[s.family].toLowerCase();
  const situation = s.situation.replace(/_/g, " ");
  const target = s.target.replace(/_/g, " ");

  const bandHint =
    band.band === "low"
      ? "deep sub-bass body and chest-thump, rich low frequencies below 200Hz, no high-end content"
      : band.band === "mid"
        ? "midrange punch and material crack, focused 200Hz–4kHz, transient detail"
        : "high-frequency shrapnel, debris, sizzle and air, content above 4kHz only";

  const weight =
    band.weight > 0.75 ? "dominant" :
    band.weight > 0.45 ? "balanced" : "supporting";

  return clean(
    [
      `${weight} ${band.band}-band layer of a ${s.size} ${family} ${situation} on ${target}`,
      `material: ${band.material}`,
      bandHint,
      `${s.realism} style`,
      NO_DIALOGUE,
    ].join(", ") + "."
  );
}

// ── Pulse (motion layers) ─────────────────────────────────────

export function buildPulsePrompt(s: PulseSettings): string {
  const motion = PULSE_MOTION_TYPE_LABELS[s.motionType].toLowerCase();
  const spectral = PULSE_SPECTRAL_WEIGHT_LABELS[s.spectralWeight].toLowerCase();
  const avoid = s.avoidText.trim();

  const parts = [
    `Instrumental motion layer for ${s.useCase.replace(/_/g, " ")}`,
    `built from ${motion}`,
    `${s.material} material`,
    `${s.tempoImpression} movement`,
    `${s.regularity} rhythm`,
    `${s.density} density`,
    `${spectral} spectral weight`,
    `expressing ${s.emotion}`,
  ];
  const guardrails = "No vocals, no lyrics, no strong melody, no commercial song structure, no artist references.";
  return clean(parts.join(", ") + ". " + guardrails + (avoid ? " " + avoid : ""));
}

// ── Timbre (texture layers) ───────────────────────────────────

export function buildTimbrePrompt(s: TimbreSettings): string {
  const material = TIMBRE_MATERIAL_LABELS[s.material].toLowerCase();
  const movement = TIMBRE_MOVEMENT_LABELS[s.movement].toLowerCase();
  const fn = TIMBRE_FUNCTION_LABELS[s.function].toLowerCase();
  const avoid = s.avoidText.trim();

  const parts = [
    `Instrumental timbre study made of ${material} sound matter`,
    `${s.timbre} color`,
    `${s.gesture} gesture`,
    `${s.texture} texture`,
    `and ${movement} movement`,
  ];
  const tail = `${s.density} density, designed as ${fn}.`;
  const guardrails = "No vocals, no lyrics, no drums unless explicitly requested, no commercial song structure, no artist references.";
  return clean(parts.join(", ") + ". " + tail + " " + guardrails + (avoid ? " " + avoid : ""));
}

// ── Music Guardrails ──────────────────────────────────────────

/** Patterns that suggest the user is trying to imitate specific artists, songs,
 *  or generate commercial music rather than sound-design material. */
const MUSIC_GUARDRAIL_PATTERNS: Array<{ pattern: RegExp; warning: string }> = [
  { pattern: /\b(cover|remix|sample|bootleg|mashup)\b/i, warning: "Avoid requesting covers, remixes, or samples of existing works." },
  { pattern: /\b(in the style of|sounds like|inspired by|similar to|à la)\b/i, warning: "Avoid referencing specific artists or styles to imitate." },
  { pattern: /\b(verse|chorus|bridge|hook|drop|breakdown|outro|intro)\b/i, warning: "Song structure terms detected — this tool generates layers, not full songs." },
  { pattern: /\b(lyrics?|sing|singing|vocal|rapper|rap|verse)\b/i, warning: "This tool generates instrumental material only — no vocals or lyrics." },
  { pattern: /\b(beat|trap|drill|reggaeton|EDM|dubstep|house music|techno track)\b/i, warning: "Avoid genre-specific beat requests — focus on motion or timbre attributes." },
  { pattern: /\b(\d+\s*bpm|tempo\s*\d+)\b/i, warning: "BPM values are not supported — use tempo impression controls instead." },
  { pattern: /\b(sample.?pack|loop.?kit|drum.?kit|preset.?pack)\b/i, warning: "This tool generates unique layers, not sample packs." },
];

/**
 * Check a prompt for content that suggests commercial music generation
 * rather than sound-design material. Returns an array of warning messages.
 */
export function checkMusicGuardrails(prompt: string): string[] {
  const warnings: string[] = [];
  for (const { pattern, warning } of MUSIC_GUARDRAIL_PATTERNS) {
    if (pattern.test(prompt)) warnings.push(warning);
  }
  return warnings;
}

// ── Cost ──────────────────────────────────────────────────────

export function estimateMiscCost(itemCount: number, bandCount = 0): number {
  // 1 credit per generation; band layers each count separately.
  return itemCount + bandCount;
}

// ── Helpers ───────────────────────────────────────────────────

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/,\s*,/g, ", ").trim();
}
