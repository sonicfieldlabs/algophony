# Algophony Studio — Master Document

## Overview

Algophony Studio is a local-first sound ideas workspace for organizing, multiplying, stacking, comparing, and exporting sonic material. It can call ElevenLabs and other model providers only when the user configures their own keys.

## Core Concepts

### Prompt Cards
The atomic unit of Algophony Studio. Each prompt card contains:
- Title, category, subcategory
- Structured attributes: source object, action, material, surface, environment, acoustic space, perspective, distance, motion, rhythm, density, texture, mood, realism level
- Technical settings: duration (0.5-30s), loop flag, prompt influence (0-1), model ID, output format
- Exclusion constraints (appended to prompt text, NOT native negative prompts)
- Sonic DNA profile reference (optional)
- Generated prompt text (composed from attributes)
- Critic score and report

### Categories
Footsteps, Water, Electricity, Creature, Animal, Vehicle, Ambience, Door, Weapon, Booms, Fire, Air, Bell, Alarm, Machinery, Magic, Robot, Sci-fi, Weather, Horror, Impact, UI, Boat, Aircraft, Foley

### Optional Sound Effects API
- Model: eleven_text_to_sound_v2
- Parameters: text, duration_seconds (0.5-30), loop, prompt_influence (0-1), output_format
- Returns: audio buffer + character_cost header
- NO native negative prompt support — exclusions are appended as text
- NO native seed control — use Sonic DNA profiles for consistency

### Projects
Group local sounds, prompt cards, stacks, variants, generated audio, and exports by project. Each project has:
- Name, medium (film/game/ui/trailer/podcast/installation/social_video)
- Sonic brief (JSONB)
- Default settings

### Generated or Derived Assets
Each provider call or stack render should create a provenance record with:
- Status, request payload, audio path, duration, character cost, provider-call estimate
- Linked to prompt card (optional)

### Provider Calls
- Users bring their own provider keys.
- The app estimates provider calls before generation or analysis.
- Generated, imported, rendered, and external sounds share local provenance.
- Local history records provider actions for review.

## Workspace Tools
1. **Prompt Lab** — Prompt cards, reference prompts, and optional SFX generation
2. **Creature Lab** — Creature vocalizations
3. **Synth** — Synthesizer-style sound design
4. **Listen Mode** — Reference audio analysis (STT + event tagging)
5. **UI Elements** — Interface sounds
6. **Atmosphere Builder** — Layered ambience creation
7. **Stacker** — Multi-layer sound stacking
8. **Foley Room** — Foley sound creation
9. **Human Lab** — Human expression sounds
10. **Variation Lab** — Sound variations and round-robins
11. **Export Center** — Professional export formats

## Export Formats
- CSV, JSON, YAML, Markdown
- Cue sheets with timecodes
- Prompt database
- Sound metadata
- Usage reports
- Agent archives
- DAW folder structures (Foley, Ambience, UI, Creature, Human, Impacts, Transitions, Misc)
- Game audio manifests (Unity, Unreal, FMOD, Wwise, Godot)
