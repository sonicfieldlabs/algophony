# Algophony Roadmap

Version labels in this roadmap are Algophony release versions
(v0.1.1, v0.2, v0.2.1, ...). They are distinct from the
`docs/algophony-v0.x-integration-plan.md` planning series and from AKOÚŌ
contract versions.

## v0.2 Status

Algophony is currently a local-mode platform release with framework contracts,
the Bench Dashboard, and Algophony Studio. The full local research tree may
carry a validated procedural pilot corpus:

- 100 Atlas prompts.
- 200 procedural control generations.
- 200 listening reports.
- 200 score records with provenance.
- Strict dataset validation.
- Algophony Bench Dashboard routes for Atlas, prompts, generations, reports, comparison, providers, benchmark, observatory, playground, and export.
- Algophony Studio in `studio/` as the local sound-library, prompt-card, stacking, variation, provider-key, listening, and export workspace.
- Sanitized public-export workflow for publishing code without local corpus data or private history.

The project should not be tagged as a full ML benchmark until real ML-generated files are included and reviewed.

## Completed Foundation

### Phase 0: Concept and Repo Setup

- Public README and concept framing.
- Development plan and agent instructions.
- Glossary, references, contributor guide, release checklist.
- JSON schemas and validation scripts.

### Phase 1: Prompt Suite

- 100 prompt records.
- 10 categories with 10 prompts each.
- Intended sources, forbidden sources, listening modes, duration targets, loop flags, and evaluation focus.

### Phase 2: Procedural Generation Matrix

- `synth_baseline` procedural control.
- `spectral_fm` procedural control.
- Relative generation metadata.
- Provider registry with explicit runtime statuses.
- Dry-run support for configured and missing providers.

### Phase 3: Listening Reports

- AKOÚŌ claim taxonomy preserved.
- Split report semantics for signal-derived evidence and interpretive listening.
- Review status fields, evidence inputs, classifier outputs, revision history, and score provenance.
- 100 hybrid-reviewed seed reports and 100 agent-draft reports.

### Phase 4: Benchmark Lite

- Canonical suite manifest.
- Score records using `final_scores`.
- Positive and risk axes documented.
- Normalized composite comparison exports.
- Strict validation gates for score variance, storage paths, report quality, and release placeholders.

### Phase 5: Dashboard Prototype

- Next.js dashboard with prompt, generation, report, score, export, and benchmark inspection.
- Generation detail pages include local audio playback, metadata, checksum, prompt link, and report links.
- Report detail pages expose the AKOÚŌ taxonomy and score provenance.
- UI labels procedural controls separately from ML model outputs.

### June 2026: Manifesto and AKOÚŌ Contract Expansion

- Algophonya manifesto adopted as the founding statement (`docs/manifesto.md`); concept note, glossary, and methodology expanded around it.
- AKOÚŌ contract synced: 13 listening modes, 16 commands, evidence ladder, claim permissions.
- Report schema carries optional `akouo_routing_plan` and `akouo_reference_map`; dashboard report pages render them when present.
- Score schema gains proposed nullable manifesto axes: `disclosure_integrity`, `homogenization_index`, `voice_consent_risk`.
- Generation schema gains optional `compute_provenance` and `voice_material` records.
- Evaluation Level 5 (provenance, consent, disclosure) defined in `docs/benchmark-methodology.md`.
- Execution plan: `docs/algophony-v0.3-integration-plan.md`.

### July 2026: Listening Stack Alignment

- Founding statement replaced with *Algophonya: A Pluriversal Listening Manifesto*; project terminology now distinguishes Algophonya (condition) from Algophony Framework (evaluation layer).
- AKOÚŌ labels updated to v0.5 while preserving the already-synced schema surface: router, 13 listening modes, reference-layer, 16 commands, evidence ladder, claim permissions, routing plans, and reference maps.
- Earworm/Akousmata trace contract landed as nullable optional fields on generation records and listening reports. The v0.1.1 corpus is not backfilled.
- Dashboard detail pages render Earworm/Akousmata trace status, event chains, context bundles, signal packets, retention policy, and memory operations when future records carry them.
- Publication policy normalized to `https://github.com/sonicfieldlabs/algophony` and the sanitized export workflow remains the only public publication path.

### July 2026: Studio and Bench Integration

- Imported the full local sound workspace into `studio/` and renamed it
  **Algophony Studio**.
- Added Studio local state boundaries: `.algophony-studio/` is ignored,
  provider keys are user-owned, and Studio is not deployed as a public
  multi-user service from this repository.
- Renamed the benchmark app as **Algophony Bench Dashboard** and redesigned its
  frontend to match Studio's light Atlas visual system.
- Added Studio logo assets to the benchmark app and a durable local daemon
  preview command for Bench (`npm run dev:daemon`, default port `3010`).
- Updated the public export workflow to include Studio source code and exclude
  Studio/Bench local state, logs, build artifacts, node modules, and private
  app data.
- Fixed the Turbopack NFT tracing warning for the audio route by making the
  route explicitly dynamic and excluding build config from output file traces.

## v0.2 Release Gates

All of the following must pass before a public tag:

```bash
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py --strict --report
python3 scripts/generate_matrix.py --providers synth_baseline,spectral_fm --limit 2 --dry-run
python3 scripts/generate_matrix.py --providers el_sfx --limit 1 --dry-run
python3 scripts/export_release.py --dry-run
cd apps/web && npm run build
cd studio && npm run build
```

## Post-v0.2 Research Upgrades

- Add at least 100 ML-model generations.
- Prioritize ElevenLabs SFX as first configured ML backend.
- Add one reproducible local ML backend if hardware and install constraints allow.
- Add SpatialScaper spatial test cases.
- Add classifier evidence from CLAP, YAMNet, PANNs, or AudioSet-compatible tools.
- Add human annotation workflow and inter-annotator agreement.
- Add field-recording reference comparisons where licensing permits.
- Add model cards for every generation backend.
- Score the proposed manifesto axes (`disclosure_integrity`, `homogenization_index`, `voice_consent_risk`) on new reports; keep them null on the pilot corpus.
- Populate `compute_provenance` and `voice_material` on new generation records at generation time.
- Add provider openness profiles (open-weights local, open-code hosted, closed API) to the registry, the providers page, and benchmark exports.
- Produce routed listening passes with routing plans and claim-permission enforcement for new reports.
- Populate Earworm traces for new generation and listening runs when retention is enabled, including non-audio context bundles and Akousmata memory-operation refs.
- Define a promotion workflow from Studio export sets into schema-valid Atlas,
  generation, report, and benchmark records.
- Add optional Studio-to-Bench export previews without weakening benchmark
  validation or provenance rules.

## v0.3 Collaboration Layer

- Public contribution ingestion.
- Monthly benchmark prompt sets.
- Public listening-session workflow.
- Dataset version folders with immutable manifests.
- DOI-ready archive export.
- Consent and provenance ledger for voice material in contributed audio.
- Planetary-cost (compute provenance) summaries in benchmark exports.

## v0.4 Platform Hardening

- SQLite or DuckDB registry for dashboard queries.
- Authenticated internal generation dashboard, if the project moves beyond
  local-only preview.
- API routes for generation, analysis, scoring, and export.
- Richer waveform, spectrogram, and side-by-side audio comparison.
- Hardened Studio/Bench shared design tokens and a documented component
  migration path.

## v1.0

- Stable public benchmark.
- Stable schemas.
- ML and procedural generation coverage.
- Published research article.
- Public dataset archive with license and provenance records.
