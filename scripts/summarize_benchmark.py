#!/usr/bin/env python3
"""
Generate per-model and per-category summary tables from benchmark scores.

Required outputs:
  - CSV
  - Markdown
  - JSON summary

Usage:
    python scripts/summarize_benchmark.py
    python scripts/summarize_benchmark.py --scores benchmark/scores/scores-v0.1.jsonl --out benchmark/exports/
"""

import argparse
import csv
import json
import sys
from pathlib import Path
from collections import defaultdict


def load_scores(path: Path) -> list[dict]:
    """Load score records from JSONL."""
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
    """Load prompts indexed by prompt_id."""
    prompts = {}
    if not path.exists():
        return prompts
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                record = json.loads(line)
                prompts[record["prompt_id"]] = record
    return prompts


def compute_summaries(scores: list[dict], prompts: dict[str, dict]) -> dict:
    """Compute per-model and per-category averages."""
    model_scores = defaultdict(lambda: defaultdict(list))
    category_scores = defaultdict(lambda: defaultdict(list))

    score_axes = [
        "prompt_adherence", "source_accuracy", "spatial_coherence",
        "event_density_score", "ecological_plausibility", "causal_coherence",
        "false_source_index", "generic_naturalism_index", "cultural_cliche_index",
        "loopability"
    ]

    for record in scores:
        # Extract model from scores array or from model field
        model_info = record.get("model", {})
        model_name = model_info.get("provider", "unknown") if isinstance(model_info, dict) else "unknown"

        prompt_id = record.get("prompt_id", "")
        category = prompts.get(prompt_id, {}).get("category", "unknown")

        # Extract scores from the scores array
        score_dict = {}
        for s in record.get("scores", []):
            score_dict[s["axis"]] = s["score"]

        for axis in score_axes:
            val = score_dict.get(axis)
            if val is not None:
                model_scores[model_name][axis].append(val)
                category_scores[category][axis].append(val)

    # Compute averages
    def avg(values):
        return round(sum(values) / len(values), 2) if values else None

    model_summary = {}
    for model, axes in model_scores.items():
        model_summary[model] = {axis: avg(vals) for axis, vals in axes.items()}

    category_summary = {}
    for cat, axes in category_scores.items():
        category_summary[cat] = {axis: avg(vals) for axis, vals in axes.items()}

    return {
        "per_model": model_summary,
        "per_category": category_summary,
        "total_scores": len(scores),
    }


def export_csv(summary: dict, out_path: Path):
    """Export model comparison as CSV."""
    models = summary["per_model"]
    if not models:
        return

    axes = list(next(iter(models.values())).keys())
    rows = []
    for model, scores in models.items():
        row = {"model": model}
        row.update(scores)
        rows.append(row)

    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["model"] + axes)
        writer.writeheader()
        writer.writerows(rows)

    print(f"  ✓ CSV: {out_path}")


def export_markdown(summary: dict, out_path: Path):
    """Export model comparison as Markdown table."""
    models = summary["per_model"]
    if not models:
        return

    axes = list(next(iter(models.values())).keys())
    lines = ["# Model Comparison — Algophony Benchmark Lite v0.1\n"]
    header = "| Model | " + " | ".join(axes) + " |"
    separator = "| --- | " + " | ".join(["---"] * len(axes)) + " |"
    lines.append(header)
    lines.append(separator)

    for model, scores in models.items():
        vals = " | ".join(str(scores.get(a, "—")) for a in axes)
        lines.append(f"| {model} | {vals} |")

    lines.append("")
    with open(out_path, "w") as f:
        f.write("\n".join(lines))

    print(f"  ✓ Markdown: {out_path}")


def main():
    parser = argparse.ArgumentParser(description="Summarize Algophony benchmark.")
    parser.add_argument("--scores", default="benchmark/scores/scores-v0.1.jsonl",
                        help="Path to scores JSONL.")
    parser.add_argument("--prompts", default="atlas/prompts/algophony-atlas-v0.1.jsonl",
                        help="Path to prompts JSONL.")
    parser.add_argument("--out", default="benchmark/exports/",
                        help="Output directory for exports.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    scores_path = project_root / args.scores
    prompts_path = project_root / args.prompts
    out_dir = project_root / args.out

    scores = load_scores(scores_path)
    if not scores:
        print("No score records found. Nothing to summarize.")
        sys.exit(0)

    prompts = load_prompts(prompts_path)
    summary = compute_summaries(scores, prompts)

    out_dir.mkdir(parents=True, exist_ok=True)

    # Export all formats
    export_csv(summary, out_dir / "model-comparison-v0.1.csv")
    export_markdown(summary, out_dir / "model-comparison-v0.1.md")

    json_path = out_dir / "model-comparison-v0.1.json"
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"  ✓ JSON: {json_path}")

    print(f"\nSummarized {summary['total_scores']} score record(s).")


if __name__ == "__main__":
    main()
