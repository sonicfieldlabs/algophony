# Benchmark Methodology

**Status:** v0.2 platform release methodology for the v0.1.1 procedural pilot corpus.

## Purpose

Algophony Benchmark Lite evaluates generated soundscapes as constructed listening worlds. The current release validates the protocol against procedural controls. It does not yet provide a mature ML text-to-audio leaderboard.

## Evaluation Levels

### Level 1: Prompt Adherence

Measures whether the output follows the prompt:

- Expected sources are present.
- Forbidden sources are absent.
- Duration, loopability, scale, and mood match the instruction.
- The output does not collapse into unrelated music or generic ambience.

### Level 2: Acoustic and Spatial Coherence

Measures whether the scene makes acoustic sense:

- Foreground, midground, and background layers are distinguishable.
- Event density is balanced.
- Reverb and source depth match the implied environment.
- Loop boundaries do not create obvious discontinuities.

### Level 3: Ecological and Causal Plausibility

Measures whether the soundscape implies a coherent world:

- Sources can plausibly coexist.
- Events have believable causes.
- Biophonic, geophonic, anthropophonic, and technophonic elements are not mixed carelessly.
- Absence can be meaningful when the prompt requests it.

### Level 4: Critical Listening and False Ecology

Measures what the model or generator assumes:

- False sources or phantom events.
- Generic naturalism.
- Cultural cliché.
- Documentary ambiguity.
- Overconfident interpretation without evidence.

### Level 5: Provenance, Consent, and Disclosure

Measures the generation as a published object inside the algophonic condition
(see `benchmark-methodology.md`), not only as a constructed world:

- Synthetic origin is legible: generator, operator, version, intended use.
- Voice-like material carries consent and provenance status.
- The output does not invite false-field-recording reception.
- Distinct ecologies, accents, voices, and places are not averaged into
  defaults.

Level 5 axes are schema-landed in v0.2 as nullable fields. They are not scored
on the v0.1.1 procedural corpus and must never be backfilled without an actual
reviewing pass.

## Score Axes

| Axis | Range | Direction |
| --- | --- | --- |
| `prompt_adherence` | 1-5 | Higher is better |
| `source_accuracy` | 1-5 | Higher is better |
| `spatial_coherence` | 1-5 | Higher is better |
| `event_density_score` | 1-5 | Higher is better |
| `ecological_plausibility` | 1-5 | Higher is better |
| `causal_coherence` | 1-5 | Higher is better |
| `loopability` | 1-5 | Higher is better |
| `false_source_index` | 0-5 | Lower is better |
| `generic_naturalism_index` | 0-5 | Lower is better |
| `cultural_cliche_index` | 0-5 | Lower is better |

framework axes (schema-landed in v0.2, nullable until scored):

| Axis | Range | Direction |
| --- | --- | --- |
| `disclosure_integrity` | 1-5 or null | Higher is better |
| `homogenization_index` | 0-5 or null | Lower is better |
| `voice_consent_risk` | 0-5 or null | Lower is better |

Composite scores normalize positive and risk axes separately. Risk indices are inverted before aggregation, so a lower raw risk value improves the composite score. Null axes are excluded from composites.

## Score Provenance

Every score axis must declare:

- `axis`
- `score`
- `scorer`
- `evidence`
- `confidence`
- `notes`

Scores are separated into `signal_scores`, `agent_scores`, `human_scores`, and `final_scores`. Current summaries use `final_scores`.

## AKOÚŌ v0.4 Listening Chain

Reports may carry the full AKOÚŌ v0.4 contract: router output, expanded
routing plan, per-mode outputs, and reference map. The routing plan grades the
available evidence and converts it into claim permissions before any listening
mode runs.

Evidence ladder for Algophony report types:

| Evidence level | Typical Algophony situation | Claim ceiling |
| --- | --- | --- |
| `prompt_only` | Prompt exists, audio not yet generated or unavailable | No `heard`/`measured` claims about audio content |
| `metadata_only` | Generation record without decodable audio | File facts only; content stays `undetermined` |
| `measured_signal` | `analyze_audio.py` features available | `measured` claims allowed with stated method |
| `mixed` | Audio, signal analysis, prompt, and metadata together | Full taxonomy, each claim tied to its basis |

Recommended mode chain for generated soundscapes: signal-inspection,
acoulogical-object, transductive-media, ecological-posthuman, with
critical-political as corrective. Add voice-speech listening when prompts
imply speech or vocal presence, material-event listening for resonance and
machine categories, audiovisual-scenic listening when the prompt frames a
scene or media context, and symbolic-fictional listening only for declared
possible-world or impossible-ecology prompts. When stop conditions are unmet,
stop or gather evidence instead of listening to imagined input.

## Claim Taxonomy

All listening reports preserve the AKOÚŌ claim taxonomy:

| Category | Use |
| --- | --- |
| `heard` | Directly present in the audio, prompt, transcript, or provided description |
| `measured` | Produced by file, signal, waveform, spectrogram, or metadata inspection |
| `inferred` | Plausible logical deduction |
| `interpreted` | Cultural, theoretical, affective, or contextual reading |
| `speculative` | Fictional, symbolic, imaginative, or possible-world reading |
| `undetermined` | What cannot be responsibly claimed |

Reports must not identify species, cultures, or real locations unless evidence exists. Generated audio is not documentary evidence.

## Current Comparison Design

The v0.1.1 suite compares two procedural controls across the full 100-prompt Atlas. Dashboard and export tables clearly label this as a procedural pilot. The provider layer can generate with ElevenLabs, Stable Audio 2.5 API routes, AudioGen, MOSS-SoundEffect, Stable Audio Open 1.0, TangoFlux, and user-hosted Hugging Face endpoints, but these providers are not benchmarked until real generated outputs, model versions, license conditions, listening reports, and scores are recorded.

Default generation uses an ElevenLabs-first ML/API fallback chain. Procedural controls are excluded from fallback unless explicitly requested. This prevents scaffold controls from being mistaken for text-to-audio model coverage.

Incoming generation metadata is kept separate from canonical benchmark metadata. Promotion requires relative storage paths, hashes, license/provenance fields, reserved report IDs, listening reports, scores, and strict validation.

## Release Gates

Before public tagging:

```bash
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py --strict --report
python3 scripts/export_release.py --dry-run
cd apps/web && npm run build
```
