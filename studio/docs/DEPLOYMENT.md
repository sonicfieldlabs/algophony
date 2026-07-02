# Algophony Studio Local Runbook

Algophony Studio is a local-first app that stores project state on the user's machine and uses provider keys configured by the user. The public repository is intended for people to download and run locally; it does not require deployment.

## Local Preview

```bash
npm install
npm run dev:daemon
```

Open `http://localhost:3001` or `http://127.0.0.1:3001`.

Stop the preview with:

```bash
npm run dev:stop
```

For foreground development, use:

```bash
npm run dev:local
```

Foreground development uses the local URL printed by Next.js, usually
`http://localhost:3000`. Studio runs as a local workspace in either mode.

## Local Workspace

The app writes local project state under `.algophony-studio/` in the workspace root, or under `ALGOPHONY_STUDIO_WORKSPACE_ROOT` when that environment variable is set.

```text
.algophony-studio/
  workspace.json
  provider-settings.json
  local-db.json
  library.json
  storage/
  cache/
  exports/
```

`.algophony-studio/` can contain local metadata, paths, generated material and provider settings.

## Provider Keys

Users should add their own ElevenLabs key in `Settings -> Providers` only if they want live provider calls. The `ELEVENLABS_API_KEY` environment variable is available for local development.

Image-to-sound model calls require the user's own `GEMINI_API_KEY`. The optional supervisor agent must be created and configured by the user in their own ElevenLabs dashboard, including any LLM/model choice for that agent.

The local-first app does not include shared provider keys, agent IDs tied to private workspaces, LLM credentials, webhook secrets, or service credentials.

## Verification

Run the local checks before sharing changes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
