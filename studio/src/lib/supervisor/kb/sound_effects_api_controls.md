# Sound Effects API Controls

## Model
- ID: `eleven_text_to_sound_v2`
- This is the only available model for sound effects

## Parameters

### text (required)
The prompt text describing the desired sound effect. Maximum 2000 characters.
- Use clear, physical, material, spatial language
- Include exclusion constraints at the end of the prompt text
- Do not pack too many unrelated events into a single prompt

### duration_seconds (optional)
- Range: 0.5 to 30 seconds
- If null/omitted, the model determines duration automatically

### loop (boolean)
- Default: false
- Set to true for ambience beds, room tones, and repeating patterns

### prompt_influence (float)
- Range: 0.0 to 1.0
- Default: 0.3
- Higher values = closer adherence to prompt text
- Lower values = more creative interpretation
- Recommended: 0.2-0.4 for natural sounds, 0.5-0.8 for precise sync sounds

### output_format (string)
- Default: mp3_44100_128
- Options: mp3_44100_128, pcm_16000, pcm_22050, pcm_24000, pcm_44100

## Response
- Returns audio buffer as binary data
- `character-cost` header indicates API character consumption
- Each live generation consumes the user's own provider account quota/credits. Algophony Studio has no shared generation budget.

## Important Limitations
1. NO native negative prompt support. Exclusions must be appended as natural language to the prompt text.
2. NO native seed/deterministic control. Use Sonic DNA profiles and locked metadata for consistency.
3. Do NOT claim the API supports features it does not have.
4. Complex multi-event prompts may produce poor results. Suggest layer decomposition.

## Prompt Writing Best Practices
- Start with the core sound source and action
- Add material and surface details
- Specify environment and acoustic space
- Include perspective and distance
- Add emotional/mood descriptors
- End with exclusion constraints
- Example: "Heavy metal door slamming shut in a concrete bunker hallway. Close perspective. Realistic. No music, no dialogue, no reverb tail."
