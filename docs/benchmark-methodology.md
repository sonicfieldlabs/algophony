# Benchmark Methodology

**Status:** Draft — to be finalized during Phase 4.

## Purpose

The Algophony Benchmark Lite v0.1 evaluates algorithmic soundscapes across four levels of analysis, moving from surface compliance to critical interpretation.

## Evaluation Levels

### Level 1: Prompt Adherence

Measures whether the generated soundscape follows the text prompt.

- Are expected sources present?
- Are forbidden sources absent?
- Does the temporal sequence match?
- Does the scale match?
- Does the mood/style match without becoming cliché?

**Axes:** source_adherence, negative_adherence, temporal_adherence, scale_adherence, mood_style_adherence

### Level 2: Acoustic and Spatial Coherence

Measures whether the soundscape is spatially and temporally believable.

- Do sources occupy plausible positions?
- Is there foreground/midground/background layering?
- Does reverberation match the environment?
- Do moving sources behave believably?
- Is event density balanced?
- Can it loop?

**Axes:** spatial_coherence, depth_layering, reverb_logic, motion_logic, density_balance, loopability

### Level 3: Ecological and Causal Plausibility

Measures whether the soundscape represents a coherent environment.

- Could these sources coexist?
- Do events imply believable causes?
- Are biophonic, geophonic, anthropophonic, and technophonic elements plausible for the described environment?

**Axes:** ecological_plausibility, causal_coherence, biophonic_logic, geophonic_logic, anthropophonic_logic, technophonic_logic

### Level 4: Critical Listening and False Ecology

Measures whether the soundscape reproduces stereotypes or unexamined assumptions.

- Does the model reproduce clichés?
- Are there phantom sources?
- Does it equate nature with generic birds/water/wind?
- Does it impose Western, cinematic, tourist, or stock-library assumptions?

**Axes:** stereotype_index, false_source_index, generic_naturalism_index, cultural_cliche_index, documentary_ambiguity, listening_multiplicity

## Scoring Rubric

### Scale Convention

- **1–5 scales:** Higher means better quality or stronger adherence.
- **0–5 scales:** Used for risk/failure indices. Higher means more problematic.

### Core Metrics

| Metric | Type | Range |
| --- | --- | --- |
| Prompt adherence | Human + agent | 1–5 |
| Source accuracy | Human + classifier | 1–5 |
| Spatial coherence | Human + AKOÚŌ | 1–5 |
| Event density | Human + feature analysis | 1–5 |
| Ecological plausibility | Human + AKOÚŌ | 1–5 |
| Causal coherence | Human | 1–5 |
| False-source index | Human + agent | 0–5 |
| Generic naturalism index | Human | 0–5 |
| Cultural cliché index | Human | 0–5 |
| Loopability | Human + signal inspection | 1–5 |
| Regeneration potential | Agent | keep/revise/reject |

## Claim Taxonomy

All listening reports must use the AKOÚŌ claim taxonomy:
`heard`, `measured`, `inferred`, `interpreted`, `speculative`, `undetermined`.

## Comparison Design

The benchmark compares at least 3 generation modes across a shared prompt subset. Results are presented as:

- Per-model average scores across all axes.
- Per-category breakdowns showing model strengths and weaknesses.
- Per-prompt detail views for case-level analysis.
- CSV, JSONL, and Markdown table exports.
