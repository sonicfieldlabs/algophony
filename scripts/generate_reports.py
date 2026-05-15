#!/usr/bin/env python3
"""
Generate automated listening reports for Algophony soundscapes.

Creates structured reports combining audio analysis, prompt comparison,
automated scoring, and AKOÚŌ claim taxonomy.

Usage:
    python scripts/generate_reports.py
    python scripts/generate_reports.py --limit 5
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path


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


def assess_scores(prompt: dict, analysis: dict) -> dict:
    """Compute all score axes."""
    intended = prompt.get("intended_sources", [])
    category = prompt.get("category", "")
    onset_count = analysis.get("onset_count", 0)
    silence = analysis.get("silence_ratio", 0)
    bandwidth = analysis.get("spectral_bandwidth_hz", 0)
    flatness = analysis.get("spectral_flatness", 0)
    loop_disc = analysis.get("loop_boundary_discontinuity")

    # Source adherence
    pa = 3.0
    if onset_count < 3 and len(intended) > 3:
        pa -= 0.5
    elif onset_count > 30 and len(intended) < 3:
        pa -= 0.5

    # Spatial
    sp = 2.5
    if bandwidth > 3000:
        sp += 0.5
    if flatness < 0.5:
        sp += 0.5

    # Ecological
    eco = 1.5
    if category in ("forest", "ruin", "interior") and silence > 0.1:
        eco += 0.5

    # Event density
    density = round(min(5, max(1, analysis.get("event_density_per_sec", 0) * 1.5 + 1)), 1)

    # Loopability
    if not prompt.get("loop_required", False):
        loop = 1
    elif loop_disc is None:
        loop = 1
    elif loop_disc < 0.1:
        loop = 4.5
    elif loop_disc < 0.3:
        loop = 3.5
    elif loop_disc < 0.6:
        loop = 2.5
    else:
        loop = 1.5

    return {
        "prompt_adherence": round(max(1, min(5, pa)), 1),
        "source_accuracy": 1,
        "spatial_coherence": round(max(1, min(5, sp)), 1),
        "event_density_score": density,
        "ecological_plausibility": round(max(1, min(5, eco)), 1),
        "causal_coherence": 1,
        "false_source_index": 0,
        "generic_naturalism_index": 0,
        "cultural_cliche_index": 0,
        "loopability": round(max(1, min(5, loop)), 1),
        "regeneration_potential": "reject",
    }


def build_report(prompt: dict, generation: dict, analysis: dict, report_num: int) -> dict:
    """Build a listening report matching listening-report.schema.json."""
    report_id = f"AK-{report_num:04d}"
    category = prompt.get("category", "unknown")
    intended = prompt.get("intended_sources", [])

    scores = assess_scores(prompt, analysis)

    return {
        "report_id": report_id,
        "audio_id": generation["audio_id"],
        "prompt_id": prompt["prompt_id"],
        "listening_date": date.today().isoformat(),
        "listener_type": "agent",
        "claim_taxonomy": {
            "heard": [],
            "measured": [
                {"statement": f"Duration: {analysis['duration']}s at {analysis['sample_rate']}Hz", "confidence": "high", "basis": "signal inspection"},
                {"statement": f"RMS: {analysis['rms']:.4f}, peak: {analysis['peak_level']:.4f}", "confidence": "high", "basis": "signal inspection"},
                {"statement": f"Spectral centroid: {analysis['spectral_centroid_hz']:.0f}Hz, bandwidth: {analysis['spectral_bandwidth_hz']:.0f}Hz", "confidence": "high", "basis": "spectral analysis"},
                {"statement": f"Event density: {analysis['event_density_per_sec']:.1f}/sec ({analysis['onset_count']} onsets)", "confidence": "high", "basis": "onset detection"},
                {"statement": f"Silence ratio: {analysis['silence_ratio']:.2f}", "confidence": "high", "basis": "frame-level RMS"},
            ],
            "inferred": [
                {"statement": f"Category profile ({category}) partially reflected in spectral shape", "confidence": "low", "basis": "synthesis parameters"},
            ],
            "interpreted": [],
            "speculative": [],
            "undetermined": [
                {"statement": "Source identity unverifiable in synthetic baseline", "confidence": "undetermined", "basis": "procedural generation"},
                {"statement": "Spatial depth simulated, not acoustically real", "confidence": "undetermined", "basis": "no room impulse response"},
            ],
        },
        "basic_description": f"Synthetic baseline for {prompt['prompt_id']} ({category}). Procedural control using sine/noise/AM synthesis. Not intended to match prompt sources.",
        "sources": {
            "detected": [],
            "inferred": [f"Synthetic {category}-profile texture"],
            "absent_expected": intended,
        },
        "spatial_structure": {
            "foreground": "Synthetic noise/tone layer",
            "midground": "Amplitude-modulated broadband",
            "background": "Low-frequency drone",
            "depth": "No real spatial depth — mono procedural synthesis",
        },
        "temporal_behavior": {
            "onset_count": analysis.get("onset_count", 0),
            "event_density_per_sec": analysis.get("event_density_per_sec", 0),
            "silence_ratio": analysis.get("silence_ratio", 0),
            "pattern": "Stochastic event placement with amplitude modulation",
        },
        "ecological_plausibility": "Not ecologically plausible. Procedural synthesis cannot produce recognizable ecological patterns.",
        "causal_coherence": "No causal relationships. Events randomly placed without cause-effect logic.",
        "cultural_assumptions": "None. Synthetic baseline has no culturally coded content.",
        "false_sources": [],
        "prompt_comparison": f"Prompt requested: {', '.join(intended[:5])}. Generated: procedural synthetic texture. No intended sources realized (expected for baseline).",
        "suggested_prompt_revision": "No revision needed — baseline control, not production generation.",
        "regeneration_recommendation": "reject",
        "scores": scores,
    }


def build_markdown(report: dict, prompt: dict, analysis: dict) -> str:
    """Build markdown report."""
    s = report["scores"]
    lines = [
        f"# {report['report_id']} — {report['audio_id']}",
        "", f"**Prompt:** {prompt['prompt_id']} ({prompt.get('category','')})",
        f"**Model:** Synthetic Baseline | **Listener:** {report['listener_type']} | **Date:** {report['listening_date']}",
        "", "## Prompt Text", f"> {prompt['prompt_text']}",
        "", "## Signal Measurements", "| Metric | Value |", "|--------|-------|",
        f"| Duration | {analysis['duration']}s |",
        f"| Sample Rate | {analysis['sample_rate']}Hz |",
        f"| RMS / Peak | {analysis['rms']:.4f} / {analysis['peak_level']:.4f} |",
        f"| Spectral Centroid | {analysis['spectral_centroid_hz']:.0f}Hz |",
        f"| Spectral Bandwidth | {analysis['spectral_bandwidth_hz']:.0f}Hz |",
        f"| Spectral Flatness | {analysis.get('spectral_flatness',0):.4f} |",
        f"| Silence Ratio | {analysis['silence_ratio']:.2f} |",
        f"| Event Density | {analysis['event_density_per_sec']:.1f}/sec ({analysis['onset_count']} onsets) |",
    ]
    ld = analysis.get("loop_boundary_discontinuity")
    if ld is not None:
        lines.append(f"| Loop Discontinuity | {ld:.4f} |")
    lines.extend(["", "## Scores", "| Axis | Score |", "|------|-------|"])
    for k, v in s.items():
        lines.append(f"| {k} | {v} |")
    lines.extend([
        "", "## Description", report["basic_description"],
        "", "## Sources", f"- Detected: {report['sources']['detected']}",
        f"- Inferred: {report['sources']['inferred']}",
        f"- Absent expected: {report['sources']['absent_expected']}",
        "", "## Ecological Plausibility", report["ecological_plausibility"],
        "", "## Prompt Comparison", report["prompt_comparison"],
        "", f"## Recommendation: **{report['regeneration_recommendation']}**", "",
    ])
    return "\n".join(lines) + "\n"


def main():
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

    if not analyses:
        print("No analysis data. Run scripts/analyze_audio.py first.")
        sys.exit(1)

    target_ids = set(args.prompt_ids.split(",")) if args.prompt_ids else None

    json_dir = root / "reports" / "json"
    md_dir = root / "reports" / "markdown"
    json_dir.mkdir(parents=True, exist_ok=True)
    md_dir.mkdir(parents=True, exist_ok=True)
    scores_path = root / "benchmark" / "scores" / "scores-v0.1.jsonl"

    report_num = 0
    all_scores = []
    gen_items = sorted(generations.items())
    if args.limit:
        gen_items = gen_items[:args.limit]

    print(f"Generating reports for {len(gen_items)} generation(s)...\n")

    for audio_id, gen in gen_items:
        pid = gen.get("prompt_id", "")
        if target_ids and pid not in target_ids:
            continue
        prompt = prompts.get(pid)
        analysis = analyses.get(audio_id)
        if not prompt or not analysis:
            print(f"  ✗ {audio_id}: missing data")
            continue

        report_num += 1
        report = build_report(prompt, gen, analysis, report_num)

        with open(json_dir / f"{report['report_id']}.json", "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        with open(md_dir / f"{report['report_id']}.md", "w") as f:
            f.write(build_markdown(report, prompt, analysis))

        all_scores.append({
            "prompt_id": pid, "audio_id": audio_id,
            "report_id": report["report_id"],
            "model": {"provider": gen.get("model", ""), "version": gen.get("model_version", "")},
            "scores": report["scores"],
            "date": report["listening_date"],
        })
        print(f"  ✓ {report['report_id']} → {audio_id}")

    with open(scores_path, "w") as f:
        for s in all_scores:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    print(f"\nGenerated {report_num} reports → {json_dir}, {md_dir}")
    print(f"Scores: {scores_path} ({len(all_scores)} records)")


if __name__ == "__main__":
    main()
