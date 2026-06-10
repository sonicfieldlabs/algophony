# Release Checklist

Pre-release validation for Algophony v0.2.

## Documentation

- [x] README states the current procedural-pilot status.
- [x] ROADMAP distinguishes the v0.2 platform release from post-v0.2 research upgrades.
- [x] Concept note exists.
- [x] Glossary exists.
- [x] References are grouped and publication metadata should be checked before formal citation.
- [x] Dataset card documents limits, ethics, licenses, and missing data.
- [x] Benchmark methodology explains positive axes, risk axes, score provenance, and composite normalization.
- [x] Web app README is project-specific.

## Data

- [x] 100 prompt records validate against `prompt.schema.json`.
- [x] 200 generation metadata records validate against `generation.schema.json`.
- [x] 200 local audio files exist in gitignored storage.
- [x] 200 audio-analysis records exist.
- [x] 200 JSON reports validate against `listening-report.schema.json`.
- [x] 200 Markdown reports match JSON report IDs.
- [x] 200 benchmark score records validate against `benchmark-run.schema.json`.
- [x] Benchmark suite validates against `benchmark-suite.schema.json`.
- [x] Score axes are not constant across the benchmark.
- [x] Public generation metadata uses relative storage URIs.
- [x] Category balance is exactly 10 prompts per category.

## Current Release Status

- [x] 2 procedural controls are included.
- [x] 100 hybrid-reviewed seed reports are included.
- [x] 100 agent-draft reports are included.
- [x] ML provider adapters are present but not included in score data.
- [x] Suite status is `procedural_pilot`.

## Publication Readiness

- [x] Contributor guide exists.
- [x] Issue templates exist.
- [x] `LICENSE` exists.
- [x] `.env.example` exists.
- [x] `.env.local` remains gitignored.
- [x] Release hygiene check scans for secrets, private paths, license fields, staged audio, and strict dataset validation.
- [ ] Public GitHub export is created from `scripts/prepare_public_export.py`, not from local history.
- [ ] Public export excludes benchmark result data, generated metadata, report corpora, generated audio, uploads, secrets, personal paths, and private notes.
- [ ] Sonic Field Labs owns the read-only public Algophony showcase page.
- [ ] Local full-corpus data remains local and is mounted only with `ALGOPHONY_DATA_ROOT`.

## Required Commands

```bash
python3 -m pip install -r requirements.txt
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py --strict --report
python3 scripts/generate_matrix.py --list-providers
python3 scripts/generate_matrix.py --list-providers --json
python3 scripts/generate_matrix.py --limit 1 --dry-run
python3 scripts/generate_matrix.py --providers synth_baseline,spectral_fm --limit 2 --dry-run
python3 scripts/generate_matrix.py --providers el_sfx --limit 1 --dry-run
python3 scripts/generate_matrix.py --providers audiogen_local --limit 1 --dry-run
python3 scripts/generate_matrix.py --providers stable_audio_open_local --limit 1 --dry-run
python3 scripts/generate_matrix.py --providers tangoflux_local --limit 1 --dry-run
python3 scripts/generate_matrix.py --providers moss_sfx_mlx --limit 1 --dry-run
python3 scripts/run_scenario_tests.py
python3 scripts/export_release.py --dry-run
python3 scripts/prepare_public_export.py --dry-run
cd apps/web && npm install && npm run build
```

## Known Limitations

- No ML model outputs are included yet.
- ML/API provider adapters are configured as incoming-generation paths only.
- Local AudioGen, MOSS-SoundEffect, Stable Audio Open, and TangoFlux require optional dependencies and model access.
- No field-recording references are included.
- No independent human listening panel has reviewed the full corpus.
- Audio files remain local and gitignored; public release needs a storage/archive decision.

## Final

- [ ] Generate at least 100 ML-model outputs before claiming a model benchmark.
- [ ] Draft Sonic Field Labs research post.
- [ ] Tag `v0.2` only after all required commands pass.
