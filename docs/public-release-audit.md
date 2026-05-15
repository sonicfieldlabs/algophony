# Algophony Public Release Audit

Date: 2026-05-15
Auditor: Automated agent audit
Scope: Full page, endpoint, schema, data, and documentation review

## Executive Summary

### Healthy

- Schema validation passes (6 schemas, draft 2020-12).
- Dataset validation passes: 100 prompts, 200 generations, 200 reports, 200 scores.
- Export dry-run passes.
- Dashboard builds (`npm run build` succeeds).
- Procedural pilot status is clearly labeled on Overview, Generations, Comparison, and Benchmark pages.
- AKOÚŌ claim taxonomy is preserved in all 200 report JSON files.
- Audio files are properly gitignored (`generations/audio/*` with `.gitkeep`).
- Path traversal protection exists in `/files/[...path]` and `/audio/[id]`.
- `generateStaticParams()` is implemented for prompts, generations, and reports.

### Release Blockers

1. Wildcard CORS in `next.config.ts`.
2. Ungated `POST /api/generate` runs Python subprocesses.
3. Ungated `POST /api/upload` runs Python subprocesses.
4. Upload response returns absolute filesystem `file_path`.
5. Generate route returns raw `stderr` to clients.
6. Provider route exposes unsanitized subprocess errors.
7. `uploads/` directory not in `.gitignore`.

### Should Fix Before Release

8. AKOÚŌ naming inconsistency in report detail page.
9. Oversized API responses (`/api/reports` ~1.7 MB, `/api/scores` ~0.8 MB).
10. Observatory canvas computations not memoized.
11. Observatory canvases do not redraw on resize.
12. Render-blocking Google Font `@import`.
13. `transition: all` used 12 times.
14. No `prefers-reduced-motion` media query.
15. Stale documentation references to `/references` and `/collaborate`.

### Can Wait Until After Release

16. Audio route uses synchronous reads with no Range support.
17. No pagination on table pages.
18. Composite score formula not documented on-page.

---

## Findings

### F-001: Wildcard CORS

- **Severity**: release-blocker
- **Area**: security
- **File**: `apps/web/next.config.ts:11`
- **Evidence**: `allowedDevOrigins: ["*"]`
- **Impact**: Allows any origin to access dev endpoints.
- **Fix**: Remove the line.
- **Verify**: `npm run build` still succeeds; no CORS errors on localhost.

### F-002: Ungated Generate Endpoint

- **Severity**: release-blocker
- **Area**: security, endpoint
- **File**: `apps/web/app/api/generate/route.ts`
- **Evidence**: `POST /api/generate` executes `python3 scripts/studio_generate.py` with no env gate.
- **Impact**: Public deploy would allow arbitrary generation requests, triggering subprocess execution.
- **Fix**: Gate behind `ALGOPHONY_ENABLE_STUDIO=true`. Return 404 when disabled.
- **Verify**: `curl -X POST /api/generate` returns 404 without env var.

### F-003: Ungated Upload Endpoint

- **Severity**: release-blocker
- **Area**: security, endpoint
- **File**: `apps/web/app/api/upload/route.ts`
- **Evidence**: `POST /api/upload` writes files to disk and executes Python with no env gate.
- **Impact**: Public deploy would allow file uploads and subprocess execution.
- **Fix**: Gate behind `ALGOPHONY_ENABLE_STUDIO=true`. Return 404 when disabled.
- **Verify**: `curl -X POST /api/upload` returns 404 without env var.

### F-004: Absolute File Path in Upload Response

- **Severity**: release-blocker
- **Area**: security
- **File**: `apps/web/app/api/upload/route.ts:80,99`
- **Evidence**: Response contains `file_path: audioPath` where `audioPath` is an absolute path.
- **Impact**: Leaks local filesystem structure to clients.
- **Fix**: Replace with relative `storage_uri`.
- **Verify**: Upload response contains only relative paths.

### F-005: Raw Stderr in Generate Error Response

- **Severity**: release-blocker
- **Area**: security
- **File**: `apps/web/app/api/generate/route.ts:49`
- **Evidence**: `{ ok: false, error: message, stderr }` returned directly.
- **Impact**: Python tracebacks, file paths, and internal state leak to clients.
- **Fix**: Return sanitized error message only.
- **Verify**: Trigger a generation error; response contains no traceback.

### F-006: Unsanitized Provider Route Errors

- **Severity**: release-blocker
- **Area**: security
- **File**: `apps/web/app/api/providers/route.ts:23`
- **Evidence**: `{ error: message }` where message is the full Error.message from subprocess.
- **Impact**: Python tracebacks and internal paths leak to clients.
- **Fix**: Return sanitized error message.
- **Verify**: Kill Python; provider route returns sanitized error.

### F-007: Uploads Directory Not Gitignored

- **Severity**: release-blocker
- **Area**: security
- **File**: `.gitignore`
- **Evidence**: No `uploads/` entry in `.gitignore`.
- **Impact**: Uploaded audio could be accidentally committed.
- **Fix**: Add `uploads/audio/*` and `uploads/metadata/*` with `.gitkeep` exceptions.
- **Verify**: `git status` does not show upload files.

### F-008: AKOÚŌ Naming Inconsistency

- **Severity**: high
- **Area**: UX
- **File**: `apps/web/app/reports/[id]/page.tsx:61`
- **Evidence**: `"AKOUO Claim Taxonomy"` instead of `"AKOÚŌ Claim Taxonomy"`.
- **Impact**: Inconsistent branding; elsewhere uses correct diacritics.
- **Fix**: Replace with correct Unicode spelling.
- **Verify**: Visual check on report detail page.

### F-009: Oversized Reports API

- **Severity**: high
- **Area**: performance
- **File**: `apps/web/app/api/reports/route.ts`
- **Evidence**: Returns all 200 full reports (~1.7 MB) with no summary option.
- **Impact**: Slow page loads; unnecessary data transfer for list pages.
- **Fix**: Add `?summary=1` query param that returns minimal fields.
- **Verify**: `curl /api/reports?summary=1` returns compact payload.

### F-010: Oversized Scores API

- **Severity**: high
- **Area**: performance
- **File**: `apps/web/app/api/scores/route.ts`
- **Evidence**: Returns all 200 full score records (~0.8 MB).
- **Impact**: Slow page loads for observatory and comparison.
- **Fix**: Add `?summary=1` query param.
- **Verify**: `curl /api/scores?summary=1` returns compact payload.

### F-011: Observatory Computations Not Memoized

- **Severity**: high
- **Area**: performance
- **File**: `apps/web/app/observatory/page.tsx:97-109`
- **Evidence**: `modelGroups` and `sourceGroups` are recomputed on every render.
- **Impact**: Unnecessary CPU work on re-renders.
- **Fix**: Use `useMemo`.
- **Verify**: Profile shows no re-computation on tab switch.

### F-012: Observatory Canvases Don't Resize

- **Severity**: high
- **Area**: UX
- **File**: `apps/web/app/observatory/page.tsx`
- **Evidence**: Canvas draw functions only run on data/tab change, not window resize.
- **Impact**: Charts become distorted or blank after resize.
- **Fix**: Add `ResizeObserver` that triggers redraw.
- **Verify**: Resize window; charts redraw correctly.

### F-013: Render-Blocking Font Import

- **Severity**: high
- **Area**: performance
- **File**: `apps/web/app/globals.css:1`
- **Evidence**: `@import url('https://fonts.googleapis.com/css2?family=Inter...')`.
- **Impact**: Blocks rendering until external CSS is loaded.
- **Fix**: Use `next/font/google` for automatic optimization.
- **Verify**: Lighthouse no longer flags render-blocking CSS.

### F-014: Transition All

- **Severity**: medium
- **Area**: performance
- **File**: `apps/web/app/globals.css` (12 occurrences)
- **Evidence**: `transition: all var(--transition)`.
- **Impact**: Animates all properties including layout, causing unnecessary GPU work.
- **Fix**: Replace with explicit property lists.
- **Verify**: Hover/focus transitions still work; no layout jank.

### F-015: No Reduced Motion

- **Severity**: medium
- **Area**: accessibility
- **File**: `apps/web/app/globals.css`
- **Evidence**: No `@media (prefers-reduced-motion)` query.
- **Impact**: Users with motion sensitivity cannot reduce animations.
- **Fix**: Add media query that disables transitions and animations.
- **Verify**: Enable "Reduce motion" in OS; transitions are instant.

### F-016: Stale Documentation Routes

- **Severity**: medium
- **Area**: docs
- **File**: `apps/web/README.md:41-43`
- **Evidence**: Lists `/references` and `/collaborate` routes that do not exist.
- **Impact**: Misleading documentation.
- **Fix**: Remove stale routes; add `/observatory` and `/playground`.
- **Verify**: All listed routes exist.

### F-017: Hardcoded Procedural Control Labels

- **Severity**: medium
- **Area**: UX
- **Files**: `page.tsx:94`, `prompts/[id]/page.tsx:76`
- **Evidence**: All models labeled "procedural control" regardless of `source_type`.
- **Impact**: Will be incorrect when ML outputs are added.
- **Fix**: Use `modelTypeLabel()` or `source_type` from data.
- **Verify**: Labels match data source_type.

### F-018: N+1 Report Count Query

- **Severity**: medium
- **Area**: performance
- **File**: `apps/web/app/generations/page.tsx:47`
- **Evidence**: `getReportsForAudio()` called per row inside `.map()`.
- **Impact**: Reads all 200 report files 200 times.
- **Fix**: Batch compute report counts before render.
- **Verify**: Page load time improves.
