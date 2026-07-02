# Algophony v0.2.1 Release Notes

## Scope

v0.2.1 is a paper-alignment and contract release for the v0.2 local-mode
platform. It keeps the v0.1.1 procedural pilot corpus unchanged and still does
not claim a full ML model benchmark.

## Changes Since v0.2

- Replaced the old manifesto with *Algophonya: A Pluriversal Listening
  Manifesto* and normalized terminology: Algophonya is the condition;
  Algophony Framework is the evaluation layer.
- Updated AKOÚŌ labels from v0.4 to v0.5 while preserving the already-synced
  contract: 13 listening modes, router, reference-layer, 16 commands, evidence
  ladder, claim permissions, routing plans, and reference maps.
- Added `schemas/earworm-trace.schema.json` plus nullable `earworm_trace`
  fields on generation and listening-report schemas.
- Added read-only dashboard rendering for Earworm/Akousmata trace status,
  event chains, attached signals, context bundles, retention policy, and memory
  operations.
- Added `docs/earworm-akousmata-integration.md` to document traceable
  listening routes and non-audio context attachment.
- Normalized the official public repository target to
  `https://github.com/sonicfieldlabs/algophony`.
- Added strict README corpus-count validation that fails when public count
  claims drift from the canonical JSON/JSONL corpus.

## Unchanged Boundaries

- No Earworm traces are backfilled onto the v0.1.1 corpus.
- Manifesto-derived axes remain nullable and unscored until an actual reviewing
  pass scores them.
- Public exports still exclude local benchmark data, generated metadata, report
  corpora, generated audio, uploads, secrets, private paths, and private local
  history.
