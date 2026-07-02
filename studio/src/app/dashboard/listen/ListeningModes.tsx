"use client";

import { cn } from "@/lib/utils";

/**
 * Listening modalities for Algophony Studio — sound design focused.
 * Each mode acts as an analytical focus directive that shapes
 * what the system extracts and highlights when processing uploaded audio.
 */

export interface ListeningMode {
  id: string;
  name: string;
  label: string;
  /** One-liner shown under the row when this mode is active. */
  subtitle: string;
  /** Short hover-tooltip blurb (~1 sentence). */
  tooltip: string;
  /** Prompt-shaping instructions sent to the analysis backend. */
  analyticalDirective: string;
  /** Visual indicator color (HSL hue). Page-level only — sidebar stays grayscale. */
  hue: number;
}

export const LISTENING_MODES: ListeningMode[] = [
  {
    id: "listen",
    name: "/listen",
    label: "Default",
    subtitle: "Standard analysis",
    tooltip: "Baseline pass — detect events, suggest categories, no interpretive lens.",
    analyticalDirective:
      "Perform a straightforward analysis. Identify the primary sound events, suggest SFX categories, propose prompt cards, and list exclusion constraints. " +
      "Do not apply any speculative, emotional, or research-oriented interpretation. Report only what is directly audible.",
    hue: 240,
  },
  {
    id: "tech",
    name: "/tech",
    label: "Technical",
    subtitle: "Spectrum, artifacts, recording chain",
    tooltip: "Engineering view — spectrum, dynamics, noise floor, codec, stereo field.",
    analyticalDirective:
      "Focus on technical signal inspection for sound design. Analyze: frequency spectrum coverage and notable bands, dynamic range, noise floor level, " +
      "distortion or clipping artifacts, codec compression quality, stereo field width and balance, transient sharpness, phase coherence, " +
      "and any recording chain signatures (room tone, preamp character, proximity effect). " +
      "Report technical parameters that would affect how this sound could be layered, processed, or re-synthesized.",
    hue: 180,
  },
  {
    id: "study",
    name: "/study",
    label: "Study",
    subtitle: "Methodology, traditions, mediation",
    tooltip: "Research lens — methodology, transduction chain, references, context.",
    analyticalDirective:
      "Analyze this audio from a research perspective combining multiple dimensions:\n" +
      "1. METHODOLOGY — Identify the recording technique, microphone placement, and capture context.\n" +
      "2. TRANSDUCTION — Trace the conversion chain: what sensors, codecs, processing, or AI models have shaped this signal?\n" +
      "3. REFERENCES — Map this sound to known sonic traditions, sound design schools, field recording methods, or artistic references.\n" +
      "4. CONTEXT — Name the environmental, archival, or institutional stakes if detectable.\n" +
      "5. ADJACENT TERRITORIES — Suggest related sonic territories, methods, or conceptual frameworks worth exploring.\n" +
      "Frame observations in sound studies vocabulary when appropriate.",
    hue: 130,
  },
  {
    id: "fiction",
    name: "/fiction",
    label: "Fiction",
    subtitle: "Worldbuilding, creatures, speculative",
    tooltip: "Speculative lens — worlds, creatures, transformations, fictional design.",
    analyticalDirective:
      "Analyze this sound through a speculative and fictional lens for sound design:\n" +
      "1. WORLDBUILDING — What worlds, creatures, environments, or machines does this sound suggest? Be specific and imaginative.\n" +
      "2. TRANSFORMATION — How could this sound be pitched, layered, reversed, granulated, or processed to serve fictional design?\n" +
      "3. CREATURE POTENTIAL — Could elements of this sound become creature vocalizations, breaths, or body movements?\n" +
      "4. ENVIRONMENT POTENTIAL — Could this sound be stretched, layered, or modulated into an atmospheric environment?\n" +
      "5. PROMPT CARDS — Generate prompt cards specifically oriented toward fictional SFX creation using this sound as inspiration.",
    hue: 280,
  },
  {
    id: "affective",
    name: "/affective",
    label: "Narrative",
    subtitle: "Mood, drama, storytelling",
    tooltip: "Story lens — mood, dramatic arc, texture, temporality, pairings.",
    analyticalDirective:
      "Analyze the emotional, dramatic, and narrative qualities of this sound for storytelling applications:\n" +
      "1. MOOD — What emotions does this sound activate? (tension, calm, dread, wonder, melancholy, aggression, intimacy, etc.)\n" +
      "2. DRAMA — Where in a narrative arc does this sound belong? (establishing, building, climax, resolution, punctuation, transition)\n" +
      "3. TEXTURE — Map its sensory qualities: rough/smooth, dense/sparse, warm/cold, sharp/soft, heavy/light.\n" +
      "4. TEMPORALITY — Describe its temporal feel: urgent, languid, pulsing, static, evolving, decaying.\n" +
      "5. NARRATIVE PROMPT CARDS — Generate prompt cards that describe this sound's potential role in film, game, or podcast storytelling.\n" +
      "6. PAIRING — Suggest what other sounds, music, or silence would complement this sound in a dramatic context.",
    hue: 330,
  },
];

interface ListeningModeSelectorProps {
  selectedModes: string[];
  onToggleMode: (modeId: string) => void;
}

/**
 * Compact button row — each modality is a small pill with a status dot and
 * a hover tooltip. Active modes surface their one-liner subtitle underneath
 * the row so the user always sees what's shaping the next analysis.
 */
export function ListeningModeSelector({ selectedModes, onToggleMode }: ListeningModeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="atlas-eyebrow">Listening Modalities</span>
        <span className="text-xs text-atlas-text-dim">{selectedModes.length} active</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LISTENING_MODES.map((mode) => {
          const isActive = selectedModes.includes(mode.id);
          return (
            <ModePill
              key={mode.id}
              mode={mode}
              isActive={isActive}
              onClick={() => onToggleMode(mode.id)}
            />
          );
        })}
      </div>

      {/* Active focus one-liner — shows just the subtitles, separated by · */}
      {selectedModes.length > 0 && (
        <p className="text-xs text-atlas-text-muted leading-snug">
          {selectedModes
            .map((id) => LISTENING_MODES.find((m) => m.id === id)?.subtitle)
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function ModePill({
  mode,
  isActive,
  onClick,
}: {
  mode: ListeningMode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
          isActive
            ? "bg-atlas-accent text-atlas-bg-raised shadow-sm"
            : "border border-atlas-border-subtle bg-atlas-surface text-atlas-text-muted hover:border-atlas-border hover:text-atlas-text"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
            isActive ? "bg-atlas-bg-raised" : "bg-atlas-text-dim"
          )}
        />
        {mode.label}
      </button>

      {/* Lightweight CSS tooltip with the short hover blurb */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 whitespace-nowrap rounded-md bg-atlas-text px-2 py-1 text-[11px] text-atlas-bg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
      >
        {mode.tooltip}
      </span>
    </div>
  );
}

/**
 * Compose a combined analytical directive from selected modes.
 * This gets sent to the analysis API to shape what the system extracts.
 */
export function composeAnalyticalDirective(selectedModeIds: string[]): string {
  if (selectedModeIds.length === 0) {
    return LISTENING_MODES[0].analyticalDirective;
  }

  const modes = selectedModeIds
    .map((id) => LISTENING_MODES.find((m) => m.id === id))
    .filter(Boolean) as ListeningMode[];

  if (modes.length === 1) {
    return modes[0].analyticalDirective;
  }

  const directives = modes
    .map((m) => `[${m.label}]: ${m.analyticalDirective}`)
    .join("\n\n");

  return `Analyze this audio through the following ${modes.length} simultaneous perspectives:\n\n${directives}\n\nSynthesize insights across all active modes. Note tensions or complementary findings between perspectives.`;
}
