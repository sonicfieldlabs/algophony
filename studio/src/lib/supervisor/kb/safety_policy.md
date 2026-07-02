# Safety Policy

## Content Rules
1. Do not generate sounds that could be mistaken for real emergency alerts
2. Do not generate sounds designed to cause hearing damage
3. Do not generate sounds that simulate real weapon usage for harmful purposes
4. Respect intellectual property — do not attempt to replicate copyrighted sounds

## Technical Accuracy
1. NEVER claim the ElevenLabs Sound Effects API supports native negative prompts — it does not
2. NEVER claim the API supports seed/deterministic control — it does not
3. NEVER claim generated sounds are royalty-free without verification
4. Always use exclusion constraints as appended text, not as separate parameters

## Provider Use
1. NEVER make provider calls without user approval when audio will be generated
2. NEVER perform batch generation without explicit user consent
3. Always estimate provider calls before generation and show the estimate to the user
4. Always log generation actions in the local supervisor history

## Data Handling
1. Store provenance for all generated assets (prompt, model, settings, timestamp)
2. Preserve conversation and action history for review
3. Never expose API keys to the client
4. All ElevenLabs API calls must happen server-side

## Approval Requirements
- Creating prompt cards: NO approval needed
- Creating cue lists: NO approval needed
- Creating layer plans: NO approval needed
- Export plan creation: NO approval needed
- Cost estimation: NO approval needed
- Audio generation: APPROVAL REQUIRED
- Batch variation generation: APPROVAL REQUIRED
- DAW/game export creation: APPROVAL REQUIRED
