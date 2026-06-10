# Algophony v0.3 Integration Plan: Manifesto and AKOÚŌ v0.4

Status: draft execution plan, contract layer landed
Date: 2026-06-10

## Goal

v0.2 (see `algophony-v0.2-integration-plan.md`) planned the studio loop:
providers, LLM listening layer, STT/TTS interop, local models. v0.3 aligns the
framework's concept and contracts with two upstream sources:

1. The **Algophony Manifesto** (`docs/manifesto.md`), adopted as the founding
   statement. Its claims become instruments: disclosure, consent,
   homogenization, compute provenance, openness/capture profiles, and the nine
   standing questions.
2. **AKOÚŌ v0.4** (`../akouo`), which expanded from 9 listening modes and 10
   commands to 13 modes plus router and reference-layer (15 portable skills),
   16 commands, an evidence ladder with claim permissions, expanded routing
   plans, and an explicit agentic integration contract.

## What Landed in This Pass (2026-06-10)

Contract and concept layer, all backward compatible (200 existing reports and
scores still validate strict):

- `docs/manifesto.md`: manifesto adopted into the repository.
- `docs/concept-note.md`: expanded with the algophonic condition, middle
  matter, evaluation Level 5, the AKOÚŌ v0.4 listening layer, the planetary
  ear, literacy-or-capture, and the nine questions.
- `docs/glossary.md`: new entries for the manifesto and v0.4 vocabulary.
- `docs/benchmark-methodology.md`: Level 5, proposed axes, v0.4 listening
  chain and evidence ladder.
- `schemas/listening-report.schema.json`: mode enum widened to 13, command
  enum widened to 16, optional nullable `akouo_routing_plan` and
  `akouo_reference_map` with full inline definitions.
- `schemas/score.schema.json`: proposed nullable axes `disclosure_integrity`,
  `homogenization_index`, `voice_consent_risk`.
- `schemas/generation.schema.json`: optional nullable `compute_provenance`
  and `voice_material` records.
- `apps/web/app/lib/listening-contract.ts`: synced to v0.4 (modes, commands,
  skills, evidence levels, routing plan and reference map types).
- `apps/web/app/lib/types.ts`: report and score types extended to match.
- `apps/web/app/reports/[id]/page.tsx`: renders routing plans and reference
  maps when present.

## The Consumption Loop in the Pipeline

AKOÚŌ v0.4 defines a six-step agentic integration contract. Algophony
implements it inside its own report pipeline without importing the AKOÚŌ app
runtime:

| AKOÚŌ step | Algophony implementation |
| --- | --- |
| 1. Route | Build `akouo_routing_plan` from available artifacts before any listening pass. Evidence level is derived, not asserted: prompt without audio is `prompt_only`; generation metadata without decodable audio is `metadata_only`; `analyze_audio.py` features present is `measured_signal`; audio plus analysis plus prompt plus metadata is `mixed`. |
| 2. Check stop conditions | The pipeline refuses a listening pass when required inputs are missing. A missing audio file produces a stopped plan, not an imagined report. |
| 3. Listen | Run the plan's `mode_chain` in role order. Enforce `claim_permissions` on every mode output: a `prompt_only` run cannot emit `heard`/`measured` claims about audio content. |
| 4. Map (optional) | Run reference-layer for study-grade reports; store the result in `akouo_reference_map`. Reference maps connect reports to research routes without letting citation replace listening. |
| 5. Merge | Merge mode claims into the report `claim_taxonomy`, preserving disagreement between modes. The routing plan, router output, and mode outputs remain on the report as provenance. |
| 6. Hand off | `regeneration_recommendation`, `recommended_command`, remaining `undetermined` claims, and unmet stop conditions feed the next pass or the regenerative-prompting loop. |

Implementation order:

1. `workers/pipeline.py` or a new `workers/listening_plan.py`: deterministic
   `build_routing_plan(prompt, generation, analysis)` that maps artifact
   availability to evidence level and claim permissions. No LLM required.
2. `scripts/generate_reports.py`: attach the routing plan to new reports;
   validate emitted claims against `claim_permissions` before writing.
3. Studio/LLM layer (from the v0.2 plan): the LLM pass consumes the routing
   plan instead of free-running; failures degrade to the deterministic
   report, as already specified.
4. Never backfill plans onto the 200 v0.1.1 reports without an actual routed
   pass. Old reports legitimately predate the contract and the dashboard says
   so.

## Manifesto Instrumentation Rollout

### Proposed score axes (schema landed, future scoring pass)

- `disclosure_integrity` (1–5, higher better): synthetic origin legible —
  generator, operator, version, intended use.
- `homogenization_index` (0–5, lower better): distinct ecologies, accents,
  voices, places averaged into defaults.
- `voice_consent_risk` (0–5, lower better): voice-like material with
  unverifiable provenance or consent.

Rules: null until actually scored; excluded from composites while null; never
backfilled; scored on new reports once the ML corpus begins. When axes
become active, add them to `summarize_benchmark.py` axis lists and to the
dashboard `SCORE_AXES` so they render; both intentionally exclude them today
to avoid 200 empty rows.

### Generation metadata (schema landed, future population pass)

- `compute_provenance`: runtime locality (`local`, `cloud_api`,
  `hosted_endpoint`, `hybrid`, `undetermined`), hardware, region, energy
  note. Populate from the provider registry at generation time: local
  providers report hardware; API providers report `cloud_api` plus region
  when known.
- `voice_material`: declared for any generation whose prompt or output
  implies voice-like material; `consent_status` is `not_applicable` for
  voiceless soundscapes.

### Provider openness profiles (future provider pass)

Extend `workers/provider_registry.py` provider contracts and the `/providers`
page with an `openness` field:

- `open_weights_local`: inspectable weights, pinned versions, reproducible
  (Stable Audio Open, AudioGen, TangoFlux, MOSS-SoundEffect local/MLX).
- `open_code_hosted`: open code or weights behind a hosted endpoint
  (`*_hf_endpoint` providers).
- `closed_api`: closed commercial service (ElevenLabs SFX, Stability API
  routes, fal, Replicate).
- Procedural controls are `open_source_internal`.

Benchmark exports report openness alongside scores: a score earned inside a
closed API describes a service at a moment in time; a score earned by a
pinned local model describes a reproducible system. This is the
literacy-or-capture axis of the manifesto made operational.

### The nine questions as review protocol

Report QA for human/hybrid review adds the manifesto's standing questions as
a checklist mapped to existing fields: rendered as noise → `absent_expected`
and forbidden/erased sources; simulated → `cultural_cliche_index`,
`voice_consent_risk`; profits/captured → provider openness; exposed →
`disclosure_integrity` and false-field-recording risk. Questions outlive
models: suites and axes version, the protocol persists.

## Integration Map

- `../akouo` — source of truth for the listening contract. Algophony copies
  the contract shape (schemas and `listening-contract.ts`) instead of
  importing the runtime; keep both in sync with `../akouo/schemas/` when
  AKOÚŌ versions. The AKOÚŌ reference app's benchmark API remains optional
  and out of scope for the public Algophony surface.
- `../bench` — benchmark suite/run conventions; Algophony's suite manifests
  and score records stay structurally compatible.
- `../sonic field labs` — public showcase. The read-only Algophony page can
  now present the manifesto, the five evaluation levels, and the v0.4
  listening chain; it must not expose playground, upload, or generation
  workflows (see `PUBLICATION_POLICY.md`).
- MOSS-SoundEffect local/MLX providers — the local-first lane that makes
  compute provenance and openness profiles observable in practice.

Public export: all new fields are optional with null defaults, so
`prepare_public_export.py` continues to ship a clean code release; local
corpora stay local.

## Validation Gates

Run after every batch in this plan:

```bash
python3 scripts/validate_schemas.py
python3 scripts/validate_dataset.py --strict --report
python3 scripts/run_scenario_tests.py
python3 scripts/export_release.py --dry-run
cd apps/web && npx tsc --noEmit && npm run build
```

## Non-Goals

- No AKOÚŌ app runtime import; the contract is copied, not linked.
- No LLM calls in public surfaces; the LLM listening layer stays local
  Studio mode, per the v0.2 plan.
- No backfilled routing plans, reference maps, or manifesto axes on the
  v0.1.1 corpus.
- No change to the procedural-pilot status: the project is not presented as
  a mature ML benchmark until real model generations are reviewed and scored.
