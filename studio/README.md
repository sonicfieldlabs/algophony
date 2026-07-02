# Algophony Studio

Open-source tools for sound ideas, library organization, stacking, tagging, multiplication, comparison, and listening research.

Algophony Studio is the local-first sound workspace inside the Algophony system. It was imported into this repository from the former local sound workspace app and renamed as Algophony Studio so it can sit next to the Framework and Bench Dashboard.

Studio is for working with sonic libraries as material: existing folders of sounds, references, prompt cards, metadata, stacks, tags, listening notes, variants, DAW handoff folders, and exportable datasets. It is a local research and design workspace that can use AI models only when the user brings their own provider keys.

Framework records remain the benchmark source of truth. Studio can prepare,
organize, generate, compare, and export sonic material, but any promotion into
Algophony benchmark data must still produce schema-valid records and pass the
repository validators.

## What It Is For

- Indexing local sound folders and keeping files on your machine.
- Turning filenames, folder structure, tags, sidecars, and notes into promptable metadata.
- Building cue stacks from imported, generated, rendered, or external sounds.
- Organizing sonic ideas into prompt cards, tags, layer roles, comparisons, and export sets.
- Multiplying a reference into variants, round robins, stack layers, DAW handoff folders, and dataset rows.
- Listening, annotating, comparing, and preparing reusable sonic knowledge.
- Calling third-party generation or analysis providers only when you configure your own keys.

The emphasis is local organization and sonic multiplication, with optional model calls controlled by the user.

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev:daemon
```

Open [http://localhost:3001](http://localhost:3001) or
[http://127.0.0.1:3001](http://127.0.0.1:3001).

Stop the daemon with:

```bash
npm run dev:stop
```

Studio runs as a local workspace. There is no public deployment requirement in
this repository.

For foreground development, use `npm run dev:local` and open the URL printed by
Next.js, usually `http://localhost:3000`.

## Local Workspace Model

The target local project layout is:

```text
.algophony-studio/
  local-db.json
  workspace.json
  provider-settings.json
  library.json
  storage/
    algophony-studio-sounds/
  cache/
    waveforms/
    analysis/
  exports/
```

External sound folders are referenced in place by default. The current bridge can index a folder from `Settings -> Workspace` or `Library -> Local`, store file references and extracted metadata in `.algophony-studio/library.json`, and create prompt candidates from filenames, sidecar JSON, CSV/TSV metadata, notes, and audio headers.

## Supported Sound Material

Algophony Studio aims for broad audio-library compatibility:

- Audio: WAV/BWF, FLAC, AIFF/AIF, MP3, M4A, AAC, OGG, CAF, WebM, MP4 audio.
- Metadata: embedded tags, BWF/iXML, ID3, Vorbis comments, sidecar JSON, CSV, TSV.
- Creative tooling: Reaper `.rpp` projects, cue sheets, DAW handoff folders, Wwise/FMOD/Unity/Unreal manifests.
- Research exports: JSON, JSONL, CSV, Markdown, YAML, dataset folders, benchmark reports, prompt-pair datasets.

## Bring Your Own Keys

Algophony Studio does not ship with ElevenLabs, Gemini, LLM, or agent credentials.

- ElevenLabs generation, speech, audio isolation, music, and agent features require the user's own ElevenLabs account and API key.
- Image-to-sound analysis requires the user's own Gemini API key if they want live model calls.
- The optional supervisor agent must be created and configured by the user in their own ElevenLabs dashboard. Any LLM/model used by that agent is also user-configured.
- Local organization, tagging, stacking, browsing, prompt-card work, and exports can run without provider keys.

The local provider settings panel writes `.algophony-studio/provider-settings.json`; `.algophony-studio/` is ignored by git. Env-key support is available for local development.

## Relationship to Bench

- Studio is the working environment for local sound material and provider-key-controlled generation.
- Bench is the audit environment for framework records, report provenance, provider status, and score state.
- Shared language and design should stay aligned, but the data contracts remain separate until a Studio export is deliberately promoted into the framework.
- Do not use Studio-generated or imported material as benchmark evidence until it has generation metadata, provenance, listening reports, and validation.

## Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
