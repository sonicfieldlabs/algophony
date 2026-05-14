# Generations

This directory contains generated audio files and their metadata.

## Structure

```text
generations/
  README.md              # This file
  metadata/
    generations-v0.1.jsonl   # Generation metadata records
  audio/
    .gitkeep             # Audio files are gitignored
```

## Metadata

Every generated audio file must have a corresponding record in `generations-v0.1.jsonl` that validates against `schemas/generation.schema.json`.

## Audio Storage

Audio files are stored locally in `audio/` but are not committed to git. The `.gitkeep` file ensures the directory exists.

For large-scale generation, configure `ALGOPHONY_AUDIO_STORAGE_DIR` in `.env.local` to point to an alternative storage location.

## Naming Convention

Audio files follow the ID pattern: `ALG-{prompt_number}-{provider}-{variant}.{format}`

Examples:
- `ALG-0001-EL-SFX-A.wav`
- `ALG-0001-SCAPER-A.wav`
- `ALG-0001-AUDIOLDM-A.wav`
