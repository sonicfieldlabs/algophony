# Prompt Card Schema

## Attributes

| Attribute | Type | Required | Description |
|---|---|---|---|
| category | string | Yes | Main sound category (Footsteps, Water, Ambience, etc.) |
| subcategory | string | No | Sub-classification within category |
| sourceObject | string | No | Physical object producing the sound |
| action | string | No | What the object is doing |
| material | string | No | Material composition (metal, wood, glass, etc.) |
| surface | string | No | Surface the sound occurs on |
| environment | string | No | Location/setting |
| acousticSpace | string | No | Reverb character (tight, medium, large, open) |
| perspective | string | No | Mic position (close, medium, far, overhead) |
| distance | string | No | Distance descriptor |
| motion | string | No | Movement pattern |
| rhythm | string | No | Temporal pattern |
| density | string | No | Density of sound events |
| texture | string | No | Textural quality |
| mood | string | No | Emotional character |
| realismLevel | string | No | Realistic, stylized, hyperreal, cartoon, cinematic |
| durationSeconds | number | No | 0.5-30 seconds |
| loop | boolean | Yes | Whether sound should loop |
| promptInfluence | number | Yes | 0.0-1.0, default 0.3 |
| modelId | string | Yes | Always "eleven_text_to_sound_v2" |
| outputFormat | string | No | Audio format |
| exclusions | string[] | Yes | Exclusion constraints |
| useCase | string | No | film, game, ui, trailer, podcast, installation |
| sonicDna | object | No | Sonic DNA profile for consistency |

## Layer Roles
- foreground: Primary sync sounds, hero moments
- background: Ambient beds, room tone
- transient: Short one-shot impacts
- body: Core sustain of a sound
- texture: Surface detail and character
- tail: Decay and reverb tail
- space: Room/environment information
- sweetener: Enhancement and polish layers

## Exclusion Constraints
Common exclusions to append to prompts:
- "no music" — prevent musical elements
- "no dialogue" — prevent speech/voice
- "no reverb" — prevent room ambience
- "no background noise" — isolate the target sound
- "no tonal elements" — prevent pitched/harmonic content
