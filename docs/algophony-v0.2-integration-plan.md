# Algophony v0.2 Integration Plan

Status: draft execution plan
Date: 2026-05-23

This document describes the v0.2 integration-plan series, not the public
software release number (see `ROADMAP.md` for release versions).

## Goal

Algophony v0.2 turns the v0.1 atlas/benchmark into a working soundscape studio and listening system. The core loop is:

1. Generate or upload soundscape audio.
2. Analyze signal features.
3. Route the object through AKOÚŌ listening modes.
4. Optionally augment the deterministic report with an LLM listening pass.
5. Preserve provenance, claim taxonomy, scores, and benchmark links.

## Priority 1: Long Soundscape Providers

Required first providers:

- `el_sfx`: ElevenLabs Sound Effects. Best for short, loopable atmospheric beds and sound-design events. Current API limit is 30 seconds per call.
- `stable_audio_3_stability_api`: Stability Stable Audio 3.0. Primary target for long soundscapes, capped locally at 360 seconds.
- `stable_audio_25_stability_api`: Stability Stable Audio 2.5 fallback, capped locally at 190 seconds.

Acceptance:

- Provider status is live, not stale static export data.
- Contract tests verify request shape without using credits.
- Live tests write audio only under `generations/audio/`.
- Every promoted generation has `source_type`, `sha256`, relative `storage_uri`, license/provenance text, and `akouo_report_id`.

## Priority 2: LLM Listening Layer

The LLM layer is disabled by default and runs only in local Studio mode.

Initial backend:

- `codex_cli`: uses the locally authorized Codex CLI to produce a schema-constrained AKOÚŌ listening-mode output from prompt metadata, generation metadata, signal analysis, and the deterministic draft.

Future API backends:

- OpenAI or compatible chat/completions provider for text-only multimodal interpretation from signal features and transcripts.
- Audio-native LLM provider for direct audio listening when available and licensed.

Acceptance:

- LLM output is appended to `akouo_mode_outputs`, not allowed to overwrite measured signal facts.
- Unsupported source, species, place, culture, and documentary claims remain `undetermined`.
- Failures degrade to deterministic reports.

## Priority 3: STT/TTS And Audio-Text Interop

STT is needed when soundscapes include speech-like or vocal material. TTS is secondary and should be treated as a source layer, not as the main soundscape generator.

Needed provider contracts:

- STT: transcript, language confidence, diarization/speaker labels if available, and uncertainty markers.
- TTS: voice ID/model, text, consent/license status, and whether speech is intended foreground or background.
- Text-to-audio: soundscape prompt, duration, loop, seed, forbidden sources, output format.

Acceptance:

- STT transcripts become evidence inputs for reports.
- Transcript claims stay separate from audio-measured claims.
- TTS outputs use `source_type=generated_ml` and explicit voice/license metadata.

## Priority 4: Soundscape Listening Framework

The v0.2 report must distinguish:

- Prompt intent.
- Generated audio evidence.
- Signal measurements.
- Transcript evidence.
- Model/provider metadata.
- Human or LLM interpretation.

Recommended listening chain for generated soundscapes:

1. `signal-inspection-listening`
2. `acoulogical-object-listening`
3. `transductive-media-listening`
4. `ecological-posthuman-listening`
5. `critical-political-listening`
6. `symbolic-fictional-listening` only when the prompt asks for possible-world or impossible ecology reading.

## Priority 5: Local Models

Most important local candidates:

- `stable_audio_open_local`: requires `stable-audio-tools`, PyTorch/torchaudio, accepted model terms, and enough local compute for 47-second generations.
- `audiogen_local`: requires AudioCraft, PyTorch/torchaudio, and accepts shorter 30-second generations.
- `tangoflux_local`: requires TangoFlux package and PyTorch; useful for short prompt-to-audio comparison.
- `moss_sfx_local` or `moss_sfx_mlx`: useful for local sound effects; MOSS MLX requires macOS arm64 and explicit model/script paths.

Acceptance:

- Local providers remain lazy-loaded.
- Provider status explains missing packages or paths without importing heavy model libraries.
- Local generation tests start with one short prompt and one variant before benchmark runs.
