# Reports

AKOÚŌ × Algophony Listening Reports for generated soundscapes.

## Structure

```text
reports/
  README.md       # This file
  markdown/       # Human-readable report files (AK-0001.md, etc.)
  json/           # Machine-readable report files (AK-0001.json, etc.)
```

## Report Format

Each report exists in both Markdown and JSON. The JSON version validates against `schemas/listening-report.schema.json`.

## Report Sections

1. Basic description.
2. Detected / inferred sound sources.
3. Foreground, midground, background structure.
4. Spatial and reverberant logic.
5. Temporal behavior and event density.
6. Ecological plausibility.
7. Causal coherence.
8. Cultural and genre assumptions.
9. False sources / hallucinated elements.
10. Comparison with prompt.
11. Suggested prompt revision.
12. Regeneration recommendation.
13. Benchmark scores.

## Claim Taxonomy

All reports must use the AKOÚŌ claim taxonomy:

- **heard**: Directly present in the audio.
- **measured**: Produced by signal or metadata inspection.
- **inferred**: Plausible logical deductions.
- **interpreted**: Cultural, theoretical, or contextual reading.
- **speculative**: Fictional, symbolic, or possible-world reading.
- **undetermined**: What cannot be responsibly claimed.

## ID Convention

Report IDs follow the pattern `AK-{number}`, e.g., `AK-0001`.
