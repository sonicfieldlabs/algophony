# Algophony

Algophony is a local-first research system for generating, organizing,
listening to, and evaluating algorithmic soundscapes. It combines public data
contracts and workers with two working interfaces: a benchmark dashboard and a
sound-production studio.

Current release: `0.5.2`.

## What ships

| Surface | Path | Purpose |
| --- | --- | --- |
| Framework | `schemas/`, `atlas/`, `benchmark/`, `workers/`, `scripts/` | Prompt, generation, listening-report, score, validation, provider, and export contracts. |
| Bench Dashboard | `apps/web/` | Inspect Atlas coverage, providers, reports, scores, observatory views, playground runs, and export state. |
| Algophony Studio | `studio/` | Organize local sound libraries, prompt cards, stacks, tags, variations, listening notes, provider-backed generations, and export sets. |

The repository is a code release. Local corpus records, report corpora,
generated audio, uploads, provider credentials, and private notes are mounted
at runtime and are not part of Git history.

## Current capabilities

- JSON Schema contracts for prompts, generation metadata, AKOÚŌ listening
  reports, score records, benchmark suites/runs, Earworm traces, and provider
  status.
- Atlas and benchmark tooling for schema validation, batch generation,
  technical analysis, report creation, scoring, summary exports, and sanitized
  snapshots.
- Deterministic listening-plan construction from available evidence. Claim
  permissions are enforced before a report is accepted; blocked claims move to
  `undetermined` instead of disappearing.
- Provider adapters for procedural controls, ElevenLabs Sound Effects, Stable
  Audio routes, AudioGen, MOSS SoundEffect, TangoFlux, Stable Audio Open, and
  user-hosted Hugging Face endpoints.
- An optional OÍDA gateway path for OÍDA-owned audio perception or declared
  host perception. Both paths normalize into the same AKOÚŌ and Earworm fields.
- A read-only benchmark interface plus a separate local production workspace.
  Neither app is configured as a public multi-user service.

The bundled code can work with the v0.1.1 procedural pilot corpus when that
dataset is mounted. The public checkout deliberately makes no claim that a
complete model benchmark or independently reviewed human panel is included.

## Listening Stack compatibility

| Component | Contract used here | Integration |
| --- | --- | --- |
| [AKOÚŌ](https://github.com/sonicfieldlabs/akouo) | `akouo-contract 0.9.1` / `akouo/v0.9` | 16 listening modes, embodied heard boundary, router, reference layer, 19 commands, evidence ladder, covenants, corpus disclosure, and claim taxonomy. |
| [Earworm](https://github.com/sonicfieldlabs/earworm) | `akousma 0.6.1` / akousma spec v1.5 | Session provenance, optional context traces, lineage, kinship, attributable disagreement resolution, and additive revisions. |
| [Akousmata](https://github.com/sonicfieldlabs/akousmata) | `akousmata/v0.6` | Shared accountable-memory library and navigator used by batch-source and evaluation-stamp workers. |
| [OÍDA](https://github.com/sonicfieldlabs/oida) | `oida/gateway/v0.5` (OÍDA 0.9.2) | Provider-neutral, decision-first listening gateway; model observations remain inferred and durable memory remains explicit. |
| [GERM](https://github.com/sonicfieldlabs/germ) | GERM 0.3.3 | Downstream cultivation can use remembered sounds, prompts, lineage, and accountable listening outcomes produced by the stack. |
| [ORAM](https://github.com/sonicfieldlabs/oram) | ORAM 0.4.1 | Exported ORAM audio can enter Algophony datasets and listening workflows; there is no direct runtime dependency. |

Every listening report separates `heard`, `measured`, `inferred`,
`interpreted`, `speculative`, and `undetermined` claims. A report may
also pin its listening apparatus, listener, evidence level, routing plan,
reference map, memory links, and listening covenant.
Automated reports leave `heard` empty: generated metadata and model output are
inferred, signal analysis is measured, and a heard claim requires a separately
attributable human listener.

## Quick start

Requirements: Python 3.11+, Node.js 20+, and npm 10+.

```bash
python3 -m pip install -r requirements.txt
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py
python3 scripts/run_scenario_tests.py
```

The dataset validator accepts an empty public checkout by default. Use strict
mode only with the local corpus mounted:

```bash
python3 scripts/validate_dataset.py --strict --report
```

Run the Bench Dashboard:

```bash
cd apps/web
npm ci
npm run dev:daemon
```

Open `http://127.0.0.1:3010`; stop it with `npm run dev:stop`.

Run Algophony Studio:

```bash
cd studio
npm ci
npm run dev:daemon
```

Open `http://127.0.0.1:3001`; stop it with `npm run dev:stop`.

## Generation providers

List provider availability without starting a generation:

```bash
python3 scripts/generate_matrix.py --list-providers
python3 scripts/generate_matrix.py --list-providers --json
```

Dry-run a matrix:

```bash
python3 scripts/generate_matrix.py --limit 1 --dry-run
python3 scripts/generate_matrix.py \
  --providers synth_baseline,spectral_fm \
  --limit 2 \
  --dry-run
```

Procedural controls are never an undeclared fallback. Enable them explicitly
with `--allow-procedural-fallback` or
`ALGOPHONY_ALLOW_PROCEDURAL_FALLBACK=true`.

Optional provider dependencies are split by deployment:

```bash
python3 -m pip install -r requirements-cloud.txt
python3 -m pip install -r requirements-local-audio.txt
python3 -m pip install -r requirements-local-macos-mlx.txt
```

Provider credentials belong in the process environment or each app's ignored
local state. No shared application key is included.

## Data and publication boundaries

- Generated audio remains under ignored data roots such as
  `generations/audio/`; only `.gitkeep` placeholders are tracked.
- Every generated output needs a generation metadata record.
- Every score links to `prompt_id`, `audio_id`, and `report_id`.
- Public metadata uses relative storage references, never machine-specific
  absolute paths.
- Provenance, consent, voice-material, routing, and memory fields are populated
  only by a real generation, listening, or review pass.
- `scripts/prepare_public_export.py` remains available for a separate
  code-only snapshot, but this GitHub repository is the source of truth.

## Documentation

- [Architecture](docs/architecture.md)
- [Benchmark methodology](docs/benchmark-methodology.md)
- [Dataset card](docs/dataset-card-v0.1.md)
- [Earworm and Akousmata integration](docs/earworm-akousmata-integration.md)
- [Glossary](docs/glossary.md)
- [Contributor guide](docs/contributor-guide.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
