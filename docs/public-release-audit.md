# Algophony Public Release Audit

Date: 2026-06-10
Updated: 2026-07-02
Scope: v0.2.1 local-mode platform patch, sanitized public-code export, and Listening Stack paper-alignment pass

## Executive Summary

No release-blocking data, schema, hygiene, or build failures are open in the
current local tree. The project remains on the v0.2 platform, with a v0.2.1
paper-alignment patch carrying the v0.1.1 procedural pilot corpus; it must not
be described as a mature ML text-to-audio benchmark.

The July 2026 alignment pass resolves the known publication-drift items:
Algophonya terminology, AKOÚŌ v0.5 labels, official
`sonicfieldlabs/algophony` repository references, and optional
Earworm/Akousmata traceability for future reports and generations.

## Passing Checks

- `python3 scripts/validate_schemas.py` passes.
- `python3 scripts/validate_dataset.py --strict --report` passes.
- `python3 scripts/run_scenario_tests.py` passes.
- `python3 scripts/export_release.py --dry-run` passes.
- `python3 scripts/prepare_public_export.py --dry-run` produces the expected
  sanitized export plan.
- `npm run build` passes in `apps/web`.

## Current Findings

### F-001: Audio Route Rejected Valid IDs

- **Severity:** fixed release-blocker
- **Area:** endpoint
- **File:** `apps/web/app/audio/[id]/route.ts`
- **Issue:** The route regex rejected valid generated audio IDs containing
  hyphenated provider names, such as `ALG-0001-SYNTH-BASELINE-A`.
- **Fix:** The route now uses the project audio ID pattern
  `^ALG-[0-9]{4}-[A-Z0-9-]+-[A-Z]$`.
- **Verification:** `npm run build` and strict dataset validation pass.

### F-002: Uploads Defaulted To Field Recording

- **Severity:** fixed high
- **Area:** provenance
- **Files:** `apps/web/app/api/upload/route.ts`,
  `apps/web/app/playground/PlaygroundClient.tsx`, `scripts/studio_generate.py`
- **Issue:** Local uploads defaulted to `field_recording`, which can overclaim
  provenance when the uploaded file is generated, archived, or otherwise
  unknown.
- **Fix:** Uploads now default to `found_sound` unless the user supplies a
  valid source type. The playground UI also defaults to found sound/archive.
- **Verification:** Strict dataset validation still passes; upload source types
  are constrained to the schema enum.

### F-003: Public Export Included Handoff Note

- **Severity:** fixed medium
- **Area:** publication hygiene
- **File:** `scripts/prepare_public_export.py`
- **Issue:** `replan.md` was included in the public export list even though the
  publication policy excludes private notes and handoff material.
- **Fix:** Removed `replan.md` from public export files.
- **Verification:** Public export dry-run still passes.

### F-004: AKOÚŌ Naming Drift

- **Severity:** fixed medium
- **Area:** docs/data polish
- **Files:** `scripts/generate_reports.py`, `scripts/studio_generate.py`,
  `workers/listening/llm_processor.py`, `reports/markdown/AK-*.md`
- **Issue:** Several generated Markdown reports and script strings used
  `AKOUO` instead of `AKOÚŌ`.
- **Fix:** Human-facing text now uses `AKOÚŌ`; internal TypeScript/Python
  identifiers keep ASCII names where appropriate.
- **Verification:** Remaining `AKOUO` matches are internal identifiers only.

### F-005: Future Model Labels Were Hardcoded

- **Severity:** fixed medium
- **Area:** UX
- **Files:** `apps/web/app/generations/page.tsx`,
  `apps/web/app/prompts/[id]/page.tsx`, `apps/web/app/comparison/page.tsx`
- **Issue:** Some tables described all outputs as procedural controls, which
  would become false after ML outputs are promoted.
- **Fix:** Generation tables use `source_type`; comparison tables use score
  model metadata.
- **Verification:** `npm run build` passes.

### F-006: Paper Terminology and Contract Drift

- **Severity:** fixed release-blocker
- **Area:** docs/schema
- **Files:** `README.md`, `docs/manifesto.md`, `docs/concept-note.md`,
  `docs/glossary.md`, `docs/benchmark-methodology.md`,
  `docs/references.md`, `schemas/listening-report.schema.json`,
  `apps/web/app/lib/listening-contract.ts`
- **Issue:** Local docs still centered the old Algophony manifesto wording and
  v0.4 AKOÚŌ labels while the Listening Stack paper and adjacent AKOÚŌ repo use
  Algophonya and AKOÚŌ v0.5.
- **Fix:** Replaced the manifesto, introduced the Algophonya/Algophony
  Framework naming split, and updated AKOÚŌ labels to v0.5 without changing the
  already-synced contract shape.
- **Verification:** Schema, dataset, export, and web build gates must pass.

### F-007: Missing Traceable Memory Route

- **Severity:** fixed high
- **Area:** schema/docs/UX
- **Files:** `schemas/earworm-trace.schema.json`,
  `schemas/generation.schema.json`, `schemas/listening-report.schema.json`,
  `apps/web/app/lib/types.ts`, `apps/web/app/generations/[id]/page.tsx`,
  `apps/web/app/reports/[id]/page.tsx`,
  `docs/earworm-akousmata-integration.md`
- **Issue:** The framework had no local contract for the Listening Stack paper's
  Akousmata/Earworm memory layer, so future reports could not point to an
  append-only route across audio and attached non-audio context.
- **Fix:** Added nullable `earworm_trace` fields and dashboard rendering for
  compact session/event/asset/provenance/signal/context/retention refs. Legacy
  v0.1.1 records remain unbackfilled.
- **Verification:** Schema and dataset validation must pass with old records
  unchanged.

## Residual Risk

- `npm run build` still emits a non-fatal Turbopack NFT tracing warning for
  `apps/web/app/audio/[id]/route.ts`. The route intentionally serves local
  audio files from gitignored data folders. The warning does not fail the build
  and no audio binaries are tracked.
- Public GitHub publication must still use `scripts/prepare_public_export.py`;
  the private local git history must not be pushed directly.

## Release Boundary

The public export may include local-mode code, provider adapters, schemas,
scripts, dashboard routes, and benchmark machinery. It must exclude local
benchmark data, generated metadata, reports, generated audio, uploads, secrets,
personal paths, private notes, and private local git history.
