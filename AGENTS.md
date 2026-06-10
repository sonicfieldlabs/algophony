# Agents

Operational instructions for coding agents working on the Algophony project.

## Search and Navigation

- Use `rg` (ripgrep) for text search across the repository.
- Use schema validation after editing any data file.
- Check `DEVELOPMENT_PLAN.md` for the authoritative specification.

## Data Integrity

- Do not commit audio binaries by default. Audio files belong in `generations/audio/` which is gitignored.
- Do not invent source provenance. If provenance is unknown, mark it as such.
- Do not identify species, cultures, or locations from generated audio without evidence.
- Do not rely on ad hoc spreadsheets as the source of truth. Use JSONL and schema-validated records.
- Every generated output must have a metadata record in `generations/metadata/generations-v0.1.jsonl`.
- Every scored report must link back to `prompt_id` and `audio_id`.
- Every public release must include license/provenance information.
- Do not skip schema validation.

## AKOÚŌ Claim Taxonomy

Preserve the AKOÚŌ claim taxonomy in all listening reports:

| Category | Definition |
| --- | --- |
| `heard` | Directly present in the audio, prompt, transcript, or provided description |
| `measured` | Produced by file, signal, waveform, spectrogram, or metadata inspection |
| `inferred` | Plausible logical deductions (not theory or culture) |
| `interpreted` | Cultural, theoretical, affective, or contextual reading |
| `speculative` | Fictional, symbolic, imaginative, or possible-world reading |
| `undetermined` | What cannot be responsibly claimed |

Do not:
- Treat model output as documentary evidence.
- Identify animal species without evidence.
- Identify a real location from generated audio.
- Claim a real field recording exists when the file is generated.
- Collapse ecological critique into generic quality scoring.

## AKOÚŌ v0.4 Contract

Algophony is aligned with AKOÚŌ v0.4 (`../akouo` is the source of truth):

- 13 listening modes plus `akouo-router` and `reference-layer` (15 skills).
- 16 commands (`/listen` through `/route`).
- Evidence ladder: `none`, `prompt_only`, `metadata_only`,
  `decoded_audio_metadata`, `measured_signal`, `transcript_or_caption`,
  `contextual_note`, `mixed`.
- Reports may carry `akouo_router_output`, `akouo_mode_outputs`,
  `akouo_routing_plan`, and `akouo_reference_map`. All optional. Never
  backfill them onto old reports without an actual routed pass.
- When a report carries `akouo_routing_plan`, its claims must respect
  `claim_permissions`. Example: `prompt_only` evidence forbids `heard` and
  `measured` claims about audio content.
- Honor `stop_conditions`: stop or gather evidence instead of listening to
  imagined input.
- The vocabulary is duplicated in `schemas/listening-report.schema.json` and
  `apps/web/app/lib/listening-contract.ts`; keep both in sync with
  `../akouo/schemas/` when AKOÚŌ versions.

The manifesto-derived score axes (`disclosure_integrity`,
`homogenization_index`, `voice_consent_risk`) and generation fields
(`compute_provenance`, `voice_material`) are nullable and unscored on the
v0.1.1 corpus. Score or populate them only with an actual reviewing pass.

## Schema Validation

After editing any data file, run:

```bash
python scripts/validate_dataset.py
```

After editing any schema file, run:

```bash
python scripts/validate_schemas.py
```

## Prompt IDs

- Pattern: `^ALG-[0-9]{4}$`
- Example: `ALG-0001`, `ALG-0042`, `ALG-0100`

## Audio IDs

- Pattern: `^ALG-[0-9]{4}-[A-Z0-9-]+-[A-Z]$`
- Example: `ALG-0001-EL-SFX-A`, `ALG-0001-SCAPER-B`

## Report IDs

- Pattern: `^AK-[0-9]{4}$`
- Example: `AK-0001`, `AK-0050`

## Git Hygiene

- Never commit `.env` or `.env.local`.
- Never commit private recordings, unlicensed source audio, or private notes.
- Never commit `node_modules/`, `__pycache__/`, `.next/`, or build artifacts.
- Keep generated audio out of git. Use `generations/audio/.gitkeep` as the only tracked file in that directory.
- If small audio fixtures are needed for testing, place them in `fixtures/audio/` and explicitly unignore that directory.
- Treat the current local history as private/local. Do not push it directly to `https://github.com/emeisazam/algophony`.
- Publish the public repository only through `scripts/prepare_public_export.py`, which creates a fresh sanitized export.
- The public repo may contain full local-mode code, playground code, provider adapters, schemas, and benchmark machinery, but not benchmark result data, generated metadata, report corpora, generated audio, uploads, secrets, personal paths, or private notes.
- The public website/showcase belongs in the private Sonic Field Labs repository, not in a deployed Algophony playground.
- Local research data stays local and may be mounted with `ALGOPHONY_DATA_ROOT`.

## Adjacent Projects

When implementing features, check conventions in:

- `../akouo` — Listening framework, claim taxonomy, schemas
- `../bench` — Benchmark suite/run patterns, scoring conventions
- `../sonic field labs` — Web platform conventions (Next.js, TypeScript, Tailwind, pnpm + turbo)

Reuse conceptual contracts from AKOÚŌ instead of inventing a conflicting listening taxonomy.
Reuse benchmark structure patterns from `bench` instead of inventing an incompatible run format.
