# Contributor Guide

## How to Contribute to Algophony

Algophony welcomes contributions in four areas: prompts, listening annotations, model outputs, and benchmark score corrections.

## Prompt Submissions

Submit new text-to-soundscape prompts that test specific evaluation criteria.

### Requirements

- Prompt must conform to `schemas/prompt.schema.json`.
- Prompt must describe a soundscape, not a song or isolated sound.
- Prompt must include at least one evaluable source expectation.
- Prompt must include at least one possible failure condition.
- Avoid overly poetic ambiguity when the benchmark needs measurable criteria.
- Do not ask models to imitate living artists or copyrighted recordings.
- Include spatial scale and time of day where relevant.

### Process

1. Fork the repository.
2. Add your prompt to a new JSONL file or propose additions to the atlas.
3. Run `python scripts/validate_dataset.py` to confirm validity.
4. Submit a pull request using the prompt submission issue template.

## Listening Annotations

Submit AKOÚŌ × Algophony Listening Reports for generated soundscapes.

### Requirements

- Report must conform to `schemas/listening-report.schema.json`.
- Report must preserve claim taxonomy: `heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.
- Report must link to valid `prompt_id` and `audio_id`.
- Do not identify species, cultures, or locations without evidence.
- Do not treat generated audio as documentary evidence.

### Process

1. Select an unreported generation from `generations/metadata/generations-v0.1.jsonl`.
2. Listen to the audio file.
3. Write the report in Markdown and JSON.
4. Run validation.
5. Submit via pull request.

## Model Output Submissions

Submit generated audio files and metadata from new generation backends.

### Requirements

- Every audio file must have a corresponding metadata record.
- Metadata must conform to `schemas/generation.schema.json`.
- Include `sha256` hash for the audio file.
- Include explicit `license_status`.
- Do not submit audio files directly to git. Provide download links or storage references.

## Benchmark Score Corrections

Submit corrections to benchmark scores with justification.

### Requirements

- Reference the specific `audio_id`, `report_id`, and axis being corrected.
- Provide a clear justification for the correction.
- Proposed scores must be within the valid range for the axis.

## Code of Conduct

- Do not fabricate bibliographic details or provenance.
- Do not submit private recordings, unlicensed audio, or personal data.
- Respect the epistemic discipline of the claim taxonomy.
- Engage with the research goals in good faith.
