# Algophony v0.2 Release Notes

## Scope

v0.2 is a public code and local-mode platform release. It preserves the
v0.1.1 procedural pilot corpus as local research data and does not claim a full
ML model benchmark.

## Changes Since v0.1.1

- Added the read-only public release split: public GitHub contains code,
  schemas, workers, provider adapters, dashboard, and benchmark machinery only.
- Added `scripts/prepare_public_export.py` to publish a sanitized export
  without local benchmark data, generated metadata, report corpora, generated
  audio, uploads, secrets, private paths, or private local git history.
- Expanded provider contracts for ElevenLabs, Stable Audio 2.5 routes, Stable
  Audio Open, AudioGen, MOSS-SoundEffect, TangoFlux, SpatialScaper, and
  user-hosted Hugging Face endpoints.
- Added provider status export and safer provider-status reporting.
- Added gated local Playground routes for generation and uploads. Playground is
  disabled by default and requires `ALGOPHONY_ENABLE_PLAYGROUND=true`.
- Added upload and generation guardrails for local-only operation, concurrency
  limits, sanitized errors, and relative storage paths.
- Added dashboard routes for providers, observatory views, playground
  workflows, generated-file access, API data access, and export inspection.
- Added release hygiene checks for secrets, private paths, public-export data
  policy, strict validation, and tracked audio binaries.
- Extended schemas and validation around source type, provider provenance,
  score provenance, AKOÚŌ routing fields, review status, and nullable proposed
  manifesto axes.
- Added public release audit documentation and a v0.2 integration plan.

## Unchanged Boundaries

- Benchmark corpus filenames remain `v0.1` because the local corpus is still
  the v0.1.1 procedural pilot data.
- Public exports intentionally exclude local corpus data and generated audio.
- The project still must not be described as a mature ML text-to-audio
  benchmark until ML outputs are generated, promoted, reported, scored, and
  schema-validated.
