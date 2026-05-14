# Algophony Glossary

## Algophony

The algorithmic layer of the soundscape: sonic environments generated, simulated, transformed, classified, reconstructed, or hallucinated by computational systems. Algophony extends the established soundscape source taxonomy (geophony, biophony, anthrophony, technophony) by identifying computation as a distinct mediating force that does not merely reproduce but constructs sonic worlds.

## Algorithmic Soundscape

A sonic environment whose sources, spatial logic, temporal behavior, ecological plausibility, or cultural framing are mediated by computational processes. This includes text-to-soundscape generations, procedural audio compositions, classifier-mediated reconstructions, and any soundscape that has been substantially shaped by an algorithm rather than by direct physical recording.

## Agentic Listening

A structured mode of listening performed by an AI agent operating under the AKOÚŌ framework. Agentic listening separates observations by epistemic status (heard, measured, inferred, interpreted, speculative, undetermined) and produces reports that distinguish what is present in the audio from what is projected, assumed, or unknown. See the [AKOÚŌ project](https://github.com/sonicfieldlabs/akouo) for the full framework.

## False Ecology

A generated soundscape that presents itself as ecologically coherent but contains source combinations, temporal behaviors, or habitat relationships that could not plausibly coexist in any real environment. False ecology is not the same as intentional fiction (see *Impossible Ecology*). It occurs when a model generates an ecologically implausible scene without acknowledging the implausibility.

## False Field Recording

A generated soundscape that mimics the aesthetic conventions of field recording — naturalistic reverberation, ambient noise floor, absence of music — without being a recording of an actual place. False field recordings are a specific concern in Algophony because they can be mistaken for documentary evidence.

## Generic Naturalism

The tendency of generative audio models to produce "nature" as a standardized combination of birds, water, and wind, regardless of the specific biome, season, time of day, or geographic location described in the prompt. Generic naturalism erases ecological specificity and treats diverse environments as interchangeable sonic textures.

## Regenerative Prompting

The practice of revising a text-to-soundscape prompt based on analysis of a previous generation. After a listening report identifies specific failures (missing sources, false sources, ecological implausibility, cultural cliché), the prompt is refined and the soundscape is regenerated. Regenerative prompting creates a feedback loop between generation and evaluation.

## Recursive Listening

A listening protocol in which a soundscape is analyzed multiple times through different listening modes (signal inspection, ecological, affective, forensic, political, symbolic) to expose how interpretation changes with frame. In Algophony, recursive listening reveals which aspects of a generated soundscape are stable acoustic properties and which are artifacts of the listening perspective.

## Soundscape-to-Text

The reverse pipeline of text-to-soundscape generation: producing structured textual descriptions, listening reports, or metadata from a sonic environment. In Algophony, soundscape-to-text includes automated audio captioning, AKOÚŌ listening reports, classifier tag outputs, and human annotations.

## Text-to-Soundscape

The generation of a sonic environment from a natural-language description. Unlike text-to-audio (which may produce isolated sounds, music, or speech), text-to-soundscape specifically targets multi-source, spatially structured, temporally evolving environments. The quality of text-to-soundscape generation is evaluated not only by audio fidelity but by ecological plausibility, spatial coherence, and cultural specificity.

## World-Construction

The thesis that generative audio models do not merely produce sounds but produce assumptions about worlds: what a forest is, what a city is, what "nature" sounds like, what counts as background, what counts as presence, what gets erased, and what is made audible. Every generated soundscape is a document of the world-model encoded in training data, model architecture, and prompt interpretation.

## Source Adherence

A benchmark metric measuring whether the sources requested in a prompt are present in the generated output. Source adherence includes both positive adherence (expected sources are present) and negative adherence (forbidden sources are absent).

## Negative Adherence

A benchmark metric measuring whether sources explicitly forbidden in a prompt are absent from the generated output. Negative adherence is a critical test for models that tend to add default environmental sounds (birds, water, traffic) regardless of prompt constraints.

## Cultural Cliché Index

A diagnostic score (0–5) measuring the degree to which a generated soundscape reproduces stereotyped, touristic, cinematic, or culturally flattening sonic representations. A score of 0 indicates no obvious cliché. A score of 5 indicates strong stereotyped or culturally reductive construction.
