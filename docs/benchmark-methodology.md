# Benchmark Methodology

**Status:** v0.1.1 procedural pilot methodology.

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

Composite scores normalize positive and risk axes separately. Risk indices are inverted before aggregation, so a lower raw risk value improves the composite score.

## Score Provenance

Every score axis must declare:

- `axis`
- `score`
- `scorer`
- `evidence`
- `confidence`
- `notes`

Scores are separated into `signal_scores`, `agent_scores`, `human_scores`, and `final_scores`. Current summaries use `final_scores`.

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
