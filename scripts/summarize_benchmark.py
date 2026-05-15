#!/usr/bin/env python3
"""
Generate per-model and per-category summary tables from benchmark scores.

The v0.1.1 summary reads `final_scores` and treats positive axes and risk
indices separately. Lower risk-index values are better.
"""

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


POSITIVE_AXES = [
    "prompt_adherence",
    "source_accuracy",
    "spatial_coherence",
    "event_density_score",
    "ecological_plausibility",
    "causal_coherence",
    "loopability",
]

RISK_AXES = [
    "false_source_index",
    "generic_naturalism_index",
    "cultural_cliche_index",
]

SCORE_AXES = POSITIVE_AXES[:6] + RISK_AXES + ["loopability"]


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


def load_prompts(path: Path) -> dict[str, dict]:
    return {r["prompt_id"]: r for r in load_jsonl(path)}


def avg(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


def final_scores(record: dict) -> dict:
    return record.get("final_scores") or record.get("scores", {})


def normalized_composite(scores: dict[str, float | None]) -> float | None:
    positive = [scores.get(axis) for axis in POSITIVE_AXES if isinstance(scores.get(axis), (int, float))]
    risks = [scores.get(axis) for axis in RISK_AXES if isinstance(scores.get(axis), (int, float))]
    if not positive or not risks:
        return None
    positive_norm = sum((v - 1) / 4 for v in positive) / len(positive)
    risk_norm = sum(v / 5 for v in risks) / len(risks)
    return round((positive_norm * 0.72 + (1 - risk_norm) * 0.28) * 100, 2)


def compute_summaries(scores: list[dict], prompts: dict[str, dict]) -> dict:
    model_scores = defaultdict(lambda: defaultdict(list))
    category_scores = defaultdict(lambda: defaultdict(list))
    model_category_scores = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

    for record in scores:
        model_info = record.get("model", {})
        model_name = model_info.get("provider", "unknown") if isinstance(model_info, dict) else "unknown"
        prompt_id = record.get("prompt_id", "")
        category = prompts.get(prompt_id, {}).get("category", "unknown")
        score_dict = final_scores(record)

        for axis in SCORE_AXES:
            val = score_dict.get(axis)
            if isinstance(val, (int, float)):
                model_scores[model_name][axis].append(val)
                category_scores[category][axis].append(val)
                model_category_scores[model_name][category][axis].append(val)

    def summarize(grouped: dict) -> dict:
        output = {}
        for name, axes in grouped.items():
            axis_avgs = {axis: avg(vals) for axis, vals in axes.items()}
            axis_avgs["composite_0_100"] = normalized_composite(axis_avgs)
            output[name] = axis_avgs
        return output

    per_model_category = {}
    for model, categories in model_category_scores.items():
        per_model_category[model] = summarize(categories)

    return {
        "method": "final_scores; positive axes higher is better, risk indices lower is better",
        "per_model": summarize(model_scores),
        "per_category": summarize(category_scores),
        "per_model_category": per_model_category,
        "total_scores": len(scores),
    }


def export_csv(summary: dict, out_path: Path) -> None:
    models = summary["per_model"]
    if not models:
        return

    axes = ["composite_0_100"] + SCORE_AXES
    rows = []
    for model, scores in models.items():
        row = {"model": model}
        row.update({axis: scores.get(axis) for axis in axes})
        rows.append(row)

    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["model"] + axes)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  OK CSV: {out_path}")


def export_markdown(summary: dict, out_path: Path) -> None:
    models = summary["per_model"]
    if not models:
        return

    axes = ["composite_0_100"] + SCORE_AXES
    lines = [
        "# Model Comparison - Algophony Benchmark Lite v0.1.1",
        "",
        "Positive axes use 1-5 where higher is better. Risk indices use 0-5 where lower is better.",
        "",
        "| Model | " + " | ".join(axes) + " |",
        "| --- | " + " | ".join(["---"] * len(axes)) + " |",
    ]

    for model, scores in models.items():
        vals = " | ".join(str(scores.get(axis, "-")) for axis in axes)
        lines.append(f"| {model} | {vals} |")

    lines.append("")
    with open(out_path, "w") as f:
        f.write("\n".join(lines))

    print(f"  OK Markdown: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize Algophony benchmark.")
    parser.add_argument("--scores", default="benchmark/scores/scores-v0.1.jsonl")
    parser.add_argument("--prompts", default="atlas/prompts/algophony-atlas-v0.1.jsonl")
    parser.add_argument("--out", default="benchmark/exports/")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    scores_path = project_root / args.scores
    prompts_path = project_root / args.prompts
    out_dir = project_root / args.out

    scores = load_jsonl(scores_path)
    if not scores:
        print("No score records found. Nothing to summarize.")
        sys.exit(0)

    summary = compute_summaries(scores, load_prompts(prompts_path))
    if args.dry_run:
        print(json.dumps(summary, indent=2))
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    export_csv(summary, out_dir / "model-comparison-v0.1.csv")
    export_markdown(summary, out_dir / "model-comparison-v0.1.md")

    json_path = out_dir / "model-comparison-v0.1.json"
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"  OK JSON: {json_path}")
    print(f"\nSummarized {summary['total_scores']} score record(s).")


if __name__ == "__main__":
    main()
