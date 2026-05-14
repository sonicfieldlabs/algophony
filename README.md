# Algophony

Algophony studies how algorithms generate, imitate, distort, classify, and listen to soundscapes. It is a research framework by [Sonic Field Labs](https://labs.sonicfield.org) for evaluating algorithmic soundscapes: generated, simulated, hybrid, or recursively interpreted sonic environments whose sources, spatial logic, temporal behavior, ecological plausibility, and cultural assumptions are mediated by computational systems.

## Core Thesis

> Generative audio models do not merely produce sounds. They produce assumptions about worlds: what a forest is, what a city is, what a ritual is, what a museum is, what "nature" sounds like, what counts as background, what counts as presence, what gets erased, and what is made audible.

## Conceptual Distinction

Algophony extends the established soundscape categories:

| Category | Primary Source | Algophony Distinction |
| --- | --- | --- |
| Geophony | Earth, weather, water, wind, matter | May be simulated, exaggerated, cleaned, or hallucinated by models |
| Biophony | Living organisms | May be generated as generic nature, species-like fiction, or synthetic biodiversity |
| Anthrophony | Human activity | May include crowds, rituals, speech-like presence, urban life, labor, domesticity |
| Technophony | Machines, infrastructure, devices | Usually physical-world machine sound |
| **Algophony** | **Computational generation, classification, mediation, reconstruction** | **Soundscape reality as produced, mediated, or re-heard by computational systems** |

> Technophony is the sound of machines in the world. Algophony is the soundscape as produced, mediated, or re-heard by computational systems.

## MVP Scope

Algophony v0.1 delivers two primary research outputs:

1. **Algophony Atlas v0.1** — A controlled corpus of 100 text-to-soundscape prompts across 10 categories (forest, city, coast, interior, machine, ritual, archive, club exterior, ruin, impossible ecology), each designed to test specific evaluation criteria.

2. **Algophony Benchmark Lite v0.1** — A comparative evaluation framework that scores generated soundscapes across prompt adherence, spatial coherence, ecological plausibility, causal coherence, false-source detection, generic naturalism, and cultural cliché indices.

Supporting outputs include 300–500 generated audio files, 50 manually reviewed AKOÚŌ Listening Reports, generation metadata, a benchmark methodology document, and a dataset card.

## Repository Structure

```text
algophony/
  README.md                    # This file
  DEVELOPMENT_PLAN.md          # Full implementation specification
  ROADMAP.md                   # 12-week timeline and post-v0.1 plans
  AGENTS.md                    # Instructions for coding agents
  .gitignore
  .env.example
  docs/                        # Public documentation
    benchmark-methodology.md            # Working paper: Algophony concept
    glossary.md                # Key terms and definitions
    references.md              # Grouped bibliography
    benchmark-methodology.md   # Evaluation framework description
    dataset-card-v0.1.md       # Dataset documentation
    release-checklist.md       # Pre-release validation checklist
    contributor-guide.md       # How to contribute
  schemas/                     # JSON Schemas (draft 2020-12)
    prompt.schema.json
    generation.schema.json
    listening-report.schema.json
    score.schema.json
    benchmark-suite.schema.json
    benchmark-run.schema.json
  atlas/                       # Prompt corpus and taxonomies
    prompts/
      algophony-atlas-v0.1.jsonl
      examples.md
    taxonomies/
      source-taxonomy.json
      prompt-categories.json
      listening-modes.json
      evaluation-focus.json
  generations/                 # Generated audio and metadata
    metadata/
      generations-v0.1.jsonl
    audio/
      .gitkeep
  reports/                     # AKOÚŌ × Algophony Listening Reports
    markdown/
    json/
  benchmark/                   # Benchmark suites, scores, and exports
    suites/
    scores/
    exports/
  scripts/                     # Validation, generation, analysis, export
    validate_schemas.py
    validate_dataset.py
    generate_matrix.py
    analyze_audio.py
    summarize_benchmark.py
    export_release.py
  workers/                     # Generation pipeline and adapters
    pipeline.py
    adapters/
    analysis/
  apps/
    web/                       # Dashboard prototype (Phase 5)
```

## Quick Start

### Validate schemas

```bash
python scripts/validate_schemas.py
```

### Validate dataset

```bash
python scripts/validate_dataset.py
```

### Dry-run release check

```bash
python scripts/export_release.py --dry-run
```

### Install Python dependencies

```bash
pip install jsonschema
```

## Public-Repo Hygiene

- Do not commit API keys, `.env.local`, private recordings, or unlicensed source audio.
- Keep generated audio files out of git unless they are tiny test fixtures.
- Commit metadata, schemas, docs, and scripts.
- Do not invent source provenance.
- Do not identify species, cultures, or locations from generated audio without evidence.
- Preserve AKOÚŌ claim taxonomy categories: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.
- Every generated output must have a metadata record.
- Every scored report must link back to `prompt_id` and `audio_id`.
- Every public release must include license/provenance information.

## Related Projects

- [AKOÚŌ](https://github.com/sonicfieldlabs/akouo) — Agentic listening framework with structured claim taxonomy
- [Agentic Listening Benchmark](https://github.com/sonicfieldlabs/bench) — Benchmark infrastructure for evaluating listening agents
- [Sonic Field Labs](https://labs.sonicfield.org) — Research unit for sound, listening, and sonic culture in computational systems

## License

MIT License. See `LICENSE`.
