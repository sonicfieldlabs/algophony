# Earworm and Akousmata Integration

Status: contract surface landed, no legacy corpus backfill

## Purpose

The Listening Stack treats a sound object as more than an audio file. In an
agentic workflow, the object includes prompt intent, generation metadata,
analysis, field notes, ambiente frames, user edits, agent actions, provenance,
retention policy, and any render or transformation history that changes what
the sound can responsibly mean.

Algophony represents that expanded object through an optional
`earworm_trace` field on generation records and listening reports. The field is
a compact bridge to Earworm, not a full session export. It lets Algophony point
to a traceable route through the signal/context chain while keeping older
v0.1.1 pilot records unchanged.

## Upstream Vocabulary

Earworm is the project-agnostic persistence protocol. Its current public
objects are sessions, append-only events, asset refs, provenance records,
signal packets, analysis frames, feature-stream refs, context selectors,
context bundles, modulation intents, automation lanes, retention policies, and
export manifests.

Akousmata is the Listening Stack memory-operations surface over Earworm
chains:

- `remember`
- `list`
- `search`
- `similarity`
- `export`
- `forget`

Algophony does not import the Earworm runtime. It copies only the minimal
interchange shape it needs into `schemas/earworm-trace.schema.json`, following
the same local-contract pattern used for AKOÚŌ.

## Algophony Trace Shape

`earworm_trace` may appear on:

- `schemas/generation.schema.json`
- `schemas/listening-report.schema.json`

The trace carries:

- `trace_status`: whether a trace is planned, active, exported, forgotten,
  partial, unknown, or deliberately not recorded.
- `session_id`: the Earworm session when retained.
- `akousmata_operations`: memory operations available or executed.
- `event_chain`: compact event references such as prompt ingestion, generation
  request, audio generation, signal packet ingestion, AKOÚŌ route planning,
  mode completion, context attachment, or report creation.
- `asset_refs`: audio plus attached text, image, video, control, metadata, or
  analysis assets.
- `provenance_refs`: source, consent, rights, provider, model, and hash
  references.
- `signal_packets`: audio and non-audio signal references with time ranges and
  context references.
- `context_bundle_refs`: queryable bundles for prompts, field notes, ambiente
  frames, analysis summaries, edits, actions, or render history.
- `retention_policy`: locality, consent, deletion support, expiry, and
  restricted fields.

## Evidence Discipline

Earworm traces do not strengthen listening claims by themselves. They provide
route and provenance evidence that AKOÚŌ claim permissions can use. A context
bundle containing a field note can support a `contextual_note` evidence level;
a signal packet with analysis can support `measured_signal`; a retained prompt
alone still cannot support `heard` or `measured` claims about audio content.

Do not backfill `earworm_trace` onto old reports without an actual traced pass.
For the v0.1.1 procedural corpus, null is the correct value.

## Future Population Path

1. Generation workers create an Earworm session per generated or uploaded
   object when retention is enabled.
2. The generation request, provider result, audio asset, analysis frames, and
   prompt context are appended as events.
3. The AKOÚŌ router and each mode pass append route and mode-completion events.
4. Report generation writes `earworm_trace` with compact refs, not full private
   payloads.
5. Public exports include the schema and code surface but exclude local trace
   corpora unless a future release explicitly publishes consent-cleared traces.

## Guardrails

- Keep traces optional and nullable.
- Keep private raw session data local unless explicitly consent-cleared.
- Use relative URIs or opaque IDs; never publish machine-local paths.
- Treat `forget` as a first-class operation and preserve deletion support in
  the retention policy.
- Preserve AKOÚŌ claim taxonomy and stop conditions even when a rich trace is
  available.

## Batch access to the shared akousmata store (added 2026-07-04)

The shared store shipped (earworm `akousma_spec_v1.md`; platform application-data
directory by default, with an `$AKOUSMATA_PATH` override). Algophony's batch surface is
`workers/akousmata_source.py`:

- `load_akousmata(originating_app=..., origin=..., limit=...)` — query records for a run.
- `akousma_to_prompt_record(record)` — one akousma → an Algophony prompt/eval input,
  carrying a schema-conformant `earworm_trace` bridge.
- `write_eval(akousma_id, payload)` — stamp results back as `extensions["algophony.eval"]`.
- `ancestry(akousma_id)` — the lineage behind a sound.
- CLI: `python -m workers.akousmata_source --app germ --prompt-records`.

The `akousma` reference package is an **optional** dependency
(`pip install "akousma @ git+https://github.com/sonicfieldlabs/earworm.git@v0.6.0#subdirectory=packages/py-akousma"`); without it the module
raises `AkousmataUnavailable` and nothing else in Algophony is affected. Tests:
`scripts/test_akousmata_source.py` (skips when the package is absent).

## Spec v1.2 update (Earworm v0.3, 2026-07-11)

Akousma records may now carry two optional consent-scoped blocks and are open
at the top level (unknown fields are preserved, never rejected):

- **`location`** — where the sound was heard (`lat`/`lon`, `accuracy_m`,
  `altitude_m`, `label`, `source`, `captured_at`). Feeds the navigator's new
  listening map; the navigator strips it from every open-research export.
- **`capture`** — how the listening was triggered: `direction`
  (`past` = ring-buffer seconds before the trigger, `future` = the window
  after it, `live` = open-ended), `seconds`, `trigger`, `armed_at`,
  `triggered_at`.

Algophony's batch surface carries both blocks through
`akousma_to_prompt_record(...)` (as `location`, `capture`, and the
convenience `capture_direction`), so evaluation runs can group by place or by
temporal direction. Consent discipline: `location` is for local
organization/evaluation only — sanitized exports never include it.

## Spec v1.1 update (Earworm v0.2, 2026-07-10)

The shared store now speaks akousma spec v1.1: records carry a skimmable
`summary`, listening entries use the contract-pinned envelope
(`{contract, created_at, summary, payload}` — current OÍDA pins `akouo/v0.9`), and
`lineage.relations` holds typed kinship links distinct from causal
parenthood. Algophony's batch surface (`workers/akousmata_source.py`) reads
both eras natively, writes `compares_with` links across evaluation batches,
looks up recurrences by content hash before evaluating the "same" sound
twice, and runs `verify_store()` integrity reports where dangling links and
missing audio are named rather than silently skipped.

## The akousmata navigator (v0.3.1, 2026-07-10)

The shared store now has its own app: the **akousmata listening navigator**
(`github.com/sonicfieldlabs/akousmata`), a local-first library over the same
records this batch surface reads — filtering, tagging, manual human
listening events, graph navigation of lineage and kinship, a maintained wiki
layer, and research sessions. Evaluations Algophony stamps back
(`extensions["algophony.eval"]`) render on each record's wiki page, and the
`compares_with` links written across evaluation batches are navigable there
as kinship edges. Nothing changes in this repo's surface; the navigator is
where humans walk what the batches touched.
