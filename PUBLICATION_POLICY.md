# Algophony Framework Publication Policy

This repository has two release surfaces.

## Public GitHub Repository

`https://github.com/sonicfieldlabs/algophony` is the official public code repository for the
full local-mode Algophony Framework system. It may include schemas, scripts, provider
adapters, the local web dashboard, playground code, benchmark machinery,
documentation, and empty data directories.

It must not include benchmark result data, generated metadata, report corpora,
generated audio, uploaded audio, secrets, private notes, local machine paths, or
the current private/local git history.

Publish this repository only through `scripts/prepare_public_export.py`, which
creates a sanitized fresh-history export. Do not push the current working
history directly to the public remote.

## Sonic Field Labs Website

The public-facing Algophony Framework page lives in the private Sonic Field Labs website
repository. That page is a curated read-only showcase. It must not expose playground generation, upload
workflows, private benchmark data, local API endpoints, local filesystem paths,
or private notes.

## Local Research Data

The full working corpus remains local. Local benchmark data, generated
metadata, reports, uploaded files, and audio binaries may be mounted into the
dashboard through `ALGOPHONY_DATA_ROOT` or kept in the local working tree, but
they are not part of the public code export.

## Release Rules

- Use schema-validated JSONL and JSON records as sources of truth.
- Keep generated audio out of git except explicit tiny fixtures.
- Keep `.env` and `.env.local` out of git.
- Keep environment variable names in `.env.example`, but never publish values.
- Replace local paths in public documentation with placeholders such as
  `$SFL_ROOT/algophony`.
- Run the export hygiene checks before every public release.
