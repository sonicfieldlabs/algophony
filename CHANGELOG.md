# Changelog

## 0.5.1 — Contract and dependency alignment

- Aligned the listening contract with AKOÚŌ 0.9, Earworm 0.6, Akousmata 0.6,
  Oída gateway 0.5, and GERM 0.3.
- Updated the evidence ladder so prompt, transcript, and contextual text never
  count as heard audio, and added corpus listening to the portable vocabulary.
- Updated Next.js and vulnerable transitive dependencies to patched releases.

## 0.5.0 — Sovereignty-aware evaluation

- Pinned listening reports to `akouo/v0.7`, including
  `sovereign-listening` and `/covenant`.
- Added akousma spec v1.3 covenant blocks to batch ingestion.
- Defined withheld material as attributed absence that must not be scored,
  reconstructed, or guessed.

## 0.4.0 — Located and directed listening

- Added optional akousma spec v1.2 `location` and `capture` blocks.
- Preserved unknown top-level record fields and added CI coverage for worker
  contract tests.

## 0.3.2 — OÍDA gateway

- Added provider-neutral `oida/gateway/v0.2` listening.
- Normalized OÍDA-owned and host-owned perception into AKOÚŌ reports with
  compact, path-sanitized Earworm context.

## 0.3.1 — Akousmata navigator

- Connected batch records, evaluation stamps, and typed kinship to the shared
  Akousmata store.

## 0.3.0 — Executed listening contracts

- Added deterministic routing plans, evidence-derived claim permissions, and
  schema/manifest drift checks.
- Added Earworm session provenance and akousma batch-source operations.

## 0.2.2 — Studio and Bench integration

- Added Algophony Studio and aligned the Bench Dashboard with the same local
  workspace model.
- Documented the framework, dashboard, and studio architecture.

## 0.2.1 — Listening Stack alignment

- Added Earworm trace schemas and read-only trace rendering.
- Aligned public terminology and repository boundaries.

## 0.2.0 — Public local-mode platform

- Published code, schemas, workers, provider adapters, benchmark machinery,
  local apps, and sanitized export tooling.
- Kept corpus records, generated audio, uploads, secrets, and local app state
  outside the repository.
