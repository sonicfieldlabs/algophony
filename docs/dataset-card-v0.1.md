# Dataset Card: Algophony v0.1

**Status:** Draft — to be finalized during Phase 4.

## Dataset Summary

Algophony v0.1 is a research dataset for evaluating text-to-soundscape generation systems. It contains 100 structured prompts across 10 categories, generation metadata for 300–500 generated audio files, 50 manually reviewed listening reports, and benchmark scores comparing multiple generation backends.

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
- **Count:** 300–500 records.

### Listening Reports
- **Files:** `reports/json/AK-*.json` and `reports/markdown/AK-*.md`
- **Schema:** `schemas/listening-report.schema.json`
- **Count:** 50 reviewed reports.

### Benchmark Scores
- **File:** `benchmark/scores/scores-v0.1.jsonl`
- **Schema:** `schemas/score.schema.json`

## Dataset Creation

### Curation Rationale

The dataset was created to evaluate algorithmic soundscapes beyond standard audio quality metrics, specifically testing ecological plausibility, cultural specificity, spatial coherence, and prompt adherence.

### Source Data

Prompts are original compositions written for this benchmark. Generated audio is produced by text-to-audio and procedural synthesis systems.

### Generation Models

To be documented per generation mode:

| Model | Provider | Version | License |
| --- | --- | --- | --- |
| ElevenLabs Sound Effects | ElevenLabs | `needs verification` | Commercial API |
| Scaper | Open source | `needs verification` | BSD-3 `needs verification` |
| AudioLDM / AudioCraft | Open source | `needs verification` | Various open licenses |

### Annotations

Listening reports are produced using the AKOÚŌ agentic listening framework and manually reviewed. Each report uses the claim taxonomy: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.

## Considerations

### Social Impact

Generated soundscapes may reproduce cultural stereotypes, ecological oversimplifications, or Western-centric assumptions about non-Western environments. The benchmark is designed to make these biases visible, not to amplify them.

### Biases

- Prompt categories reflect a specific research perspective. Other valid categories exist.
- English-language prompts may bias generation toward Anglophone cultural associations.
- Generation models have their own training data biases.

### Limitations

- The v0.1 dataset is a pilot. 100 prompts and 50 reports are not representative of all possible soundscape evaluation scenarios.
- Audio files are generated, not recorded. They should not be treated as documentary evidence.
- Scores reflect the judgment of specific listeners and agents at a specific time.

### Licensing

- Prompts and metadata: MIT License.
- Generated audio: License depends on the generation provider. See `license_status` in generation metadata.
- Listening reports: MIT License.

## Citation

To be provided upon public release.
