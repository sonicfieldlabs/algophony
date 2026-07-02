# Algophony Development Plan and Agent Execution Manual

Status: active local-mode system  
Updated: 2026-07-02  
Workspace: `$SFL_ROOT/algophony`

## 0. Current System State

This document began as the v0.1 implementation plan. It remains the operational
specification for data integrity, schemas, AKOÚŌ claim discipline, and release
hygiene, but the repository is no longer an empty scaffold. The current system
has three coordinated layers:

1. **Algophony Framework**: the research contracts and code for Atlas prompts,
   generation metadata, AKOÚŌ listening reports, score records, provider
   adapters, workers, validation, and sanitized publication.
2. **Algophony Bench Dashboard**: the Next.js app in `apps/web/`, redesigned to
   use the Algophony Studio visual language and renamed as the benchmark
   dashboard for Atlas, providers, reports, scores, observatory views,
   playground runs, and export inspection.
3. **Algophony Studio**: the local-first app in `studio/`, imported from the
   former local sound workspace and renamed as Algophony Studio. It organizes
   local sound libraries, prompt cards, stacks, tags, variants, listening notes,
   provider-key-controlled generation, DAW handoff, and export sets.

The current architecture is documented in `docs/architecture.md`. Future work
must keep these boundaries clear: Framework data is the benchmark source of
truth, Bench audits and visualizes it, and Studio prepares or organizes sonic
material before any record is promoted into the framework.

The public repository target remains `https://github.com/sonicfieldlabs/algophony`,
but local history must not be pushed directly there. Use
`scripts/prepare_public_export.py` to create the sanitized public export.

## 1. Purpose of this document

This file is the implementation handoff for Algophony. It is written for a future coding or research agent that must maintain the current local-mode system and carry it through the next benchmark, Studio, and publication milestones.

The agent must not treat this as a loose inspiration document. It is the project specification. Follow the phases, file structure, schemas, acceptance criteria, and validation steps unless the user explicitly changes direction.

## 2. Project definition

Algophony names the algorithmic layer of the soundscape: sonic environments generated, simulated, transformed, classified, reconstructed, or hallucinated by computational systems.

Public formulation:

> Algophony studies how algorithms generate, imitate, distort, classify, and listen to soundscapes.

Academic formulation:

> Algophony is a framework for studying algorithmic soundscapes: generated, simulated, hybrid, or recursively interpreted sonic environments whose sources, spatial logic, temporal behavior, ecological plausibility, and cultural assumptions are mediated by computational systems.

Core thesis:

> Generative audio models do not merely produce sounds. They produce assumptions about worlds: what a forest is, what a city is, what a ritual is, what a museum is, what "nature" sounds like, what counts as background, what counts as presence, what gets erased, and what is made audible.

Practical benchmark thesis:

> Algophony evaluates generative soundscapes not only by audio quality, but by world-construction.

## 3. Strategic positioning

Algophony is a Sonic Field Labs research line that sits between soundscape ecology, AI audio evaluation, AKOÚŌ-style agentic listening, dataset design, and critical sound studies.

It should be positioned against existing soundscape categories:

| Category | Primary source | Algophony distinction |
| --- | --- | --- |
| Geophony | Earth, weather, water, wind, matter | May be simulated, exaggerated, cleaned, or hallucinated by models |
| Biophony | Living organisms | May be generated as generic nature, species-like fiction, or synthetic biodiversity |
| Anthrophony | Human activity | May include crowds, rituals, speech-like presence, urban life, labor, domesticity |
| Technophony | Machines, infrastructure, devices | Usually physical-world machine sound |
| Algophony | Computational generation, classification, mediation, reconstruction | Soundscape reality as produced, mediated, or re-heard by computational systems |

Key distinction:

> Technophony is the sound of machines in the world. Algophony is the soundscape as produced, mediated, or re-heard by computational systems.

## 4. MVP decision and current extension

The first milestone was not a full production app. The first milestone was:

> Algophony Atlas v0.1 plus Algophony Benchmark Lite v0.1.

Timeline:

- 12-week MVP.

Technical spine:

- Next.js + TypeScript + Tailwind for public pages and dashboard prototype.
- Python for generation workers, metadata validation, audio analysis, and export scripts.
- JSON Schema, JSONL, Markdown, CSV, and dataset-card outputs for research release.
- AKOÚŌ claim taxonomy and listening modes for structured listening reports.
- Agentic Listening Benchmark conventions from the adjacent SFL `bench` repo for suite/run/scoring design.

Primary outputs:

1. Public repo structure.
2. Concept note and glossary.
3. 100-prompt Algophony Atlas v0.1.
4. Generation metadata registry.
5. At least 300 generated audio files, with 500 as the preferred target.
6. 50 reviewed Algophony Listening Reports.
7. Benchmark Lite v0.1 with comparison tables.
8. Dataset card and methodology document.
9. Thin dashboard for browsing prompts, generations, reports, and scores.
10. Contributor guide and release checklist.

Current extension:

- The benchmark dashboard has become **Algophony Bench Dashboard**, a local
  Studio-styled inspection app rather than a temporary prototype.
- The former local sound workspace has been imported as **Algophony Studio** in
  `studio/`.
- The repository now supports two local app daemons: Bench on port `3010` and
  Studio on port `3001`.
- Public release remains a sanitized code export, not a deployment of private
  local corpus data or user-provider workspace state.

## 5. Agent execution contract

Any agent implementing this plan must follow these rules:

1. Work in `$SFL_ROOT/algophony`.
2. If the repo is still empty, initialize the project structure from this plan.
3. Before editing, inspect adjacent projects for conventions:
   - `$SFL_ROOT/akouo`
   - `$SFL_ROOT/bench`
   - `$SFL_ROOT/sonic-field-labs`
4. Reuse conceptual contracts from AKOÚŌ instead of inventing a conflicting listening taxonomy.
5. Reuse benchmark structure patterns from `bench` instead of inventing an incompatible run format.
6. Keep generated audio files out of git unless they are tiny test fixtures.
7. Commit metadata, schemas, docs, and scripts.
8. Never commit API keys, `.env.local`, private recordings, local private notes, or unlicensed source audio.
9. Verify current external model/API documentation before implementing provider adapters. Model APIs may change.
10. Implement validation before large-scale generation.
11. Do not skip schema validation.
12. Do not rely on ad hoc spreadsheets as the source of truth. Use JSONL and schema-validated records.
13. Every generated output must have a metadata record.
14. Every scored report must link back to prompt ID and audio ID.
15. Every public release must include license/provenance information.

## 6. First commands for the implementation agent

Run these non-mutating checks first:

```bash
pwd
ls -la
find .. -maxdepth 2 -type f \( -name 'README.md' -o -name 'package.json' -o -name 'pyproject.toml' -o -name '*.schema.json' \) | sort | head -200
```

Then inspect:

```bash
sed -n '1,240p' ../akouo/README.md
sed -n '1,240p' ../bench/README.md
sed -n '1,220p' '../sonic field labs/README.md'
find ../akouo/schemas ../bench/schemas -maxdepth 2 -type f | sort
```

After inspection, scaffold the repo.

## 7. Target repository structure

Create this structure:

```text
algophony/
  README.md
  DEVELOPMENT_PLAN.md
  ROADMAP.md
  AGENTS.md
  .gitignore
  .env.example
  docs/
    concept-note.md
    glossary.md
    references.md
    benchmark-methodology.md
    dataset-card-v0.1.md
    release-checklist.md
    contributor-guide.md
  schemas/
    prompt.schema.json
    generation.schema.json
    listening-report.schema.json
    score.schema.json
    benchmark-suite.schema.json
    benchmark-run.schema.json
  atlas/
    prompts/
      algophony-atlas-v0.1.jsonl
      examples.md
    taxonomies/
      source-taxonomy.json
      prompt-categories.json
      listening-modes.json
      evaluation-focus.json
  generations/
    README.md
    metadata/
      generations-v0.1.jsonl
    audio/
      .gitkeep
  reports/
    README.md
    markdown/
    json/
  benchmark/
    suites/
      algophony-benchmark-lite-v0.1.json
    scores/
      scores-v0.1.jsonl
    exports/
  scripts/
    validate_dataset.py
    validate_schemas.py
    generate_matrix.py
    analyze_audio.py
    export_release.py
    summarize_benchmark.py
  workers/
    README.md
    pipeline.py
    adapters/
      __init__.py
      base.py
      elevenlabs_sfx.py
      scaper.py
      audioldm.py
      audiocraft.py
      stable_audio_open.py
      spatialscaper.py
    analysis/
      __init__.py
      features.py
      classifiers.py
      loopability.py
  apps/
    web/
      README.md
      package.json
      next.config.mjs
      tsconfig.json
      app/
      components/
      lib/
      public/
```

If integrating directly into the existing Sonic Field Labs monorepo later, keep this repo as the research/data package and mirror public pages into `../sonic field labs/apps/site/app/algophony`.

## 8. Public documentation to create

### README.md

Must include:

- One-paragraph project definition.
- Conceptual distinction from geophony, biophony, anthrophony, and technophony.
- The main thesis.
- MVP scope.
- Repository structure.
- Quick start for validation.
- Public-repo hygiene rules.
- License placeholder.

### ROADMAP.md

Must include:

- 12-week timeline.
- Phase deliverables.
- Acceptance criteria per phase.
- Post-v0.1 roadmap.

### AGENTS.md

Must include operational instructions for coding agents:

- Use `rg` for search.
- Use schema validation after editing data.
- Do not commit audio binaries by default.
- Do not invent source provenance.
- Do not identify species, cultures, or locations from generated audio without evidence.
- Preserve AKOÚŌ claim categories.

### docs/concept-note.md

Working title:

> Algophony: Toward Algorithmic Soundscape Studies

Length target:

- 1,500 to 2,000 words.

Required sections:

1. Definition.
2. Why soundscape studies needs an algorithmic category.
3. Relation to geophony, biophony, anthrophony, and technophony.
4. Generated soundscape as world-construction.
5. Evaluation beyond audio quality.
6. Atlas and Benchmark.
7. AKOÚŌ Listening Reports.
8. Ethics, false ecology, and cultural assumptions.
9. Future collaboration.

### docs/glossary.md

Required entries:

- Algophony
- Algorithmic soundscape
- Agentic listening
- False ecology
- False field recording
- Generic naturalism
- Regenerative prompting
- Recursive listening
- Soundscape-to-text
- Text-to-soundscape
- World-construction
- Source adherence
- Negative adherence
- Cultural cliché index

### docs/references.md

Group references by:

- Soundscape ecology.
- Technophony and anthropogenic sound.
- Soundscape synthesis and synthetic datasets.
- Text-to-audio and sound scene synthesis.
- Critical AI soundscape projects.
- AKOÚŌ and agentic listening.

Do not fabricate bibliographic details. If exact publication metadata is missing, mark as `needs verification`.

## 9. Core pipeline

The whole project must support this research pipeline:

```text
Text prompt
-> soundscape generation
-> automated audio analysis
-> soundscape-to-text description
-> AKOÚŌ agentic listening report
-> human/multimodal listening annotation
-> benchmark metrics
-> prompt revision
-> regenerative generation
-> comparative dataset
```

Short form:

```text
Text-to-Soundscape
-> Soundscape-to-Text
-> Agentic Listening
-> Listening Data
-> Regenerative Prompting
```

The implementation must make this pipeline visible in docs, data structure, and dashboard navigation.

## 10. Data schemas

Create JSON Schemas before writing bulk data.

### 10.1 Prompt schema

File: `schemas/prompt.schema.json`

Required fields:

```json
{
  "prompt_id": "ALG-0001",
  "prompt_text": "A Medellin hillside at night with distant traffic, dogs, wind through cables, and no music or sirens.",
  "category": "city",
  "subcategories": ["anthrophony", "technophony", "spatial_depth"],
  "intended_sources": ["distant traffic", "dogs", "wind through cables"],
  "forbidden_sources": ["music", "sirens"],
  "location_imaginary": "Medellin hillside at night",
  "listening_mode": "situated urban listening",
  "duration_target": 30,
  "loop_required": true,
  "difficulty": "medium",
  "evaluation_focus": ["spatial coherence", "cultural specificity", "event density"]
}
```

Rules:

- `prompt_id` pattern: `^ALG-[0-9]{4}$`
- `duration_target`: integer, minimum 5, maximum 120.
- `category`: one of the 10 v0.1 categories.
- `difficulty`: `calibration`, `easy`, `medium`, `hard`, or `research`.
- `intended_sources`: at least 1 item.
- `evaluation_focus`: at least 1 item.

### 10.2 Generation schema

File: `schemas/generation.schema.json`

Required fields:

```json
{
  "audio_id": "ALG-0001-EL-SFX-A",
  "prompt_id": "ALG-0001",
  "model": "ElevenLabs Sound Effects",
  "model_version": "needs verification",
  "generation_date": "2026-05-14",
  "duration": 30,
  "seed": null,
  "parameters": {
    "duration_seconds": 30,
    "loop": true
  },
  "license_status": "internal research / publication pending",
  "file_format": "wav",
  "storage_uri": "generations/audio/ALG-0001-EL-SFX-A.wav",
  "sha256": "needs generation",
  "human_notes": [],
  "akouo_report_id": "AK-0001"
}
```

Rules:

- `audio_id` pattern: `^ALG-[0-9]{4}-[A-Z0-9-]+-[A-Z]$`
- `prompt_id` must exist in prompt corpus.
- `generation_date` must be ISO date.
- `license_status` must be explicit.
- `sha256` required when the file exists.

### 10.3 Listening report schema

File: `schemas/listening-report.schema.json`

Required fields:

- `report_id`
- `audio_id`
- `prompt_id`
- `listening_date`
- `listener_type`
- `claim_taxonomy`
- `basic_description`
- `sources`
- `spatial_structure`
- `temporal_behavior`
- `ecological_plausibility`
- `causal_coherence`
- `cultural_assumptions`
- `false_sources`
- `prompt_comparison`
- `suggested_prompt_revision`
- `regeneration_recommendation`
- `scores`

The `claim_taxonomy` object must preserve:

- `heard`
- `measured`
- `inferred`
- `interpreted`
- `speculative`
- `undetermined`

### 10.4 Score schema

File: `schemas/score.schema.json`

Axes:

| Axis | Range |
| --- | --- |
| prompt_adherence | 1-5 |
| source_accuracy | 1-5 |
| spatial_coherence | 1-5 |
| event_density_score | 1-5 |
| ecological_plausibility | 1-5 |
| causal_coherence | 1-5 |
| false_source_index | 0-5 |
| generic_naturalism_index | 0-5 |
| cultural_cliche_index | 0-5 |
| loopability | 1-5 |

`regeneration_potential` must be one of:

- `keep`
- `revise`
- `reject`

## 11. Atlas v0.1 prompt corpus

Create 100 prompts: 10 categories x 10 prompts.

File:

```text
atlas/prompts/algophony-atlas-v0.1.jsonl
```

### Categories

| Category | Benchmark question |
| --- | --- |
| forest | Does the model generate ecological specificity or generic nature? |
| city | Does it understand urban layers beyond traffic? |
| coast | Can it balance water, wind, distance, birds, and human presence? |
| interior | Can it generate small-scale domestic acoustics? |
| machine | Does it distinguish machine source, rhythm, space, and material? |
| ritual | Does it avoid generic exoticism or cinematic cliché? |
| archive | Can it simulate media decay and historical distance? |
| club_exterior | Can it generate muffled social/music environments without becoming full music? |
| ruin | Does it imply abandonment, weathering, absence, and material decay? |
| impossible_ecology | Can it remain coherent while inventing a non-real environment? |

### Prompt balancing rules

The 100 prompts must include:

- 10 forest prompts.
- 10 city prompts.
- 10 coast prompts.
- 10 interior prompts.
- 10 machine prompts.
- 10 ritual prompts.
- 10 archive prompts.
- 10 club exterior prompts.
- 10 ruin prompts.
- 10 impossible ecology prompts.
- At least 30 prompts with forbidden sources.
- At least 20 prompts testing loopability.
- At least 20 prompts testing cultural cliché risk.
- At least 20 prompts testing ecological plausibility.
- At least 10 prompts testing false field recording or false ecology.

### Prompt writing rules

Each prompt should:

- Describe a soundscape, not a song.
- Include spatial scale where relevant.
- Include time of day or temporal condition where relevant.
- Include at least one evaluable source expectation.
- Include at least one possible failure condition.
- Avoid overly poetic ambiguity when the benchmark needs measurable criteria.
- Avoid asking models to imitate living artists or copyrighted recordings.

Bad prompt:

```text
Beautiful rainforest ambience.
```

Good prompt:

```text
A humid lowland forest before dawn, dense insects in the background, occasional distant frogs, leaves dripping after rain, no river, no birds, no music, seamless 30-second loop.
```

## 12. Generation matrix

Goal:

- Preferred target: 500 generated files.
- Minimum MVP target: 300 generated files.

Initial generation modes:

| Mode | Required for MVP | Notes |
| --- | --- | --- |
| ElevenLabs Sound Effects | Yes | Commercial text-to-sound generation. Verify API before implementation. |
| Scaper | Yes | Controlled procedural/sample-based baseline. |
| AudioLDM or AudioCraft | Yes | Choose whichever is locally feasible first. |
| Stable Audio Open | Optional | Add after first 3 modes are stable. |
| SpatialScaper | Optional | Add for spatial simulation tests. |
| TANGO/TangoFlux | Optional | Add for diffusion comparison if setup is practical. |

Generation variants:

- For each prompt, generate at least 3 outputs.
- Preferred: 5 outputs per prompt.
- Use variant letters: `A`, `B`, `C`, `D`, `E`.

Example IDs:

- `ALG-0001-EL-SFX-A`
- `ALG-0001-SCAPER-A`
- `ALG-0001-AUDIOLDM-A`
- `ALG-0001-AUDIOCRAFT-A`
- `ALG-0001-SPATIALSCAPER-A`

### Adapter interface

File: `workers/adapters/base.py`

Implement this contract:

```python
class GenerationAdapter:
    provider_id: str
    provider_name: str

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """
        Generate or synthesize one soundscape.
        Return a generation metadata record that validates against schemas/generation.schema.json.
        Do not return raw audio bytes in metadata.
        """
```

Each adapter must:

- Accept a validated prompt record.
- Accept duration and loop parameters.
- Create or reference an audio file.
- Return structured metadata.
- Log provider warnings.
- Fail with structured error records.

### Failure record

If generation fails, write a failure object to the run log:

```json
{
  "prompt_id": "ALG-0001",
  "provider_id": "el_sfx",
  "variant": "A",
  "status": "failed",
  "error_type": "quota_exceeded",
  "message": "Provider quota exceeded before generation.",
  "date": "2026-05-14"
}
```

Do not silently skip failed generations.

## 13. Audio analysis

File:

```text
scripts/analyze_audio.py
```

Minimum automated analysis:

- Duration.
- Sample rate.
- Channel count.
- RMS / loudness proxy.
- Peak level.
- Basic spectral centroid.
- Spectral bandwidth.
- Zero crossing rate.
- Silence ratio.
- Basic onset/event density proxy.
- Loop boundary discontinuity proxy.

Optional analysis:

- CLAP embeddings.
- PANNs tags.
- YAMNet tags.
- AudioSet classifier labels.
- Spectrogram image export.
- FAD-style embedding comparison if feasible.

Analysis output should be stored as JSONL:

```text
generations/metadata/audio-analysis-v0.1.jsonl
```

Do not treat classifiers as ground truth. They are evidence inputs for human and AKOÚŌ listening, not final truth.

## 14. AKOÚŌ x Algophony Listening Reports

Each generated soundscape can produce a listening report. The v0.1 seed requires 50 manually reviewed reports.

Report files:

```text
reports/markdown/AK-0001.md
reports/json/AK-0001.json
```

Report sections:

1. Basic description.
2. Detected / inferred sound sources.
3. Foreground, midground, background structure.
4. Spatial and reverberant logic.
5. Temporal behavior and event density.
6. Ecological plausibility.
7. Causal coherence.
8. Cultural and genre assumptions.
9. False sources / hallucinated elements.
10. Comparison with prompt.
11. Suggested prompt revision.
12. Regeneration recommendation.
13. Benchmark scores.

Required listening discipline:

- Mark direct audio observations as `heard`.
- Mark signal-derived observations as `measured`.
- Mark plausible deductions as `inferred`.
- Mark cultural/theoretical readings as `interpreted`.
- Mark possible-world readings as `speculative`.
- Mark unavailable knowledge as `undetermined`.

Do not:

- Identify animal species without evidence.
- Identify a real location from generated audio.
- Claim a real field recording exists when the file is generated.
- Treat model output as documentary evidence.
- Collapse ecological critique into generic quality scoring.

Example useful report language:

```text
The model generated a generic temperate media-forest dominated by birds and water, with no insect density, no territorial spacing, no clear time-of-day logic, and an implied cinematic naturalism rather than a situated ecology.
```

## 15. Benchmark Lite v0.1

File:

```text
benchmark/suites/algophony-benchmark-lite-v0.1.json
```

Purpose:

Evaluate algorithmic soundscapes across four levels.

### Level 1: Prompt adherence

Questions:

- Are expected sources present?
- Are forbidden sources absent?
- Does the temporal sequence match?
- Does the scale match?
- Does the mood/style match without becoming cliché?

Axes:

- source_adherence
- negative_adherence
- temporal_adherence
- scale_adherence
- mood_style_adherence

### Level 2: Acoustic and spatial coherence

Questions:

- Do sources occupy plausible positions?
- Is there foreground/midground/background layering?
- Does reverberation match the environment?
- Do moving sources behave believably?
- Is event density balanced?
- Can it loop?

Axes:

- spatial_coherence
- depth_layering
- reverb_logic
- motion_logic
- density_balance
- loopability

### Level 3: Ecological and causal plausibility

Questions:

- Could these sources coexist?
- Do events imply believable causes?
- Are animal/insect/bird sounds plausible for the described biome?
- Do wind, water, rain, terrain, and material behavior make sense?
- Is human activity socially and spatially coherent?
- Are machines and infrastructures plausible for the place?

Axes:

- ecological_plausibility
- causal_coherence
- biophonic_logic
- geophonic_logic
- anthropophonic_logic
- technophonic_logic

### Level 4: Critical listening and false ecology

Questions:

- Does the model reproduce clichés?
- Are there phantom sources?
- Does it equate nature with generic birds/water/wind?
- Does it impose Western, cinematic, tourist, or stock-library assumptions?
- Does it sound like real recording, simulation, Foley, or hallucination?
- How does interpretation change under different listening modes?

Axes:

- stereotype_index
- false_source_index
- generic_naturalism_index
- cultural_cliche_index
- documentary_ambiguity
- listening_multiplicity

## 16. Human scoring rubric

Use 0-5 or 1-5 consistently:

- Use `1-5` when higher means better.
- Use `0-5` when measuring risk or failure intensity.

Main metrics:

| Metric | Type | Score |
| --- | --- | --- |
| Prompt adherence | Human + agent | 1-5 |
| Source accuracy | Human + classifier | 1-5 |
| Spatial coherence | Human + AKOÚŌ | 1-5 |
| Event density | Human + feature analysis | low/medium/high plus 1-5 |
| Ecological plausibility | Human + AKOÚŌ | 1-5 |
| Causal coherence | Human | 1-5 |
| False-source index | Human + agent | 0-5 |
| Generic naturalism index | Human | 0-5 |
| Cultural cliché index | Human | 0-5 |
| Loopability | Human + signal inspection | 1-5 |
| Regeneration potential | Agent | keep/revise/reject |

Score descriptions:

### Prompt adherence

- 1: Mostly ignores prompt.
- 2: Includes one or two expected elements but misses core scene.
- 3: Follows core scene but misses important constraints.
- 4: Strong adherence with minor omissions.
- 5: Fully follows source, scale, temporal, negative, and loop constraints.

### Ecological plausibility

- 1: Incoherent or impossible without being intentionally speculative.
- 2: Multiple implausible source relationships.
- 3: Plausible at generic level, weak in details.
- 4: Mostly coherent ecology.
- 5: Strong source coexistence, temporal behavior, and habitat logic.

### False-source index

- 0: No false or forbidden sources detected.
- 1: Minor ambiguous false source.
- 2: One clear unrequested source.
- 3: Multiple false sources.
- 4: False sources alter the scene meaning.
- 5: False or forbidden sources dominate the output.

### Cultural cliché index

- 0: No obvious cliché.
- 1: Slight genre or stock-media coding.
- 2: Noticeable cliché but not dominant.
- 3: Cliché shapes the scene.
- 4: Cliché dominates interpretation.
- 5: Strong stereotyped or culturally flattening construction.

## 17. Dashboard prototype

Build only after Atlas, schemas, generation metadata, and report templates exist.

Recommended route structure:

```text
/algophony
/algophony/atlas
/algophony/benchmark
/algophony/reports
/algophony/references
/algophony/collaborate
/dashboard/prompts
/dashboard/generations
/dashboard/reports
/dashboard/compare/[prompt_id]
/dashboard/export
```

Minimum UI features:

- Browse prompt corpus.
- Filter by category, difficulty, source type, listening mode, and evaluation focus.
- View all generations for one prompt.
- Play audio if local files exist.
- Show waveform or spectrogram placeholder.
- View report side-by-side with metadata.
- Compare model outputs for one prompt.
- Export JSONL, CSV, Markdown.

Dashboard constraints:

- Read from local JSON/JSONL first.
- No database in v0.1 unless explicitly requested.
- No authentication in v0.1.
- No generation from UI required in v0.1.
- Keep UI aligned with Sonic Field Labs: analytical, precise, research-tool feel.

## 18. 12-week phase plan

### Phase 0: Foundation and repo setup

Timeline: Week 1

Goal:

Define the intellectual and technical identity of Algophony.

Tasks:

1. Initialize git repository if missing.
2. Create `.gitignore`.
3. Create README.
4. Create ROADMAP.
5. Create AGENTS.
6. Create docs directory.
7. Create concept note.
8. Create glossary.
9. Create references map.
10. Create initial JSON Schemas.
11. Create validation script stubs.

Deliverables:

- `README.md`
- `ROADMAP.md`
- `AGENTS.md`
- `docs/concept-note.md`
- `docs/glossary.md`
- `docs/references.md`
- `schemas/*.schema.json`
- `scripts/validate_dataset.py`

Acceptance criteria:

- Repo has public-facing project identity.
- Schemas exist and can be loaded.
- Validation script can run even if data files are empty.
- Public hygiene rules are documented.

### Phase 1: Prompt suite v0.1

Timeline: Weeks 2-3

Goal:

Create the first controlled prompt corpus.

Tasks:

1. Create taxonomies.
2. Draft 100 prompts.
3. Validate prompt IDs and category balance.
4. Write prompt examples page.
5. Add prompt corpus validation tests.
6. Review prompt suite for benchmark usefulness.

Deliverables:

- `atlas/prompts/algophony-atlas-v0.1.jsonl`
- `atlas/prompts/examples.md`
- `atlas/taxonomies/source-taxonomy.json`
- `atlas/taxonomies/prompt-categories.json`
- `atlas/taxonomies/listening-modes.json`
- `atlas/taxonomies/evaluation-focus.json`

Acceptance criteria:

- Exactly 100 valid prompt records.
- 10 records per category.
- At least 30 prompts include forbidden sources.
- At least 20 prompts test loopability.
- Prompt corpus passes schema validation.

### Phase 2: Generation matrix

Timeline: Weeks 4-5

Goal:

Generate comparable soundscapes across multiple backends.

Tasks:

1. Implement adapter base class.
2. Implement Scaper adapter or procedural placeholder.
3. Implement ElevenLabs SFX adapter after verifying API.
4. Implement one open model adapter after feasibility check.
5. Implement generation matrix CLI.
6. Generate first 30-prompt test batch.
7. Validate metadata.
8. Generate full MVP batch.

Deliverables:

- `workers/adapters/base.py`
- `workers/adapters/elevenlabs_sfx.py`
- `workers/adapters/scaper.py`
- `workers/adapters/audioldm.py` or `workers/adapters/audiocraft.py`
- `scripts/generate_matrix.py`
- `generations/metadata/generations-v0.1.jsonl`
- Audio files in local or object storage.

Acceptance criteria:

- At least 300 generated files for MVP.
- Preferred: 500 generated files.
- Every generated file has metadata.
- Failed generations are logged.
- Metadata passes schema validation.

### Phase 3: Listening schema and reports

Timeline: Weeks 6-7

Goal:

Build the AKOÚŌ x Algophony analysis protocol.

Tasks:

1. Create report Markdown template.
2. Create report JSON schema.
3. Create score schema.
4. Create 10 calibration reports.
5. Refine rubric after calibration.
6. Create 40 additional reviewed reports.
7. Export reports to JSON and Markdown.

Deliverables:

- `reports/README.md`
- `reports/markdown/AK-0001.md` through at least `AK-0050.md`
- `reports/json/AK-0001.json` through at least `AK-0050.json`
- `schemas/listening-report.schema.json`
- `schemas/score.schema.json`

Acceptance criteria:

- 50 reviewed reports.
- Every report links to valid `prompt_id` and `audio_id`.
- Every report contains scores.
- Reports preserve claim taxonomy.
- Suggested prompt revision exists for every report.

### Phase 4: Benchmark Lite

Timeline: Weeks 8-9

Goal:

Publish the first comparative benchmark.

Tasks:

1. Define benchmark subset.
2. Create suite manifest.
3. Create score records.
4. Build comparison script.
5. Export CSV, JSONL, and Markdown tables.
6. Write benchmark methodology.
7. Write dataset card.
8. Draft research post.

Deliverables:

- `benchmark/suites/algophony-benchmark-lite-v0.1.json`
- `benchmark/scores/scores-v0.1.jsonl`
- `benchmark/exports/model-comparison-v0.1.csv`
- `benchmark/exports/model-comparison-v0.1.md`
- `docs/benchmark-methodology.md`
- `docs/dataset-card-v0.1.md`

Acceptance criteria:

- Benchmark compares at least 3 generation modes.
- Public subset includes at least 30 prompts.
- Comparison table includes per-category and per-model summaries.
- Dataset card documents limits, ethics, licenses, model versions, and missing data.

### Phase 5: Platform prototype

Timeline: Weeks 10-11

Goal:

Turn the workflow into a usable browsing and comparison tool.

Tasks:

1. Scaffold Next.js app.
2. Add local JSONL loaders.
3. Build Atlas page.
4. Build generation comparison page.
5. Build report viewer.
6. Build benchmark table.
7. Build export page.
8. Run typecheck and build.

Deliverables:

- `apps/web`
- Prompt browser.
- Generation browser.
- Report viewer.
- Comparison view.
- Export tools.

Acceptance criteria:

- Local dashboard builds.
- User can inspect prompt -> generations -> reports -> scores.
- Side-by-side comparison works for one prompt.
- UI is usable without backend service.

### Phase 6: Public release and collaboration layer

Timeline: Week 12

Goal:

Prepare Algophony v0.1 for public research use.

Tasks:

1. Finalize README.
2. Finalize contributor guide.
3. Finalize release checklist.
4. Create issue templates.
5. Run validation suite.
6. Run public hygiene scan.
7. Tag `v0.1.0`.
8. Draft Sonic Field Labs post.

Deliverables:

- `docs/contributor-guide.md`
- `docs/release-checklist.md`
- `.github/ISSUE_TEMPLATE/prompt-submission.md`
- `.github/ISSUE_TEMPLATE/listening-annotation.md`
- `.github/ISSUE_TEMPLATE/model-output-submission.md`
- `.github/ISSUE_TEMPLATE/benchmark-score-correction.md`
- v0.1 release package.

Acceptance criteria:

- Contributor can submit prompts, annotations, outputs, or corrections.
- Release contains no private data.
- Validation passes.
- Research story is coherent.

## 19. Scripts to implement

### scripts/validate_schemas.py

Purpose:

- Confirm every schema is valid JSON Schema.

Inputs:

- `schemas/*.schema.json`

Output:

- Exit code 0 if valid.
- Human-readable errors if invalid.

### scripts/validate_dataset.py

Purpose:

- Validate prompts, generation metadata, listening reports, scores, and benchmark suite records.

Checks:

- JSON syntax.
- JSONL line validity.
- Schema validity.
- Unique IDs.
- Cross-reference integrity.
- Category balance.
- Score ranges.
- Missing metadata.

### scripts/generate_matrix.py

Purpose:

- Run generation adapters across selected prompt IDs and providers.

Required CLI options:

```bash
python scripts/generate_matrix.py --prompts atlas/prompts/algophony-atlas-v0.1.jsonl --providers scaper,elevenlabs_sfx --limit 10
```

### scripts/analyze_audio.py

Purpose:

- Extract technical features and loopability proxies.

Required CLI options:

```bash
python scripts/analyze_audio.py --metadata generations/metadata/generations-v0.1.jsonl --out generations/metadata/audio-analysis-v0.1.jsonl
```

### scripts/summarize_benchmark.py

Purpose:

- Generate per-model and per-category summary tables.

Required outputs:

- CSV.
- Markdown.
- JSON summary.

### scripts/export_release.py

Purpose:

- Assemble public release package.

Checks:

- No secrets.
- No private paths.
- No missing licenses.
- No missing schema validation.
- No large audio accidentally staged for git.

## 20. Environment variables

Create `.env.example`:

```bash
# Algophony provider keys
ALGOPHONY_ELEVENLABS_API_KEY=

# Optional open model paths
ALGOPHONY_AUDIOLDM_MODEL_PATH=
ALGOPHONY_AUDIOCRAFT_MODEL_PATH=
ALGOPHONY_STABLE_AUDIO_MODEL_PATH=

# Storage
ALGOPHONY_AUDIO_STORAGE_DIR=generations/audio
ALGOPHONY_EXPORT_DIR=benchmark/exports
```

Never commit `.env` or `.env.local`.

## 21. Git ignore rules

Create `.gitignore` with at least:

```gitignore
.env
.env.local
.DS_Store
node_modules/
.next/
dist/
build/
.turbo/
__pycache__/
.pytest_cache/
.ruff_cache/
.mypy_cache/
*.pyc
generations/audio/*
!generations/audio/.gitkeep
*.wav
*.mp3
*.flac
*.aiff
*.aif
```

If small audio fixtures are needed, place them in `fixtures/audio/` and explicitly unignore that directory.

## 22. Testing and validation commands

Minimum validation:

```bash
python scripts/validate_schemas.py
python scripts/validate_dataset.py
python scripts/export_release.py --dry-run
```

Frontend validation:

```bash
cd apps/web
pnpm install
pnpm typecheck
pnpm build
```

If the project is integrated into the existing Sonic Field Labs monorepo, use the repo's existing `pnpm` and `turbo` workflow.

## 23. Public release checklist

Before tagging v0.1:

- [ ] README complete.
- [ ] ROADMAP complete.
- [ ] Concept note complete.
- [ ] Glossary complete.
- [ ] References checked.
- [ ] 100 prompts validated.
- [ ] Generation metadata validated.
- [ ] At least 300 generated files exist in storage.
- [ ] 50 reports reviewed.
- [ ] Benchmark suite validates.
- [ ] Scores validate.
- [ ] Dataset card complete.
- [ ] Contributor guide complete.
- [ ] No secrets in repo.
- [ ] No private file paths in public docs.
- [ ] No unlicensed private audio committed.
- [ ] Dashboard builds.
- [ ] Export script dry-run passes.

## 24. Post-v0.1 roadmap

After the 12-week MVP:

### v0.2

- Add more backends.
- Add SpatialScaper spatial tests.
- Add model-version tracking UI.
- Add classifier-assisted source comparison.
- Add richer loopability metrics.
- Add report review workflow.

### v0.3

- Add public contribution ingestion.
- Add monthly benchmark challenges.
- Add field-recording reference comparison.
- Add collaborative listening sessions.
- Add dataset DOI or archive deposit.

### v0.4

- Add database-backed dashboard.
- Add authentication for private research workflow.
- Add API routes for generation, analysis, scoring, and export.
- Add richer audio visualization.

### v1.0

- Stable public benchmark.
- Stable schemas.
- Published research article.
- Public dataset release.
- Reproducible generation and evaluation pipeline.

## 25. Known risks

### API volatility

Commercial provider APIs may change. Verify docs before adapter implementation.

Mitigation:

- Keep adapters isolated.
- Store provider version and parameters.
- Log failures structurally.

### Licensing ambiguity

Generated audio may have unclear publication rights.

Mitigation:

- Track `license_status`.
- Do not publish audio until rights are clear.
- Publish prompts and metadata first if needed.

### False authority

Agentic reports may overclaim what is heard.

Mitigation:

- Enforce claim taxonomy.
- Require `undetermined` fields.
- Review first 50 reports manually.

### Generic naturalism

Models may collapse nature into birds, water, wind, and reverb.

Mitigation:

- Include negative prompts.
- Score generic naturalism.
- Add prompts requiring absence, silence, insects, material behavior, or ecological specificity.

### Dashboard distraction

Building the UI too early may delay the research corpus.

Mitigation:

- Do not start dashboard before Phase 5.
- Use JSONL and scripts as source of truth.

## 26. Definition of done

Algophony v0.1 is done when:

1. The repo has complete public documentation.
2. The Atlas contains 100 valid prompts.
3. At least 300 generated outputs exist with metadata.
4. 50 reports are manually reviewed.
5. Benchmark Lite compares at least 3 generation modes.
6. Dataset card and methodology are publication-ready.
7. The dashboard can browse and compare prompts, outputs, reports, and scores.
8. The release passes validation and public hygiene checks.

## 27. Instruction to the next agent

Start by creating the repository skeleton and validation infrastructure. Do not begin generating audio until prompt and generation schemas validate. Do not build the dashboard until the Atlas, metadata, and report templates exist.

Implementation order:

1. Scaffold files and directories.
2. Write README, ROADMAP, AGENTS, concept note, glossary, references.
3. Write schemas.
4. Write validation scripts.
5. Create taxonomies.
6. Create 100-prompt Atlas.
7. Validate Atlas.
8. Implement generation adapters.
9. Generate pilot batch.
10. Analyze pilot batch.
11. Create report templates and first reports.
12. Scale generation matrix.
13. Complete 50 reviewed reports.
14. Build Benchmark Lite.
15. Build dashboard prototype.
16. Run release validation.
17. Prepare v0.1 release.

If uncertain, preserve the research-first priority: Atlas and Benchmark before dashboard polish.

## 28. June 2026 expansion addendum

This plan remains the execution record for v0.1.x. Two later layers extend it
without changing its data contracts:

1. The Algophony Manifesto (`docs/manifesto.md`) was adopted as the founding
   statement. It adds evaluation Level 5 (provenance, consent, disclosure),
   three proposed nullable score axes (`disclosure_integrity`,
   `homogenization_index`, `voice_consent_risk`), and optional generation
   metadata (`compute_provenance`, `voice_material`).
2. The AKOÚŌ contract was synced to v0.4: 13 listening modes plus router and
   reference-layer, 16 commands, an evidence ladder with claim permissions,
   and optional `akouo_routing_plan` / `akouo_reference_map` fields on
   listening reports.

All additions are backward compatible: the v0.1.1 corpus validates unchanged,
and the new fields stay null until an actual scored or routed pass produces
them. The execution plan for these layers is
`docs/algophony-v0.3-integration-plan.md`; section 14's listening discipline
and the claim taxonomy in section 5 remain binding.
