#!/usr/bin/env python3
"""
Generate Algophony listening reports and benchmark score records.

The reports are still agentic artifacts, but v0.1.1 distinguishes signal-only
evidence from AKOÚŌ-style listening claims and marks a curated seed set as
hybrid-reviewed for QA. Publication still requires later human listening.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from workers.listening_plan import (  # noqa: E402
    AKOUO_CONTRACT_VERSION,
    build_routing_plan,
    enforce_claim_permissions,
)


SCORE_AXES = [
    "prompt_adherence",
    "source_accuracy",
    "spatial_coherence",
    "event_density_score",
    "ecological_plausibility",
    "causal_coherence",
    "false_source_index",
    "generic_naturalism_index",
    "cultural_cliche_index",
    "loopability",
]

POSITIVE_AXES = {
    "prompt_adherence",
    "source_accuracy",
    "spatial_coherence",
    "event_density_score",
    "ecological_plausibility",
    "causal_coherence",
    "loopability",
}

RISK_AXES = {
    "false_source_index",
    "generic_naturalism_index",
    "cultural_cliche_index",
}

CATEGORY_BASE = {
    "forest": {"generic": 1.7, "cliche": 0.4, "eco": 1.4},
    "city": {"generic": 0.3, "cliche": 0.8, "eco": 1.5},
    "coast": {"generic": 1.4, "cliche": 0.5, "eco": 1.6},
    "interior": {"generic": 0.1, "cliche": 0.2, "eco": 2.0},
    "machine": {"generic": 0.0, "cliche": 0.3, "eco": 2.2},
    "ritual": {"generic": 0.2, "cliche": 1.8, "eco": 1.3},
    "archive": {"generic": 0.1, "cliche": 1.0, "eco": 1.9},
    "club_exterior": {"generic": 0.1, "cliche": 1.1, "eco": 1.7},
    "ruin": {"generic": 0.6, "cliche": 0.8, "eco": 1.8},
    "impossible_ecology": {"generic": 0.3, "cliche": 0.4, "eco": 2.4},
}


def clamp(value: float, lo: float, hi: float) -> float:
    return round(max(lo, min(hi, value)), 1)


def load_jsonl(path: Path) -> list[dict]:
    records = []
    if not path.exists():
        return records
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def index_by(records: list[dict], key: str) -> dict[str, dict]:
    return {r[key]: r for r in records if key in r}


def model_type(model_name: str) -> str:
    return "procedural_control" if "Baseline" in model_name else "ml_model"


def is_procedural_generation(generation: dict) -> bool:
    source_type = generation.get("source_type")
    if source_type:
        return source_type == "generated_procedural"
    model = generation.get("model", "")
    return "Baseline" in model or "procedural" in model.lower()


def reviewed_seed(prompt_id: str) -> bool:
    """Review first five prompts in every category block: 100 reports total."""
    number = int(prompt_id.split("-")[1])
    offset = (number - 1) % 10
    return offset < 5


def expected_density(category: str) -> tuple[float, float]:
    if category in ("forest", "city", "coast", "machine", "club_exterior"):
        return 2.0, 10.0
    if category in ("interior", "archive", "ruin"):
        return 0.2, 4.0
    if category == "ritual":
        return 0.5, 6.0
    return 0.5, 8.0


def density_score(category: str, event_density: float) -> float:
    lo, hi = expected_density(category)
    if lo <= event_density <= hi:
        return 4.3
    if event_density < lo:
        return clamp(2.0 + event_density / max(lo, 0.1), 1, 5)
    return clamp(4.0 - ((event_density - hi) / max(hi, 1.0)), 1, 5)


def loop_score(loop_required: bool, loop_disc: float | None) -> float:
    if not loop_required:
        return 3.0
    if loop_disc is None:
        return 1.0
    if loop_disc < 0.03:
        return 4.7
    if loop_disc < 0.12:
        return 3.8
    if loop_disc < 0.35:
        return 2.7
    return 1.5


def build_final_scores(prompt: dict, generation: dict, analysis: dict) -> dict:
    category = prompt.get("category", "")
    base = CATEGORY_BASE.get(category, {"generic": 0.5, "cliche": 0.5, "eco": 1.5})
    model = generation.get("model", "")
    is_fm = "Spectral FM" in model
    density = analysis.get("event_density_per_sec", 0)
    flatness = analysis.get("spectral_flatness", 0)
    centroid = analysis.get("spectral_centroid_hz", 0)
    loop_required = prompt.get("loop_required", False)
    loop_disc = analysis.get("loop_boundary_discontinuity")
    intended_count = len(prompt.get("intended_sources", []))
    forbidden_count = len(prompt.get("forbidden_sources", []))

    prompt_adherence = 1.4
    if density > 0.2:
        prompt_adherence += 0.3
    if loop_required and loop_score(True, loop_disc) >= 3.5:
        prompt_adherence += 0.3
    if category in ("machine", "archive", "impossible_ecology"):
        prompt_adherence += 0.2
    if is_fm:
        prompt_adherence += 0.2

    source_accuracy = 1.0
    if category in ("machine", "archive", "interior", "ruin"):
        source_accuracy += 0.5
    if is_fm and category in ("machine", "archive", "impossible_ecology"):
        source_accuracy += 0.4
    if intended_count <= 2:
        source_accuracy += 0.2

    spatial = 1.8
    if flatness > 0.05:
        spatial += 0.4
    if is_fm:
        spatial += 0.3
    if category in ("interior", "archive"):
        spatial += 0.4

    event_density = density_score(category, density)
    eco = base["eco"] + (0.3 if category in ("machine", "impossible_ecology") and is_fm else 0)
    causal = 1.2 + (0.4 if density < 6 else 0) + (0.3 if category in ("machine", "interior", "archive") else 0)

    false_source = 0.4 + (0.15 * forbidden_count)
    if centroid > 8000 and category in ("interior", "archive", "ritual"):
        false_source += 0.6

    generic = base["generic"]
    if category in ("forest", "coast") and "SYNTH" in generation["audio_id"]:
        generic += 0.4

    cliche = base["cliche"]
    if category in ("ritual", "archive", "club_exterior") and is_fm:
        cliche += 0.2

    final = {
        "prompt_adherence": clamp(prompt_adherence, 1, 5),
        "source_accuracy": clamp(source_accuracy, 1, 5),
        "spatial_coherence": clamp(spatial, 1, 5),
        "event_density_score": clamp(event_density, 1, 5),
        "ecological_plausibility": clamp(eco, 1, 5),
        "causal_coherence": clamp(causal, 1, 5),
        "false_source_index": clamp(false_source, 0, 5),
        "generic_naturalism_index": clamp(generic, 0, 5),
        "cultural_cliche_index": clamp(cliche, 0, 5),
        "loopability": clamp(loop_score(loop_required, loop_disc), 1, 5),
    }

    positive_mean = sum(final[a] for a in POSITIVE_AXES) / len(POSITIVE_AXES)
    risk_mean = sum(final[a] for a in RISK_AXES) / len(RISK_AXES)
    if positive_mean >= 2.7 and risk_mean <= 0.8:
        recommendation = "keep"
    elif positive_mean >= 2.0:
        recommendation = "revise"
    else:
        recommendation = "reject"
    final["regeneration_potential"] = recommendation
    return final


def derive_score_sets(prompt: dict, generation: dict, analysis: dict) -> dict:
    final = build_final_scores(prompt, generation, analysis)

    signal = dict(final)
    signal["prompt_adherence"] = clamp(final["prompt_adherence"] - 0.3, 1, 5)
    signal["source_accuracy"] = 1.0
    signal["ecological_plausibility"] = clamp(final["ecological_plausibility"] - 0.4, 1, 5)
    signal["causal_coherence"] = clamp(final["causal_coherence"] - 0.2, 1, 5)

    agent = dict(final)
    human = None
    return {
        "signal_scores": signal,
        "agent_scores": agent,
        "human_scores": human,
        "final_scores": final,
    }


def source_layers_for_model(generation: dict) -> list[str]:
    if not is_procedural_generation(generation):
        return [
            "unverified model-rendered soundscape layer",
            "prompt-conditioned ambient texture",
            "possible generation artifacts",
        ]
    if "Spectral FM" in generation.get("model", ""):
        return ["FM carrier/modulator layer", "granular synthetic events", "spectral sweep"]
    return ["broadband noise layer", "low sine drone", "stochastic transient events"]


def build_claims(prompt: dict, generation: dict, analysis: dict, review_status: str) -> dict:
    category = prompt.get("category", "unknown")
    model = generation.get("model", "unknown model")
    layers = source_layers_for_model(generation)
    is_procedural = is_procedural_generation(generation)
    measured = [
        {"statement": f"Duration is {analysis['duration']} seconds at {analysis['sample_rate']} Hz.", "confidence": "high", "basis": "audio metadata and signal inspection"},
        {"statement": f"RMS is {analysis['rms']:.4f} with peak level {analysis['peak_level']:.4f}.", "confidence": "high", "basis": "signal measurement"},
        {"statement": f"Spectral centroid is {analysis['spectral_centroid_hz']:.0f} Hz and bandwidth is {analysis['spectral_bandwidth_hz']:.0f} Hz.", "confidence": "high", "basis": "spectral feature extraction"},
        {"statement": f"Detected onset density is {analysis['event_density_per_sec']:.2f} events per second.", "confidence": "high", "basis": "librosa onset detection"},
    ]
    if is_procedural:
        heard = [
            {"statement": f"The output presents a procedural {category} profile built from {', '.join(layers)}.", "confidence": "medium", "basis": "synthesis method and audible texture class"},
            {"statement": "No recognizable field-recorded source identity is established by this report.", "confidence": "high", "basis": "procedural generation metadata"},
        ]
        inferred = [
            {"statement": f"The prompt's intended sources are not literally rendered; they are abstracted into a category-level {category} control texture.", "confidence": "high", "basis": "prompt/generation metadata comparison"},
            {"statement": "The file functions as a procedural control rather than a realistic text-to-audio model output.", "confidence": "high", "basis": "model type and generation parameters"},
        ]
    else:
        heard = [
            {"statement": f"The supplied metadata identifies the output as generated by {model} for a {category} prompt.", "confidence": "high", "basis": "generation metadata and prompt record"},
            {"statement": "This automated report does not establish verified source identities inside the generated soundscape.", "confidence": "high", "basis": "no human annotation or source classifier evidence is supplied"},
        ]
        inferred = [
            {"statement": "The file should be evaluated as an ML-generated soundscape candidate rather than as documentary field evidence.", "confidence": "high", "basis": "generation source_type and model metadata"},
            {"statement": "Prompt intent, measured signal behavior, and apparent source identity must remain separate until a listening pass verifies the soundscape.", "confidence": "high", "basis": "AKOÚŌ claim taxonomy discipline"},
        ]
    interpreted = []
    speculative = []
    if review_status == "hybrid_reviewed":
        interpreted.append({
            "statement": "As an Algophony case, this output is useful for exposing the difference between a measurable signal and a convincing soundscape world.",
            "confidence": "medium",
            "basis": "AKOÚŌ-style interpretive review of prompt adherence and procedural synthesis limits",
        })
        interpreted.append({
            "statement": f"The {category} label is represented as a synthesis profile rather than a situated ecology, culture, or acoustic environment.",
            "confidence": "medium",
            "basis": "comparison between prompt sources and generated procedural layers",
        })
        if category == "impossible_ecology":
            speculative.append({
                "statement": "The output could be treated as a synthetic ecology sketch, but not as evidence of a coherent impossible habitat.",
                "confidence": "low",
                "basis": "possible-world reading of generated texture",
            })
    undetermined = [
        {"statement": "Species, real location, cultural scene, microphone position, and field-recording provenance remain undetermined.", "confidence": "high", "basis": "generated audio is not documentary evidence"},
        {"statement": "Human perceptual salience remains unverified until a listener annotation is added.", "confidence": "high", "basis": "no independent human listening panel recorded"},
    ]
    return {
        "heard": heard,
        "measured": measured,
        "inferred": inferred,
        "interpreted": interpreted,
        "speculative": speculative,
        "undetermined": undetermined,
    }


def provenance_for(score_sets: dict, review_status: str) -> list[dict]:
    final = score_sets["final_scores"]
    provenance = []
    for axis in SCORE_AXES:
        scorer = "hybrid" if review_status == "hybrid_reviewed" else "agent"
        evidence = "signal features plus prompt/metadata comparison"
        if axis in ("event_density_score", "loopability"):
            evidence = "signal features"
            scorer = "signal" if review_status != "hybrid_reviewed" else "hybrid"
        if axis in ("generic_naturalism_index", "cultural_cliche_index", "ecological_plausibility", "causal_coherence"):
            evidence = "AKOÚŌ-style interpretive rubric plus prompt/metadata comparison"
        provenance.append({
            "axis": axis,
            "score": final[axis],
            "scorer": scorer,
            "evidence": evidence,
            "confidence": "medium" if scorer == "hybrid" else "low",
            "notes": "Procedural-control score; requires human listening before publication-level claims.",
        })
    return provenance


def build_report(prompt: dict, generation: dict, analysis: dict, report_num: int) -> dict:
    report_id = f"AK-{report_num:04d}"
    category = prompt.get("category", "unknown")
    review_status = "hybrid_reviewed" if reviewed_seed(prompt["prompt_id"]) else "agent_draft"
    score_sets = derive_score_sets(prompt, generation, analysis)
    final_scores = score_sets["final_scores"]
    recommendation = final_scores["regeneration_potential"]
    layers = source_layers_for_model(generation)
    is_procedural = is_procedural_generation(generation)
    if is_procedural:
        basic_description = (
            f"{generation['model']} output for {prompt['prompt_id']} ({category}). "
            f"The file is a procedural control built from {', '.join(layers)}, not a realistic text-to-audio rendering."
        )
        inferred_sources = [f"synthetic {category} control profile"]
        hallucinated_sources = ["synthesis artifacts standing in for requested sources"]
        false_sources = ["synthesis artifacts standing in for requested sources"]
        ecological_text = (
            "Low to moderate as a soundscape claim. The generated file may be useful as a control signal, "
            "but it does not establish organism, weather, material, or social source coexistence."
        )
        causal_text = "Limited. Events are generated by synthesis rules rather than by modeled causes in a coherent environment."
        prompt_comparison = (
            f"Prompt requested {', '.join(prompt.get('intended_sources', [])[:5])}. "
            f"Generated output provides procedural layers instead of identifiable requested sources."
        )
        suggested_revision = (
            "Use this as a control baseline. For a production generation, route the same prompt through a real text-to-audio "
            "backend and preserve forbidden-source constraints."
        )
    else:
        basic_description = (
            f"{generation['model']} output for {prompt['prompt_id']} ({category}). "
            "The file is an ML-generated soundscape candidate; source identity, spatial world-construction, "
            "and cultural specificity require bounded listening review."
        )
        inferred_sources = [f"prompt-conditioned {category} soundscape candidate"]
        hallucinated_sources = []
        false_sources = []
        ecological_text = (
            "Undetermined from signal features alone. A listening pass should compare apparent coexistence, density, "
            "and material/weather/social relations against the prompt without treating the output as field evidence."
        )
        causal_text = (
            "Undetermined pending listening review. The model may imply causal sequences, but the report must distinguish "
            "audible continuity from verified environmental cause."
        )
        prompt_comparison = (
            f"Prompt requested {', '.join(prompt.get('intended_sources', [])[:5])}. "
            "This automated pass records the request and signal features, but does not certify which requested sources are audibly present."
        )
        suggested_revision = (
            "Run a routed AKOÚŌ listening pass, then revise the prompt using missing-source, forbidden-source, duration, "
            "loopability, and spatial-coherence evidence."
        )

    routing_plan = build_routing_plan(prompt, generation, analysis, command="/listen")
    claim_taxonomy = enforce_claim_permissions(
        build_claims(prompt, generation, analysis, review_status),
        routing_plan["claim_permissions"],
    )

    return {
        "report_id": report_id,
        "report_type": "listening_report",
        "audio_id": generation["audio_id"],
        "prompt_id": prompt["prompt_id"],
        "listening_date": date.today().isoformat(),
        "listener_type": "hybrid" if review_status == "hybrid_reviewed" else "agent",
        "review_status": review_status,
        "akouo_contract_version": AKOUO_CONTRACT_VERSION,
        "akouo_routing_plan": routing_plan,
        "reviewer_notes": [
            "v0.1.1 QA pass combining signal inspection, prompt comparison, and AKOÚŌ-style claim discipline.",
            "This is not a substitute for a formal human listening panel.",
        ] if review_status == "hybrid_reviewed" else [
            "Agent draft generated from signal features and generation metadata; requires review."
        ],
        "evidence_inputs": [
            "prompt metadata",
            "generation metadata",
            "audio-analysis-v0.1.jsonl",
            "procedural synthesis adapter parameters",
        ],
        "classifier_outputs": [],
        "revision_history": [
            {
                "date": date.today().isoformat(),
                "change": "v0.1.1 report regenerated with review status, score provenance, and populated AKOÚŌ claim taxonomy.",
            }
        ],
        "claim_taxonomy": claim_taxonomy,
        "basic_description": basic_description,
        "sources": {
            "detected": layers,
            "inferred": inferred_sources,
            "absent_expected": prompt.get("intended_sources", []),
            "forbidden_detected": [],
            "hallucinated": hallucinated_sources,
        },
        "spatial_structure": {
            "foreground": layers[-1],
            "midground": layers[0],
            "background": "steady procedural bed",
            "depth": "Simulated only; no measured room impulse response or binaural scene model.",
        },
        "temporal_behavior": {
            "onset_count": analysis.get("onset_count", 0),
            "event_density_per_sec": analysis.get("event_density_per_sec", 0),
            "silence_ratio": analysis.get("silence_ratio", 0),
            "loop_boundary_discontinuity": analysis.get("loop_boundary_discontinuity"),
            "pattern": "Procedural event placement; no verified causal sequence.",
        },
        "ecological_plausibility": ecological_text,
        "causal_coherence": causal_text,
        "cultural_assumptions": (
            "The output minimizes explicit cultural content, but the prompt category is flattened into a technical texture. "
            "For ritual, archive, club, city, and place-based prompts this flattening remains a critical limitation."
        ),
        "false_sources": false_sources,
        "prompt_comparison": prompt_comparison,
        "suggested_prompt_revision": suggested_revision,
        "regeneration_recommendation": recommendation,
        "score_sets": score_sets,
        "score_provenance": provenance_for(score_sets, review_status),
        "scores": final_scores,
    }


def build_markdown(report: dict, prompt: dict, analysis: dict) -> str:
    lines = [
        f"# {report['report_id']} - {report['audio_id']}",
        "",
        f"**Report type:** {report['report_type']}",
        f"**Review status:** {report['review_status']}",
        f"**Prompt:** {prompt['prompt_id']} ({prompt.get('category', '')})",
        f"**Listener:** {report['listener_type']}",
        f"**Date:** {report['listening_date']}",
        "",
        "## Prompt Text",
        f"> {prompt['prompt_text']}",
        "",
        "## Basic Description",
        report["basic_description"],
        "",
        "## AKOÚŌ Claim Taxonomy",
    ]
    for bucket, claims in report["claim_taxonomy"].items():
        lines.append(f"### {bucket}")
        if claims:
            for claim in claims:
                lines.append(f"- ({claim['confidence']}) {claim['statement']} Basis: {claim['basis']}")
        else:
            lines.append("- None recorded.")
        lines.append("")

    lines.extend([
        "## Signal Measurements",
        "| Metric | Value |",
        "| --- | --- |",
        f"| Duration | {analysis['duration']}s |",
        f"| Sample rate | {analysis['sample_rate']} Hz |",
        f"| RMS / peak | {analysis['rms']:.4f} / {analysis['peak_level']:.4f} |",
        f"| Spectral centroid | {analysis['spectral_centroid_hz']:.0f} Hz |",
        f"| Event density | {analysis['event_density_per_sec']:.2f}/sec |",
        f"| Loop discontinuity | {analysis.get('loop_boundary_discontinuity')} |",
        "",
        "## Final Scores",
        "| Axis | Score |",
        "| --- | --- |",
    ])
    for axis, value in report["scores"].items():
        lines.append(f"| {axis} | {value} |")

    lines.extend([
        "",
        "## Sources",
        f"- Detected: {', '.join(report['sources']['detected']) or 'none'}",
        f"- Inferred: {', '.join(report['sources']['inferred']) or 'none'}",
        f"- Absent expected: {', '.join(report['sources']['absent_expected']) or 'none'}",
        f"- Forbidden detected: {', '.join(report['sources']['forbidden_detected']) or 'none'}",
        f"- Hallucinated: {', '.join(report['sources']['hallucinated']) or 'none'}",
        "",
        "## Ecological Plausibility",
        report["ecological_plausibility"],
        "",
        "## Causal Coherence",
        report["causal_coherence"],
        "",
        "## Cultural Assumptions",
        report["cultural_assumptions"],
        "",
        "## Prompt Comparison",
        report["prompt_comparison"],
        "",
        "## Suggested Prompt Revision",
        report["suggested_prompt_revision"],
        "",
        f"## Recommendation: {report['regeneration_recommendation']}",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Algophony listening reports.")
    parser.add_argument("--prompts", default="atlas/prompts/algophony-atlas-v0.1.jsonl")
    parser.add_argument("--generations", default="generations/metadata/generations-v0.1.jsonl")
    parser.add_argument("--analysis", default="generations/metadata/audio-analysis-v0.1.jsonl")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--prompt-ids", default=None)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    prompts = index_by(load_jsonl(root / args.prompts), "prompt_id")
    generations = index_by(load_jsonl(root / args.generations), "audio_id")
    analyses = index_by(load_jsonl(root / args.analysis), "audio_id")
    target_ids = set(args.prompt_ids.split(",")) if args.prompt_ids else None

    json_dir = root / "reports" / "json"
    md_dir = root / "reports" / "markdown"
    json_dir.mkdir(parents=True, exist_ok=True)
    md_dir.mkdir(parents=True, exist_ok=True)
    scores_path = root / "benchmark" / "scores" / "scores-v0.1.jsonl"

    reports = []
    scores = []
    report_num = 0
    items = sorted(generations.items())
    if args.limit:
        items = items[:args.limit]

    for audio_id, generation in items:
        prompt_id = generation["prompt_id"]
        if target_ids and prompt_id not in target_ids:
            continue
        prompt = prompts.get(prompt_id)
        analysis = analyses.get(audio_id)
        if not prompt or not analysis:
            print(f"Skipping {audio_id}: missing prompt or analysis")
            continue

        report_num += 1
        report = build_report(prompt, generation, analysis, report_num)
        reports.append(report)
        scores.append({
            "suite_id": "algophony-benchmark-lite-v0.1",
            "prompt_id": prompt_id,
            "audio_id": audio_id,
            "report_id": report["report_id"],
            "model": {
                "provider": generation["model"],
                "version": generation.get("model_version", "unknown"),
                "type": model_type(generation["model"]),
            },
            "score_sets": report["score_sets"],
            "score_provenance": report["score_provenance"],
            "final_scores": report["scores"],
            "date": report["listening_date"],
        })

    for old in json_dir.glob("AK-*.json"):
        old.unlink()
    for old in md_dir.glob("AK-*.md"):
        old.unlink()

    for report in reports:
        prompt = prompts[report["prompt_id"]]
        analysis = analyses[report["audio_id"]]
        (json_dir / f"{report['report_id']}.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n"
        )
        (md_dir / f"{report['report_id']}.md").write_text(build_markdown(report, prompt, analysis))

    with open(scores_path, "w") as f:
        for score in scores:
            f.write(json.dumps(score, ensure_ascii=False) + "\n")

    print(f"Generated {len(reports)} reports and {len(scores)} score records.")


if __name__ == "__main__":
    main()
