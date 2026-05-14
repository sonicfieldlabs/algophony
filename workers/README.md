# Workers

Generation pipeline, provider adapters, and audio analysis modules.

## Structure

```text
workers/
  README.md        # This file
  pipeline.py      # Orchestration pipeline
  adapters/
    __init__.py
    base.py        # GenerationAdapter abstract base class
    elevenlabs_sfx.py
    scaper.py
    audioldm.py
    audiocraft.py
    stable_audio_open.py
    spatialscaper.py
  analysis/
    __init__.py
    features.py    # Audio feature extraction
    classifiers.py # Classification wrappers
    loopability.py # Loop quality analysis
```

## Adapter Contract

Every adapter must implement the `GenerationAdapter` interface defined in `adapters/base.py`:

- Accept a validated prompt record.
- Accept duration and loop parameters.
- Create or reference an audio file.
- Return structured metadata validating against `schemas/generation.schema.json`.
- Log provider warnings.
- Fail with structured error records.
