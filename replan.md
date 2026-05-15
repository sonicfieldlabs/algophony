# Algophony Public Release Audit and Hardening Plan

## Purpose

This document is the execution handoff for an external coding agent taking over
the Algophony public-release audit and hardening pass.

The goal is to audit the current project state page by page, endpoint by
endpoint, and data contract by data contract, then implement only the fixes
needed to make the project clean, safe, performant, and internally consistent
for a public read-only release.

The public release target is read-only by default. The public site should expose
the Atlas, prompts, generations, reports, comparison, providers, benchmark,
export files, observatory, and public documentation. Interactive Playground
upload and generation workflows must be disabled or explicitly gated outside
local/internal research mode.

## Ground Rules

- Work from the repository root.
- Read `AGENTS.md` and `DEVELOPMENT_PLAN.md` before editing.
- Use `rg` for search.
- Do not revert unrelated user changes.
- Do not commit audio binaries.
- Do not read, copy, print, or publish `.env` or `.env.local` contents.
- Preserve the AKOÚŌ claim taxonomy exactly:
  - `heard`
  - `measured`
  - `inferred`
  - `interpreted`
  - `speculative`
  - `undetermined`
- Do not treat generated audio as documentary evidence.
- Do not identify species, cultures, or locations from generated audio without
  explicit evidence.
- Do not invent source provenance.
- After editing data files, run `python3 scripts/validate_dataset.py`.
- After editing schema files, run `python3 scripts/validate_schemas.py`.

## Permanent Repository Split

- `https://github.com/alephchixi/algophony` is the public clean-code
  repository for the full local-mode system: schemas, scripts, workers,
  dashboard, playground code, provider adapters, and benchmark machinery.
- The public Algophony repository must not contain benchmark result data,
  generated metadata, report corpora, generated audio, uploads, secrets,
  personal filesystem paths, private notes, or the current private/local git
  history.
- The public-facing Algophony website/showcase lives in the private Sonic Field
  Labs website repository. It is read-only and must not expose local playground,
  upload, or generation workflows.
- Local research data stays local and may be mounted with
  `ALGOPHONY_DATA_ROOT`.
- Never push the current local history directly to the empty public remote.
  Publish only through a sanitized fresh-history export.

## Current Baseline

These checks were already observed before this handoff:

- `python3 scripts/validate_schemas.py` passes.
- `python3 scripts/validate_dataset.py --strict --report` passes.
- `python3 scripts/export_release.py --dry-run` passes.
- `npm run build` succeeds in `apps/web`.
- The build emits a Turbopack warning around dynamic filesystem tracing in
  `apps/web/app/audio/[id]/route.ts`.
- Production smoke testing returned 200 for the main pages and API routes.
- `/files/../README.md` returned 404.
- `npm audit --omit=dev --json` reported a moderate PostCSS advisory through
  Next.
- `/api/reports` was about 1.7 MB.
- `/api/scores` was about 0.8 MB.
- `.env.local` exists but is gitignored.
- `generations/audio/.gitkeep` is the only tracked file expected in
  `generations/audio/`.

## Locked Product Decisions

The user selected these defaults:

1. Public surface: read-only public release.
2. AKOÚŌ scope: router plus modes, not only taxonomy.
3. First deliverable: audit report first, then fixes.

Do not skip the audit report unless the user explicitly changes this decision.

## Phase 1: Create the Audit Report

Create `docs/public-release-audit.md`.

The report must be practical enough that a second engineer can implement fixes
without rediscovering context. Each finding must include:

- Severity: `release-blocker`, `high`, `medium`, `low`, or `enhancement`.
- Area: page, endpoint, schema, data, docs, security, performance, or UX.
- Evidence: route, file path, line reference where possible, observed command
  output if relevant.
- Impact: what could break, leak, confuse, overclaim, or slow down.
- Recommended fix: exact implementation direction.
- Verification: command or manual browser check.

Start the audit report with a short executive summary:

- What is already healthy.
- What blocks public release.
- What should be fixed before release but is not blocking.
- What can wait until after release.

## Phase 2: Page-by-Page Audit

Audit every current page in `apps/web/app`.

### `/`

Check:

- Counts for prompts, generations, reports, reviewed reports, and ML
  generations.
- Procedural-pilot status is visible.
- Current score table does not imply a mature ML benchmark.
- Risk axes are clearly lower-is-better.
- Page does not fetch unnecessary client bundles.

### `/atlas`

Check:

- Ten categories render.
- Each category count matches the Atlas data.
- Category links preserve filter intent.
- No missing or duplicated category labels.

### `/prompts`

Check:

- Filters work from URL search params.
- Category, difficulty, loop, focus, and coverage filters combine correctly.
- Table remains readable on mobile.
- Prompt text is escaped and cannot inject HTML.
- Coverage counts match generation metadata.

### `/prompts/[id]`

Check:

- `generateStaticParams()` covers all prompt IDs.
- Missing prompt IDs return 404.
- Intended and forbidden source lists render accurately.
- Linked generations and reports match `prompt_id`.
- No unsupported species/location claims are introduced by UI copy.

### `/generations`

Check:

- Generation count matches `generations-v0.1.jsonl`.
- Model counts are accurate.
- Procedural controls are labeled as procedural controls.
- The page does not present procedural controls as ML outputs.
- Table scale remains acceptable as generation count grows.

### `/generations/[id]`

Check:

- Missing IDs return 404.
- Audio playback works for known generated WAV files.
- Audio missing state is understandable.
- `storage_uri` is relative, not a local absolute path.
- SHA-256, license, prompt link, and report links render correctly.
- Public release copy does not reveal local filesystem structure beyond
  project-relative paths.

### `/reports`

Check:

- Current client fetches do not overfetch too much data for release.
- Filters for source, listener, process, status, and category work together.
- Report score fallback logic is correct.
- Claim taxonomy vocabulary is consistent with AKOÚŌ spelling.
- Large payloads do not block interaction.

### `/reports/[id]`

Check:

- Missing IDs return 404.
- Claim buckets are shown in canonical order.
- `AKOÚŌ` naming is used consistently, not `AKOUO`.
- Score provenance is visible and complete.
- Report distinguishes measured, inferred, interpreted, speculative, and
  undetermined claims.
- Report does not identify species, cultures, or locations without evidence.

### `/comparison`

Check:

- Composite score formula is documented or at least not misleading.
- Risk axes are lower-is-better.
- Empty model/category rows do not render as false zero-quality claims.
- The page remains responsive with many models.

### `/providers`

Check:

- Static provider export and dynamic `/api/providers` do not contradict each
  other.
- Public provider status does not expose sensitive local env detail.
- Missing-key messages are safe for public display.
- License status and install hints do not overstate publication rights.

### `/benchmark`

Check:

- Suite is clearly labeled `procedural_pilot`.
- ML generation count remains zero unless real ML outputs are validated.
- Turing/discriminability logic handles no data.
- Contributor copy does not invite direct git commits of private audio.

### `/export`

Check:

- All export links work.
- Exported files are public-safe.
- License and provenance information are included or linked.
- No private reports, uploads, or local paths are exposed.

### `/observatory`

Check:

- Analytics canvases render nonblank.
- Field canvases render nonblank.
- Canvas labels do not overlap at desktop and mobile widths.
- Empty datasets produce deliberate empty states.
- Derived maps are memoized or otherwise not recreated in hot render paths.
- Canvas redraws on resize.

### `/playground`

Check:

- Public release defaults disable upload and generation.
- Local mode remains usable when explicitly enabled.
- Upload metadata does not leak private location, recorder, equipment, notes, or
  absolute file paths.
- `studio_generate.py --analyze-upload` is currently called by the upload route
  but not implemented by the script; this must be recorded as a finding.
- Python errors and tracebacks are not returned to public clients.

## Phase 3: Endpoint Audit

Audit all route handlers in `apps/web/app/api`, `apps/web/app/audio`, and
`apps/web/app/files`.

### `GET /api/prompts`

Check:

- Returns only public prompt fields.
- Can be cached.
- Does not need to be dynamic unless data changes at runtime.

### `GET /api/generations`

Check:

- Returns public-safe generation metadata.
- Does not expose absolute paths.
- Includes license/provenance.
- Can support summary mode later.

### `GET /api/reports`

Check:

- Current full payload is large.
- Add or plan `?summary=1`, pagination, and filtering.
- Do not send all report bodies to pages that only need summary rows.

### `GET /api/scores`

Check:

- Current full payload is large.
- Add or plan summary aggregates for observatory/comparison.
- Preserve score provenance for detail views.

### `GET /api/providers`

Check:

- Public response should not expose sensitive env names or internal paths.
- Local/internal response may be more detailed when explicitly enabled.
- Python subprocess output is sanitized.

### `POST /api/generate`

Public default:

- Disabled unless `ALGOPHONY_ENABLE_STUDIO=true`.
- Must not run Python subprocesses on public deploy.

Local enabled mode:

- Validate prompt length, provider ID, duration, loop, seed, source lists.
- Clamp duration to provider max.
- Sanitize errors.
- Avoid returning tracebacks.
- Return relative metadata only.

### `POST /api/upload`

Public default:

- Disabled unless `ALGOPHONY_ENABLE_STUDIO=true`.

Local enabled mode:

- Validate extension and MIME type.
- Enforce size limit.
- Sanitize metadata strings.
- Do not return absolute `file_path`.
- Implement or remove `--analyze-upload`.
- Store uploads in gitignored paths.

### `GET /audio/[id]`

Check:

- ID regex blocks traversal.
- Only approved directories are searched.
- Add Range support.
- Avoid `readFileSync` for large audio.
- Return safe cache headers.
- Consider requiring the ID to exist in generation/upload metadata.

### `GET /files/[...path]`

Check:

- Allowed roots are correct.
- Path traversal remains blocked.
- Content types are correct.
- Only release-safe docs/data are served.

## Phase 4: Security and Release Hardening

Implement after the audit report:

1. Remove `allowedDevOrigins: ["*"]` from `apps/web/next.config.ts`.
2. Gate `POST /api/generate` and `POST /api/upload` with
   `ALGOPHONY_ENABLE_STUDIO=true`.
3. Public disabled response should be either 404 or a sanitized JSON message
   without internal detail.
4. Strip absolute `file_path` from upload responses.
5. Sanitize subprocess errors from generate, upload, and providers routes.
6. Add `.gitignore` coverage for `uploads/` while preserving intentional
   `.gitkeep` files if they are meant to be tracked.
7. Ensure provider status does not reveal private env values.
8. Run release hygiene checks.

## Phase 5: AKOÚŌ Router and Modes Integration

The current Algophony data preserves the AKOÚŌ claim taxonomy but does not yet
carry over the full router and listening-mode contract from the adjacent
`../akouo` app.

Implement a local Algophony listening contract without importing the AKOÚŌ app
runtime.

### Add Type Contract

Add a shared TypeScript contract, for example:

`apps/web/app/lib/listening-contract.ts`

It should define:

- `CLAIM_CATEGORIES`
- `AKOUO_LISTENING_MODES`
- `AkouoListeningMode`
- `AkouoRoute`
- canonical label helpers

Modes:

- `signal-inspection-listening`
- `acoulogical-object-listening`
- `embodied-affective-listening`
- `transductive-media-listening`
- `forensic-archival-listening`
- `ecological-posthuman-listening`
- `critical-political-listening`
- `musical-aesthetic-listening`
- `symbolic-fictional-listening`

### Extend Report Schema

Add report fields:

- `akouo_route`
- `akouo_modes`

Suggested `akouo_route` fields:

- `command`
- `input_type`
- `primary_mode`
- `secondary_mode`
- `corrective_mode`
- `available_evidence`
- `unavailable_evidence`
- `must_not_assume`

Keep `claim_taxonomy` as the canonical aggregate taxonomy.

### Data Migration

After schema changes:

- Migrate all `reports/json/AK-*.json`.
- Regenerate `reports/markdown/AK-*.md`.
- Update report pages to display route and modes.
- Validate schemas and dataset.

## Phase 6: Performance Improvements

Implement after release blockers:

1. Add lean summary endpoints:
   - `GET /api/reports?summary=1`
   - `GET /api/scores?summary=1`
   - `GET /api/observatory`
2. Use server-side JSON/JSONL caching through `React.cache()` or a small
   module-level cache.
3. Avoid reading and parsing all 200 report JSON files repeatedly in hot paths.
4. Add pagination or virtualization for large tables.
5. Stream audio with Range support.
6. Replace `@import` Google font loading with `next/font` or system fonts.
7. Replace `transition: all` with explicit transitions.
8. Add `prefers-reduced-motion`.
9. Memoize Observatory `modelGroups` and `sourceGroups`.
10. Redraw canvases on resize.

## Phase 7: Visualization QA

Verify:

- Observatory analytics canvases are nonblank.
- Observatory field canvases are nonblank.
- Desktop and mobile layouts do not overlap text or charts.
- Empty states render intentionally.
- Audio playback works for a known generated WAV.
- Playground local mode includes waveform/spectrum visualization if retained.

If browser automation is available, capture screenshots for:

- `/`
- `/reports`
- `/reports/AK-0001`
- `/observatory`
- `/playground`

At minimum, run production route smoke tests.

## Phase 8: Documentation Consistency

Fix docs after code decisions:

- `apps/web/README.md` currently mentions `/references` and `/collaborate`,
  but those routes are not present.
- `ROADMAP.md` also mentions references/collaboration dashboard routes.
- Decide whether to restore those pages or update docs to match the current
  routes.
- Ensure public docs say procedural pilot, not mature ML benchmark.
- Ensure dataset card and release checklist match suite status.

## Required Validation Commands

Run after every relevant fix batch:

```bash
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py --strict --report
python3 scripts/export_release.py --dry-run
npm run build
npm audit --omit=dev --json
```

If scenario tests are updated or relevant:

```bash
python3 scripts/run_scenario_tests.py --include-dashboard-build
```

If data files are edited:

```bash
python3 scripts/validate_dataset.py
```

If schema files are edited:

```bash
python3 scripts/validate_schemas.py
```

## Production Smoke Test

Start the built app on a nondefault port:

```bash
cd apps/web
npm run build
npm run start -- -p 3020
```

Check:

- `/`
- `/atlas`
- `/prompts`
- `/prompts/ALG-0001`
- `/generations`
- `/generations/ALG-0001-SYNTH-BASELINE-A`
- `/reports`
- `/reports/AK-0001`
- `/comparison`
- `/providers`
- `/benchmark`
- `/export`
- `/observatory`
- `/playground`
- `/api/prompts`
- `/api/generations`
- `/api/reports`
- `/api/scores`
- `/api/providers`
- `/files/docs/dataset-card-v0.1.md`
- `/files/../README.md`
- `/audio/ALG-0001-SYNTH-BASELINE-A`

Expected:

- Public pages return 200.
- Traversal probe returns 404.
- Audio route returns valid audio when file exists.
- Upload/generate POST routes are disabled by default in public mode.

## Acceptance Criteria

The release hardening pass is complete when:

- `docs/public-release-audit.md` exists and contains actionable findings.
- Release-blocker and high-severity findings are fixed or explicitly deferred
  by the user.
- Public release is read-only by default.
- Upload and generation require explicit local/internal enablement.
- No absolute local paths are returned by public APIs.
- No secrets or private env values are exposed.
- No generated audio binaries are tracked.
- AKOÚŌ route and mode contract is represented.
- Claim taxonomy remains valid and unchanged.
- Dataset validation passes.
- Schema validation passes.
- Release hygiene passes.
- Web build passes.
- Production smoke test passes.

## External References

- Vercel Web Interface Guidelines:
  https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
- Adjacent AKOÚŌ source of truth:
  `../akouo`
- Authoritative Algophony specification:
  `DEVELOPMENT_PLAN.md`
