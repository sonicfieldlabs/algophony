# Algophony

Algophony is the Sonic Field Labs system for studying, generating, organizing, and evaluating algorithmic soundscapes. It combines a research framework, a benchmark dashboard, and a local-first sound workspace:

- **Algophony Framework**: schemas, Atlas prompts, generation metadata, AKOÚŌ listening reports, score contracts, provider adapters, workers, and release hygiene.
- **Algophony Bench Dashboard**: the Next.js benchmark interface in `apps/web/` for inspecting Atlas coverage, providers, reports, scores, observatory views, playground runs, and export state.
- **Algophony Studio**: the local sound-library and sonic-production workspace in `studio/`, imported from the former local sound app and renamed as part of Algophony.

Algophony studies how algorithms generate, imitate, distort, classify, and listen to soundscapes. It is the software and research-instrument layer for **Algophonya**: the algorithmic soundscape and the pluriversal field it opens.

The central claim is simple: generative audio systems do not only produce sounds. They produce assumptions about worlds: what a forest is, what a city is, what a ritual is, what counts as background, what gets erased, and what becomes audible.

The founding statement of the project is [*Algophonya framework*](docs/benchmark-methodology.md) (Sonic Field, 2026). Algophonya names the condition; Algophony Framework keeps the software/research-instrument name and translates the framework into evaluation levels, score axes, metadata disciplines, and traceable listening reports (see `docs/benchmark-methodology.md`).

## Current System

This repository is a local-mode Algophony system. It contains the framework contracts and two apps: the Bench Dashboard for benchmark inspection and Algophony Studio for local sonic-library work. It is not a full public ML leaderboard.

The full local research tree can carry the v0.1.1 procedural pilot corpus. Public/code exports intentionally ship without private corpus records, generated audio, report corpora, uploads, secrets, private paths, or local git history.

What exists:

- 100 schema-valid Atlas prompts across 10 benchmark categories.
- 200 generation metadata records from 2 procedural controls.
- 200 local audio files in `generations/audio/` (gitignored).
- 200 JSON reports plus matching Markdown reports.
- 100 hybrid-reviewed seed reports and 100 agent-draft reports.
- Discriminative benchmark scores with score provenance and normalized comparison exports.
- A Studio-aligned Next.js **Algophony Bench Dashboard** for prompt, generation, report, score, benchmark, provider, observatory, playground, and export inspection.
- A standalone **Algophony Studio** app in `studio/` for local sound libraries, prompt cards, stacks, tags, comparisons, provider-key-controlled generation, and export workflows.
- Optional Earworm/Akousmata trace fields for future append-only listening routes, non-audio context bundles, provenance, retention, and memory operations.
- A sanitized public-export workflow that publishes code without local corpus data, generated audio, uploads, secrets, private paths, or private local git history.

What does not exist yet:

- No ML model generations are included in the benchmark data.
- No independent human listening panel has reviewed the full corpus.
- No field-recording reference comparison is included.
- Procedural controls are not presented as equivalent to text-to-audio model systems.

See `docs/release-notes-v0.2.md` for the public-code platform changes since
v0.1.1, `docs/release-notes-v0.2.1.md` for the Listening Stack alignment
release, and `docs/release-notes-v0.2.2.md` for the Studio and Bench
integration release.

## System Layers

| Layer | Path | Role | Runs as |
| --- | --- | --- | --- |
| Framework contracts | `schemas/`, `atlas/`, `benchmark/`, `generations/`, `reports/`, `workers/`, `scripts/` | Defines the Atlas, generation metadata, AKOÚŌ reports, score records, provider adapters, validation, and release export machinery. | Python scripts and JSON/JSONL data contracts |
| Bench Dashboard | `apps/web/` | Studio-styled benchmark dashboard for inspecting prompts, generations, reports, providers, score tables, observatory views, playground runs, and release/export state. | Next.js local app, default daemon port `3010` |
| Algophony Studio | `studio/` | Local-first workspace for sonic libraries: folder indexing, prompt cards, stacks, variants, DAW handoff, metadata, listening notes, and optional user-key model calls. | Next.js local app, default daemon port `3001` |

See `docs/architecture.md` for the integrated model, data flow, and publication boundaries.

## Conceptual Distinction

| Category | Primary source | Algophony distinction |
| --- | --- | --- |
| Geophony | Earth, weather, water, wind, matter | May be simulated, exaggerated, cleaned, or hallucinated by models |
| Biophony | Living organisms | May be generated as generic nature, species-like fiction, or synthetic biodiversity |
| Anthrophony | Human activity | May include crowds, rituals, speech-like presence, urban life, labor, domesticity |
| Technophony | Machines, infrastructure, devices | Usually physical-world machine sound |
| Algophony | Computational generation, classification, mediation, reconstruction | Soundscape reality as produced, mediated, or re-heard by computational systems |

Technophony is the sound of machines in the world. Algophony is the soundscape as produced, mediated, or re-heard by computational systems.

## AKOÚŌ v0.6 Listening Contract

Listening reports follow AKOÚŌ, the Sonic Field Labs agentic listening system, in its v0.6 contract:

- 16 portable skills: `akouo-router`, 14 listening modes (including `memory-lineage-listening`, the sound-memory ear), and `reference-layer`.
- 17 commands, from `/listen` to `/route`, plus `/remember` for sound-memory stores.
- Six-category claim taxonomy: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined` — with optional per-claim `source` (dsp, model, memory, …) and `time_range` anchors so evidence streams never blur.
- Evidence ladder: every pass declares its evidence level (`prompt_only`, `metadata_only`, `measured_signal`, `mixed`, and others), which determines claim permissions — claims can never be stronger than evidence. Command overrides apply after the ladder (`/forensic` suppresses interpretation; `/fiction` grants declared speculation).
- Routing plans: reports may carry an `akouo_routing_plan` (weighted mode chain, claim permissions, forbidden assumptions, stop conditions, optional budget and preset id) and an `akouo_reference_map` (concepts, methods, traditions, research routes). Mode outputs may declare their `apparatus` (listening substrate and known blind spots), `listener`, and `memory` links; reports pin `akouo_contract_version`.

The consumption loop is route → check stop conditions → listen → map → merge → hand off. `workers/listening_plan.py` implements the route step deterministically (no LLM): artifact availability derives the evidence level, and `enforce_claim_permissions` moves blocked claims into `undetermined` instead of dropping them. The contract shape is copied into `schemas/listening-report.schema.json` and `apps/web/app/lib/listening-contract.ts`, and `scripts/test_listening_plan.py` drift-checks both against the machine-readable `../akouo/akouo.manifest.json`. Integration details: `ROADMAP.md`.

## Earworm and Akousmata Traceability

Algophony can attach an optional `earworm_trace` to generation records and listening reports. The trace points to an Earworm context chain: session, event refs, asset/provenance refs, signal packets, context bundles, and retention policy. Akousmata names the memory operations over that chain: remember, list, search, similarity, export, and forget.

The field is nullable and intentionally absent from the v0.1.1 procedural corpus. Do not backfill traces onto older reports without an actual traced pass. See `docs/earworm-akousmata-integration.md`.

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
    public/
    scripts/
  studio/
```

## Setup

Install Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Validate schemas and dataset. In a public/code-only checkout the default dataset validator allows an empty mounted corpus; use strict mode only when the local research corpus is mounted.

```bash
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py
python3 scripts/validate_dataset.py --strict --report  # local corpus release gate
```

Run release hygiene checks:

```bash
python3 scripts/run_scenario_tests.py
python3 scripts/export_release.py --dry-run
```

Run the Algophony Bench Dashboard:

```bash
cd apps/web
npm install
npm run dev:daemon
```

Then open `http://localhost:3010` or `http://127.0.0.1:3010`.

Stop it with:

```bash
npm run dev:stop
```

Run Algophony Studio:

```bash
cd studio
npm install
npm run dev:daemon
```

Then open `http://localhost:3001` or `http://127.0.0.1:3001`.

Stop it with:

```bash
npm run dev:stop
```

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

The official public GitHub repository is `https://github.com/sonicfieldlabs/algophony`, published as a clean code release for the full local-mode
system. It includes the dashboard, playground code, provider adapters, schemas,
scripts, and benchmark machinery. It does not include the local benchmark
corpus, generated metadata, report corpora, generated audio, uploads, secrets,
local paths, or private notes.

The public-facing Algophony page is maintained in the private Sonic Field Labs
website repository as a read-only curated showcase. Do not deploy the local
playground or Studio as the public page.

Use `scripts/prepare_public_export.py` for public publication. Do not push the
current local git history directly to the public remote.

Local app deployment in this repository means local preview or internal review.
The Bench Dashboard and Studio are not configured as public multi-user services
in this repo, and both assume local data boundaries unless explicitly adapted
elsewhere.

## Related Projects

- AKOÚŌ — agentic listening system: 16 portable skills, six-category claim taxonomy, evidence ladder, routing plans, presets, machine-readable manifest, and reference layer (v0.6).
- Earworm and Akousmata — persistent listening and memory operations for traceable signal/context chains.
- The Listening Stack — companion paper describing AKOÚŌ, Akousmata/Earworm, Algophony Framework, hmm, germ, and Oidote/Oiditos as one agentic sonic-computation stack.
- Agentic Listening Benchmark — benchmark structure and scoring conventions.
- Sonic Field Labs — research unit for sound, listening, and sonic culture in computational systems.

## License

MIT License. See `LICENSE`.
