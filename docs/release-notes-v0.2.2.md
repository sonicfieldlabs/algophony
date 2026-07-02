# Algophony v0.2.2 Release Notes

## Scope

v0.2.2 is an app-integration and documentation release for the local-mode
Algophony system. It does not change the benchmark corpus and does not claim a
full ML model benchmark.

## Changes Since v0.2.1

- Imported the former local sound workspace into `studio/` as **Algophony
  Studio**.
- Kept Studio local-first: `.algophony-studio/` state, generated or imported
  assets, provider settings, logs, build output, and node modules are excluded
  from git and public exports.
- Renamed and reframed the benchmark app as **Algophony Bench Dashboard**.
- Redesigned the benchmark frontend around the Studio light Atlas aesthetic:
  neutral sidebar, Studio logo, white cards, compact tables, restrained
  shadows, and mobile drawer behavior.
- Added durable local preview helpers for Bench (`npm run dev:daemon`,
  `npm run dev:stop`, default port `3010`) matching the Studio daemon pattern
  on port `3001`.
- Added `docs/architecture.md` to define the three-layer system: Framework,
  Bench Dashboard, and Studio.
- Updated README, roadmap, development plan, release checklist, and app READMEs
  around the integrated system model.
- Fixed the Turbopack NFT tracing warning around `app/audio/[id]/route.ts` by
  keeping the route dynamic/node-only and excluding build config files from
  output file traces.

## Unchanged Boundaries

- Public publication still uses `scripts/prepare_public_export.py`; do not push
  private local history directly to the public repository.
- Local corpus data, generated metadata, report corpora, generated audio,
  uploads, secrets, private notes, and private paths remain excluded from public
  export.
- Studio provider calls require user-owned keys and accounts.
- Bench and Studio are local-first apps in this repository, not public
  multi-user deployments.
