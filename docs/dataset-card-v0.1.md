# Dataset Card: Algophony v0.1

**Status:** Release candidate — v0.1.0

## Dataset Summary

Algophony v0.1 is a research dataset for evaluating text-to-soundscape generation systems. It contains 100 structured prompts across 10 categories, generation metadata for 200 generated audio files from 2 procedural baseline models, 200 agent-reviewed listening reports with AKOÚŌ claim taxonomy, and benchmark scores comparing generation backends on 10 evaluation axes.

## Languages

Prompts are in English.

## Dataset Structure

### Prompts
- **File:** `atlas/prompts/algophony-atlas-v0.1.jsonl`
- **Format:** JSONL, one prompt per line.
- **Schema:** `schemas/prompt.schema.json`
- **Count:** 100 prompts, 10 per category.

### Generation Metadata
- **File:** `generations/metadata/generations-v0.1.jsonl`
- **Format:** JSONL, one generation record per line.
- **Schema:** `schemas/generation.schema.json`
- **Count:** 200 records (100 per model).

### Audio Analysis
- **File:** `generations/metadata/audio-analysis-v0.1.jsonl`
- **Format:** JSONL, 13 features per audio file.
- **Count:** 200 records.

### Listening Reports
- **Files:** `reports/json/AK-*.json` and `reports/markdown/AK-*.md`
- **Schema:** `schemas/listening-report.schema.json`
- **Count:** 200 reports (AK-0001 through AK-0200).

### Benchmark Scores
- **File:** `benchmark/scores/scores-v0.1.jsonl`
- **Schema:** `schemas/score.schema.json`
- **Count:** 200 score records.
- **Suite:** `benchmark/suites/algophony-benchmark-lite-v0.1.json`
- **Exports:** CSV, Markdown, JSON in `benchmark/exports/`

## Dataset Creation

### Curation Rationale

The dataset was created to evaluate algorithmic soundscapes beyond standard audio quality metrics, specifically testing ecological plausibility, cultural specificity, spatial coherence, and prompt adherence.

### Source Data

Prompts are original compositions written for this benchmark. Generated audio is produced by procedural synthesis systems (no samples from copyrighted sources).

### Generation Models

| Model | Type | Synthesis | License | Status |
| --- | --- | --- | --- | --- |
| Synthetic Baseline | Procedural | Additive + noise | MIT | ✓ Active |
| Spectral FM Baseline | Procedural | FM + granular | MIT | ✓ Active |
| ElevenLabs Sound Effects | ML Model | Neural | Commercial API | Pending |

### Annotations

Listening reports produced by automated agent analysis using the AKOÚŌ agentic listening framework. Each report uses the claim taxonomy: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.

### Audio Features Extracted

Duration, sample rate, RMS, peak level, spectral centroid, spectral bandwidth, spectral flatness, zero crossing rate, silence ratio, onset count, event density, loop boundary discontinuity.

## Considerations

### Social Impact

Generated soundscapes may reproduce cultural stereotypes, ecological oversimplifications, or Western-centric assumptions about non-Western environments. The benchmark is designed to make these biases visible, not to amplify them.

### Biases

- Prompt categories reflect a specific research perspective. Other valid categories exist.
- English-language prompts may bias generation toward Anglophone cultural associations.
- Current models are procedural baselines — scores will change significantly with ML models.

### Limitations

- The v0.1 dataset is a pilot. 100 prompts and 200 reports establish methodology, not comprehensive coverage.
- Audio files are generated, not recorded. They should not be treated as documentary evidence.
- Agent-generated reports measure signal-level features only. Human listening reports are needed for source identification, ecological assessment, and cultural analysis.
- Procedural baselines intentionally score low on source accuracy and ecological plausibility.

### Missing Data

- No human listening reports yet (all agent-generated).
- No ML-model generations (ElevenLabs API access pending).
- No field-recording reference comparisons.

### Licensing

- Prompts, metadata, schemas, reports: MIT License.
- Generated audio: MIT (procedural synthesis with no external samples).
- Listening reports: MIT License.

## Citation

To be provided upon public release.
