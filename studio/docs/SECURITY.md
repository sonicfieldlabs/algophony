# Algophony Studio Security Notes

Algophony Studio is a local-first app. Security work should focus on local files, provider keys, imported media, generated or derived media, agent configuration, and export safety.

## Bring-Your-Own Providers

- Users bring their own ElevenLabs key for generation, speech, music, isolation, and related provider calls.
- Users bring their own Gemini key for image-to-sound analysis if they enable that feature.
- Users configure their own ElevenLabs Agent and any LLM/model used by that agent. No agent or LLM credential is bundled in this repo.
- ElevenLabs keys should be entered in `Settings -> Providers`.
- The app stores the local ElevenLabs key in `.algophony-studio/provider-settings.json` and writes restrictive file permissions where supported.
- `ELEVENLABS_API_KEY` and `GEMINI_API_KEY` can be used for local development.
- Logs must never print provider keys, request headers, generated signed URLs, agent IDs paired with secrets, or webhook secrets.

## Local Project Data

`.algophony-studio/` can contain local paths, prompts, tags, generated audio, derived audio, metadata, cache data and provider settings. It is local workspace state, separate from default exports unless the user explicitly exports a research bundle.

## Import Safety

Local folder indexing should treat audio and metadata as untrusted input:

- parse structured metadata with real parsers;
- cap file size and row counts for previews;
- avoid executing sidecar content;
- keep absolute path exposure out of shared exports unless explicitly requested.

## Incident Response

If a provider key is suspected compromised, revoke it in the provider dashboard, clear it from `Settings -> Providers`, remove any affected env vars, add a replacement key and audit recent generated files/provenance records.
