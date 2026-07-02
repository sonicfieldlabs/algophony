# Algophony Glossary

## Algophonya

The algorithmic soundscape and the pluriversal field it opens: the condition in which computational systems take part in making, hearing, classifying, and judging sound across many worlds that need not become one.

## Algophony Framework

The Sonic Field Labs evaluation layer for Algophonya: Atlas prompts, generation metadata, AKOÚŌ-style listening reports, scoring axes, dashboard views, and release machinery for studying algorithmic soundscapes.

## Algophonic Condition

The situation named by *Algophonya framework*: algorithmic systems take part in making, hearing, classifying, and judging sound. This term is retained for continuity, but new project text should prefer **Algophonya** for the condition and **Algophony Framework** for the software.

## Artificial Audio Intelligence (AAI)

The combined capacity of machine systems to generate speech, music, and soundscapes and to hear, transcribe, classify, and decode sound at scale. AAI gives the machine both a mouth and an ear; the framework's premise is that both are political.

## Algorithmic Soundscape

A sonic environment whose sources, spatial logic, temporal behavior, ecological plausibility, or cultural framing are mediated by computational processes. This includes text-to-soundscape generations, procedural audio compositions, classifier-mediated reconstructions, and any soundscape that has been substantially shaped by an algorithm rather than by direct physical recording.

## Acousmatic Contract

The recognition that sound was never innocent of fabrication: a coconut becomes a galloping horse, a studio becomes a forest, a synthetic voice becomes intimacy or testimony. Under the acousmatic contract, every sound in the computer carries a version of reality that may be real, false, partial, simulated, weaponized, healing, or unknown — which is why provenance and disclosure are listening questions, not only legal ones.

## Middle Matter

The framework's description of sound as simultaneously material and immaterial: signal and sensation, pressure and imagination, trace and event. Generative audio is powerful because, as middle matter, it does not represent reality; it produces the conditions for reality to be believed, felt, remembered, obeyed, doubted, or shared.

## Agentic Listening

A structured mode of listening performed by an AI agent operating under the AKOÚŌ framework. Agentic listening separates observations by epistemic status (heard, measured, inferred, interpreted, speculative, undetermined) and produces reports that distinguish what is present in the audio from what is projected, assumed, or unknown. See the [AKOÚŌ project](https://github.com/sonicfieldlabs/akouo) for the full framework.

## Evidence Ladder

The AKOÚŌ v0.5 contract that grades the evidence available to a listening pass: none, prompt only, metadata only, decoded audio metadata, measured signal, transcript or caption, contextual note, or mixed. The evidence level determines claim permissions, so that the strength of claims can never exceed the strength of evidence.

## Claim Permissions

The set of claim categories a listening pass is allowed to emit, derived from its evidence level. A pass that has only seen a prompt may not produce `heard` or `measured` claims about audio content; every pass must include meaningful `undetermined` claims when evidence is missing.

## Routing Plan

The AKOÚŌ v0.5 handoff artifact produced before listening: object, input type, evidence level, route confidence, a weighted mode chain (primary, secondary, corrective, optional, deferred), claim permissions, forbidden assumptions, a recommended command, and stop conditions. When stop conditions are unmet, the correct move is to stop or gather evidence, not to listen to imagined input.

## Reference Layer

The AKOÚŌ skill that turns a listening result into a conceptual map: concepts triggered, sonic methodologies, authors or traditions, possible research routes, research questions, cautions, and adjacent modes. In Algophony, reference maps connect benchmark reports to research literature without letting citation replace listening.

## Earworm

The project-agnostic persistence protocol for agentic signal chains. Earworm pairs the signal chain with a context chain: sessions, append-only events, asset references, provenance records, signal packets, context bundles, retention policies, analysis, user edits, agent actions, modulation, and render history.

## Akousmata

The Listening Stack memory-operations surface over Earworm chains: remember, list, search, similarity, export, and forget. In Algophony, Akousmata operations are represented through optional `earworm_trace` records rather than by importing the Earworm runtime.

## Earworm Trace

An optional compact bridge record on Algophony generations and reports. It points to a retained or planned Earworm session, event chain, assets, provenance, signal packets, context bundles, and retention policy, allowing future agents to reconstruct the route without publishing private raw session data.

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

## Homogenization Index

A proposed diagnostic score (0–5) measuring the degree to which a generated output averages distinct ecologies, accents, voices, or places into a default rendering. Homogenization differs from cliché: a cliché is a wrong specific, homogenization is the erasure of the specific. The framework's formulation: homogenization is an old project with a new codec.

## Disclosure Integrity

A proposed diagnostic score (1–5) measuring how completely a generation discloses its synthetic origin: generator, operator, model version, and intended use. It operationalizes the right to know whether what we hear was generated, by whom, and for what.

## Voice Consent Risk

A proposed diagnostic score (0–5) measuring the risk attached to voice-like material whose provenance or consent status cannot be verified. The voice is biometric: it carries the body that made it. Algophony records consent for human voices and provenance for synthetic ones, and treats unverifiable voice material as a risk, not a neutral asset.

## Compute Provenance

Generation metadata recording the material footprint of a run: whether it executed locally or through a cloud API or hosted endpoint, on what hardware, in what region, with any available energy notes. It operationalizes the framework's planetary claim that every generated sound has a body somewhere: electricity, water, lithium, heat, labor.

## Capture

The condition of audio systems whose weights, terms, training data, or outputs are controlled by states, corporations, platforms, or markets and cannot be independently inspected, pinned, or reproduced. The opposite pole of capture is local, open operation. Algophony reports capture conditions alongside benchmark scores because a number earned inside a closed API and a number earned by an inspectable local model do not mean the same thing.

## Rights of the Audible

The rights named by *Algophonya framework*: voice, silence, opacity, accent and listening difference, disclosure, consent/refusal/revocation/credit/payment, community protocols, contestability, redress, and the right to remake the tools.

## Planetary Ear

Listening extended through sensors, archives, models, and data centers to places no unaided ear can reach: oceans, rainforests, border zones, server farms, the electromagnetic field. The planetary ear makes the sonosphere more graspable and more mediated at once, and ties every act of machine listening and generation to planetary infrastructure.
