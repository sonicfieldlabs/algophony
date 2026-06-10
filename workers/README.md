# Workers

Generation pipeline, provider registry, adapters, and audio analysis modules.

## Structure

```text
workers/
  provider_registry.py       # Lightweight provider specs and status checks
  pipeline.py                # Orchestration pipeline
  adapters/
    base.py
    elevenlabs_sfx.py
    stable_audio_25_stability.py  # Stability API adapters for Stable Audio 2.5 and 3.0
    stable_audio_25_fal.py
    stable_audio_25_replicate.py
    huggingface_endpoint.py
    audiogen_local.py
    moss_sound_effect_local.py
    moss_sound_effect_mlx.py
    stable_audio_open.py
    tangoflux_local.py
    scaper.py
    spectral_fm.py
    spatialscaper.py
  analysis/
```

## Provider Model

`provider_registry.py` is the source of truth for provider IDs, aliases, runtime type, optional dependencies, required environment variables, model versions, and license/provenance notes.

Heavy local model packages must never be imported at registry import time. Adapters lazy-load optional dependencies only when generation is executed.

## Default Provider Resolution

If `scripts/generate_matrix.py` is run without `--providers`, it uses:

```text
el_sfx,stable_audio_3_stability_api,stable_audio_25_stability_api,stable_audio_25_fal,stable_audio_25_replicate,tangoflux_local,stable_audio_open_local,audiogen_local,moss_sfx_mlx,moss_sfx_local
```

Procedural controls are excluded from default fallback unless `--allow-procedural-fallback` is passed.

## Studio Keys

Place local keys in the ignored root file:

```bash
cp .env.example .env.local
```

Minimum cloud soundscape test keys:

- `ALGOPHONY_ELEVENLABS_API_KEY` for ElevenLabs sound effects, max 30 seconds per generated clip.
- `ALGOPHONY_STABILITY_API_KEY` for Stability Stable Audio 3.0/2.5. Stable Audio 3.0 is registered as `stable_audio_3_stability_api` and is capped at 360 seconds.

Stability requests default to multipart form fields. Set `ALGOPHONY_STABILITY_PAYLOAD_MODE=json` only if a configured endpoint expects JSON.

## LLM Listening

LLM listening augmentation is disabled by default. To test a local authorized Codex CLI pass inside Studio:

```bash
ALGOPHONY_ENABLE_LLM_LISTENING=true
ALGOPHONY_LLM_BACKEND=codex_cli
```

The LLM pass receives prompt metadata, generation metadata, signal analysis, and the deterministic AKOÚŌ draft. It must return a schema-constrained listening-mode output and is appended to `akouo_mode_outputs`.

## Metadata Safety

New model outputs go to:

```text
generations/metadata/incoming-generations-v0.1.jsonl
```

Canonical benchmark metadata is changed only with explicit promotion. Generated outputs are not benchmark-valid until reports and scores exist.

## Adapter Contract

Every adapter must:

- Accept a validated prompt record.
- Accept duration, variant, loop, seed, and provider parameters.
- Create an audio file under `generations/audio/`.
- Return structured metadata with relative `storage_uri`, concrete `model_version`, `sha256`, and `license_status`.
- Fail with `GenerationError`, not raw stack traces, for recoverable provider/config/model failures.

## Optional Installs

```bash
python3 -m pip install -r requirements-cloud.txt
python3 -m pip install -r requirements-local-audio.txt
python3 -m pip install -r requirements-local-macos-mlx.txt
```
