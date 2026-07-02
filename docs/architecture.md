# Algophony Architecture

Algophony is a local-mode Sonic Field Labs system for algorithmic soundscape research. It is not one app and not only a dataset. It is a framework plus two working interfaces:

- **Algophony Framework** defines the research contracts: prompt records, generation metadata, audio-analysis records, AKOÚŌ listening reports, score records, provider adapters, validation scripts, and release hygiene.
- **Algophony Bench Dashboard** is the benchmark inspection surface in `apps/web/`. It reads the framework data contracts and makes Atlas coverage, model/provider state, report provenance, score tables, observatory charts, playground runs, and exports inspectable.
- **Algophony Studio** is the local sound workspace in `studio/`. It is where sound libraries, prompt cards, stacks, tags, variations, generated assets, listening notes, DAW handoff files, and export sets are created and organized.

The three layers share a conceptual system but keep different responsibilities. Framework data is the source of truth for benchmark claims. Bench visualizes and audits those claims. Studio is the production and research workspace where future assets and metadata can be prepared before they are promoted into framework records.

## Product Map

| Layer | Main path | Primary user | Primary job | Data boundary |
| --- | --- | --- | --- | --- |
| Framework | `schemas/`, `atlas/`, `generations/`, `reports/`, `benchmark/`, `workers/`, `scripts/` | Researcher, evaluator, agent | Define, validate, score, and export algorithmic soundscape records. | JSON/JSONL records plus gitignored local audio. |
| Bench Dashboard | `apps/web/` | Researcher, reviewer, public-code reader | Inspect the benchmark state and audit provenance without editing the corpus. | Reads repository data or `ALGOPHONY_DATA_ROOT`; playground is gated. |
| Studio | `studio/` | Sound designer, researcher, library curator | Organize sonic material and generate or export working assets using user-configured providers. | Local `.algophony-studio/` state, ignored by git. |

## Data Flow

1. **Prompt and library work starts in Studio or Atlas tooling.** Studio can index folders, derive prompt cards from metadata, organize references, and export candidate datasets. Atlas scripts create canonical benchmark prompts directly as schema-valid records.
2. **Generation runs create metadata first.** Every generated output must have a generation metadata record. Audio binaries remain local in `generations/audio/` or a mounted data root unless they are explicit tiny fixtures.
3. **AKOÚŌ listening creates reports.** Reports preserve claim categories (`heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`) and evidence permissions. A report may include routing plans, reference maps, mode outputs, and optional Earworm/Akousmata traces.
4. **Scores link back to evidence.** Every scored record links to `prompt_id`, `audio_id`, and `report_id`. Score axes are diagnostic, not documentary proof.
5. **Bench audits the current state.** The dashboard reads the records, highlights missing corpus state in public checkouts, separates procedural controls from ML providers, and exposes exports.
6. **Public publication is sanitized.** `scripts/prepare_public_export.py` creates a clean code release that excludes local data, private paths, generated audio, uploads, secrets, build artifacts, and private local git history.

## App Runtime Model

The apps are local-first by default.

| App | Default daemon command | Default URL | Stop command |
| --- | --- | --- | --- |
| Bench Dashboard | `cd apps/web && npm run dev:daemon` | `http://localhost:3010` | `npm run dev:stop` |
| Studio | `cd studio && npm run dev:daemon` | `http://localhost:3001` | `npm run dev:stop` |

The default `npm run dev` commands still work for foreground development. The daemon commands exist so local previews survive the coding-agent shell session and are easier to verify from a browser.

## Publication and Deployment

This repository has two publication modes:

- **Local/internal review:** run Bench and Studio locally with the daemon commands above. This is the working mode for private corpus data, provider keys, uploads, generated files, and research notes.
- **Public code release:** run `scripts/prepare_public_export.py` and publish the sanitized export. Do not push the private local history directly to `https://github.com/sonicfieldlabs/algophony`.

The public-facing Algophony website or showcase belongs in the private Sonic Field Labs website repository. Bench and Studio are not configured here as public multi-user services. Any hosted deployment must first make an explicit data, auth, provider-key, upload, and provenance decision.

## Design Direction

Algophony Studio defines the current interface language: light Atlas tokens, neutral surfaces, compact cards, clear tables, restrained shadows, and direct utility. The Bench Dashboard now follows that same visual system so the two apps feel like one research suite while keeping separate jobs.

The design system should remain work-focused. Avoid marketing-style pages inside either app. The first screen should expose the actual tool, dataset state, or workspace state.

## Boundaries

- Do not treat generated audio as a real field recording.
- Do not identify species, cultures, or real locations from generated audio without evidence.
- Do not strengthen a claim beyond its evidence ladder.
- Do not backfill AKOÚŌ routing outputs or Earworm traces onto old records without a real routed or traced pass.
- Do not commit `.env`, `.env.local`, private recordings, generated audio, uploads, build artifacts, or local app state.
- Do not use Studio provider features with shared app-owned keys. Users bring their own provider accounts.
