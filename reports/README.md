# Public Reports

Listening report corpora are local research data and are excluded from the public code export.

## Generate an isolated run

`python3 scripts/generate_reports.py --prompt-ids <ids> --limit <count>` writes a fresh run beneath
`.algophony/reports/`, with `json/`, `markdown/`, `scores.jsonl`, and a manifest. Use `--output-dir`
to choose another **new** directory. Existing directories are rejected; there is no implicit
full replacement. `--limit 0`, an empty filter, or missing evidence writes nothing.

Complete reports and scores are staged before publication. A failed or canceled run removes its
staging directory and preserves all previous outputs. Existing generation-assigned report IDs are retained; otherwise IDs are derived from audio identity,
so they stay stable across filters and ordering. This command does not modify `reports/json/`,
`reports/markdown/`, or the historical benchmark score ledger. Mount or import a selected run
explicitly into the Bench workspace when needed. Generated runs and provider settings remain
private and ignored by Git.
