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

Measures the generation as a published object inside the algophonic condition,
not only as a constructed world:

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

Provenance and consent axes (schema-landed in v0.2, nullable until scored):

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

## AKOÚŌ v0.6 Listening Chain

Reports may carry the full AKOÚŌ v0.6 contract: router output, expanded
routing plan (optionally budgeted and preset-derived), per-mode outputs with
apparatus/listener/memory declarations, and reference map. The routing plan
grades the available evidence and converts it into claim permissions before
any listening mode runs; `workers/listening_plan.py` builds it
deterministically from artifact availability.

Evidence ladder for Algophony report types:

| Evidence level | Typical Algophony situation | Claim ceiling |
| --- | --- | --- |
| `prompt_only` | Prompt exists, audio not yet generated or unavailable | No `heard`/`measured` claims about audio content |
| `metadata_only` | Generation record without decodable audio | File facts only; content stays `undetermined` |
| `measured_signal` | `analyze_audio.py` features available | `measured` claims allowed with stated method |
| `mixed` | Audio, signal analysis, prompt, and metadata together | Full taxonomy, each claim tied to its basis |

The deterministic pipeline chain (implemented in `workers/listening_plan.py`)
routes generated soundscapes through acoulogical-object (primary: describe the
auditum before source claims), ecological-posthuman (secondary: layered
habitat and infrastructure relations), and transductive-media (corrective:
the object is a model output, and that mediation must stay audible), adding
symbolic-fictional listening for declared impossible or ritual categories and
musical-aesthetic listening for club or music categories. Fuller manual
chains may add signal-inspection grounding, voice-speech listening when
prompts imply vocal presence, material-event listening for resonance and
machine categories, audiovisual-scenic listening when the prompt frames a
scene, and critical-political listening as an additional corrective. Add
memory-lineage listening (with `/remember`) when a generation should be
compared against, or registered into, the shared akousmata store. When stop
conditions are unmet, stop or gather evidence instead of listening to
imagined input.

## The Nine Questions as Review Protocol

Human and hybrid report review applies standing questions as
a checklist mapped to existing fields; suites and axes version, the protocol
persists:

| Question | Where it lands |
| --- | --- |
| What was rendered as noise and discarded? | `sources.absent_expected`, forbidden/erased source lists |
| Whose ecology or voice is simulated? | `cultural_cliche_index`, `voice_consent_risk` |
| Who profits, who is captured? | provider `openness` profile (open weights vs closed API) |
| Is the synthetic origin exposed? | `disclosure_integrity`, false-field-recording risk |
| Where did the computation run, at what cost? | `compute_provenance` (stamped at generation time) |
| What does the store remember, and with what consent? | `earworm_trace` retention policy, akousma `consent_status` |
| What recurs across the corpus? | akousmata relations (`series_with`, `recurrence_of`, `compares_with`) |
| What stayed undetermined? | `claim_taxonomy.undetermined` — required, never empty when evidence is missing |
| What would regeneration change? | `regeneration_recommendation`, `suggested_prompt_revision` |

## Earworm and Akousmata Trace Layer

Generations and reports may carry an optional `earworm_trace` that points to an
Earworm session, event chain, asset/provenance refs, signal packets, context
bundles, retention policy, and Akousmata memory operations. This makes the
route of a listening object traceable across audio and non-audio context such
as prompts, field notes, captions, images, video, control streams, ambiente
frames, analysis summaries, user edits, agent actions, and render history.

An Earworm trace does not automatically authorize stronger claims. It changes
the evidence inventory that the AKOÚŌ router can inspect: a retained prompt is
still `prompt_only`; a context bundle may support `contextual_note`; signal
analysis packets may support `measured_signal`; and mixed prompt, metadata,
analysis, and audio evidence may support `mixed`. Claim permissions remain the
gate. The v0.1.1 procedural corpus predates this integration and correctly
leaves the trace field null.

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
