# Algophony

Algophony studies how algorithms generate, imitate, distort, classify, and listen to soundscapes. It is a Sonic Field Labs research framework for evaluating algorithmic soundscapes as generated, simulated, hybrid, or recursively interpreted sonic environments.

The central claim is simple: generative audio systems do not only produce sounds. They produce assumptions about worlds: what a forest is, what a city is, what a ritual is, what counts as background, what gets erased, and what becomes audible.

The founding statement of the project is the [Algophony Manifesto](docs/manifesto.md) (June 2026). It names the algophonic condition — algorithmic systems producing, transforming, mimicking, distributing, and interpreting voices, signals, and sonic worlds — and the framework translates its claims into evaluation levels, score axes, and metadata disciplines (see `docs/concept-note.md`).

## Current State

This repository is now a v0.2 local-mode platform release carrying the v0.1.1
procedural pilot corpus. It is not a full ML model benchmark.

What exists:

- 100 schema-valid Atlas prompts across 10 benchmark categories.
- 200 generation metadata records from 2 procedural controls.
- 200 local audio files in `generations/audio/` (gitignored).
- 200 JSON reports plus matching Markdown reports.
- 100 hybrid-reviewed seed reports and 100 agent-draft reports.
- Discriminative benchmark scores with score provenance and normalized comparison exports.
- A Next.js dashboard for prompt, generation, report, score, benchmark, provider, observatory, studio, and export inspection.
- A sanitized public-export workflow that publishes code without local corpus data, generated audio, uploads, secrets, private paths, or private local git history.

What does not exist yet:

- No ML model generations are included in the benchmark data.
- No independent human listening panel has reviewed the full corpus.
- No field-recording reference comparison is included.
- Procedural controls are not presented as equivalent to text-to-audio model systems.

See `docs/release-notes-v0.2.md` for the public-code changes since v0.1.1.

## Conceptual Distinction

| Category | Primary source | Algophony distinction |
| --- | --- | --- |
| Geophony | Earth, weather, water, wind, matter | May be simulated, exaggerated, cleaned, or hallucinated by models |
| Biophony | Living organisms | May be generated as generic nature, species-like fiction, or synthetic biodiversity |
| Anthrophony | Human activity | May include crowds, rituals, speech-like presence, urban life, labor, domesticity |
| Technophony | Machines, infrastructure, devices | Usually physical-world machine sound |
| Algophony | Computational generation, classification, mediation, reconstruction | Soundscape reality as produced, mediated, or re-heard by computational systems |

Technophony is the sound of machines in the world. Algophony is the soundscape as produced, mediated, or re-heard by computational systems.

## AKOÚŌ v0.4 Listening Contract

Listening reports follow AKOÚŌ, the Sonic Field Labs agentic listening system, in its v0.4 form:

- 15 portable skills: `akouo-router`, 13 listening modes, and `reference-layer`.
- 16 commands, from `/listen` to `/route`.
- Six-category claim taxonomy: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.
- Evidence ladder: every pass declares its evidence level (`prompt_only`, `metadata_only`, `measured_signal`, `mixed`, and others), which determines claim permissions — claims can never be stronger than evidence.
- Routing plans: reports may carry an `akouo_routing_plan` (weighted mode chain, claim permissions, forbidden assumptions, stop conditions) and an `akouo_reference_map` (concepts, methods, traditions, research routes).

The consumption loop is route → check stop conditions → listen → map → merge → hand off. The contract shape is copied into `schemas/listening-report.schema.json` and `apps/web/app/lib/listening-contract.ts`; the canonical source is the adjacent AKOÚŌ repository. Integration details: `docs/algophony-v0.3-integration-plan.md`.

## Repository Structure

```text
algophony/
  DEVELOPMENT_PLAN.md
  ROADMAP.md
  AGENTS.md
  docs/
  schemas/
  atlas/
  generations/
    metadata/
    audio/                 # gitignored local audio files
  reports/
    json/
    markdown/
  benchmark/
    suites/
    scores/
    exports/
  scripts/
  workers/
  apps/web/
```

## Setup

Install Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Validate schemas and dataset:

```bash
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py --strict --report
```

Run release hygiene checks:

```bash
python3 scripts/run_scenario_tests.py
python3 scripts/export_release.py --dry-run
```

Run the dashboard:

```bash
cd apps/web
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Generation Backends

Default behavior:

- If `--providers` is omitted, `generate_matrix.py` tries ElevenLabs first, then configured non-procedural ML/API providers.
- Procedural controls are not used as fallback unless `--allow-procedural-fallback` is passed or `ALGOPHONY_ALLOW_PROCEDURAL_FALLBACK=true`.
- New model generations are written to `generations/metadata/incoming-generations-v0.1.jsonl` by default. They are not benchmark data until promoted, reported, scored, and validated.

Available controls:

- `synth_baseline` — procedural additive/noise control.
- `spectral_fm` — procedural FM/granular control.

ML/API provider contracts:

- `el_sfx` — ElevenLabs Sound Effects, default API provider.
- `stable_audio_25_stability_api` — Stable Audio 2.5 through a configured Stability endpoint.
- `stable_audio_25_fal` — Stable Audio 2.5 through fal.
- `stable_audio_25_replicate` — Stable Audio 2.5 through Replicate.
- `audiogen_local` — AudioGen via local AudioCraft install.
- `moss_sfx_local` — MOSS-SoundEffect via local HF custom code.
- `moss_sfx_mlx` — MOSS-SoundEffect MLX on Apple Silicon.
- `stable_audio_open_local` — Stable Audio Open 1.0 via `stable_audio_tools`.
- `tangoflux_local` — TangoFlux local Python API.
- `*_hf_endpoint` providers — user-hosted Hugging Face endpoints.

List provider status:

```bash
python3 scripts/generate_matrix.py --list-providers
python3 scripts/generate_matrix.py --list-providers --json
```

Dry-run a generation matrix:

```bash
python3 scripts/generate_matrix.py --limit 1 --dry-run
python3 scripts/generate_matrix.py --providers synth_baseline,spectral_fm --limit 2 --dry-run
```

Install optional provider dependencies only when needed:

```bash
python3 -m pip install -r requirements-cloud.txt
python3 -m pip install -r requirements-local-audio.txt
python3 -m pip install -r requirements-local-macos-mlx.txt
```

## Data Integrity Rules

- Do not commit `.env`, `.env.local`, private recordings, unlicensed source audio, or large generated audio.
- Do not invent source provenance.
- Do not identify species, cultures, or real locations from generated audio without evidence.
- Preserve the AKOÚŌ claim taxonomy: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.
- Respect routing-plan claim permissions: a report whose evidence level forbids `heard` or `measured` claims must keep those buckets empty.
- Record `compute_provenance` and `voice_material` metadata on new generations when known; never invent them for old records.
- Every generation must have a metadata record.
- Every scored report must link to `prompt_id`, `audio_id`, and `report_id`.
- Public metadata must use relative storage paths, not local machine paths.

## Publication Model

The public GitHub repository is a clean code release for the full local-mode
system. It includes the dashboard, playground code, provider adapters, schemas,
scripts, and benchmark machinery. It does not include the local benchmark
corpus, generated metadata, report corpora, generated audio, uploads, secrets,
local paths, or private notes.

The public-facing Algophony page is maintained in the private Sonic Field Labs
website repository as a read-only curated showcase. Do not deploy the local
playground as the public page.

Use `scripts/prepare_public_export.py` for public publication. Do not push the
current local git history directly to the public remote.

## Related Projects

- AKOÚŌ — agentic listening system: 15 portable skills, six-category claim taxonomy, evidence ladder, routing plans, and reference layer (v0.4).
- Agentic Listening Benchmark — benchmark structure and scoring conventions.
- Sonic Field Labs — research unit for sound, listening, and sonic culture in computational systems.

## License

MIT License. See `LICENSE`.
