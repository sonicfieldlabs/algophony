#!/usr/bin/env python3
"""
Migrate Algophony v0.1 data to v0.2 schema.

Adds:
  - source_type to generation records
  - upload_metadata (null) to generation records
  - listening_process to report records
  - source_type_ground_truth to report records
  - source_type_listener_guess to report records
  - artificiality_discriminability (null) to score records

Usage:
    python scripts/migrate_source_type.py
    python scripts/migrate_source_type.py --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def migrate_generations(dry_run: bool) -> int:
    """Add source_type and upload_metadata to all generation records."""
    gen_path = PROJECT_ROOT / "generations" / "metadata" / "generations-v0.1.jsonl"
    if not gen_path.exists():
        print(f"  ⚠ {gen_path} not found, skipping.")
        return 0

    records = []
    modified = 0
    with open(gen_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)

            changed = False
            if "source_type" not in record:
                # Determine source type from model
                model = record.get("model", "")
                if "Synthetic" in model or "Spectral FM" in model:
                    record["source_type"] = "generated_procedural"
                else:
                    record["source_type"] = "generated_ml"
                changed = True

            if "upload_metadata" not in record:
                record["upload_metadata"] = None
                changed = True

            if changed:
                modified += 1

            records.append(record)

    if not dry_run:
        with open(gen_path, "w") as f:
            for r in records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    return modified


def migrate_reports(dry_run: bool) -> int:
    """Add listening_process, source_type fields, and artificiality_discriminability to reports."""
    reports_dir = PROJECT_ROOT / "reports" / "json"
    if not reports_dir.exists():
        print(f"  ⚠ {reports_dir} not found, skipping.")
        return 0

    modified = 0
    for report_file in sorted(reports_dir.glob("AK-*.json")):
        with open(report_file) as f:
            report = json.load(f)

        changed = False

        if "listening_process" not in report:
            report["listening_process"] = "agent_automated"
            changed = True

        if "source_type_ground_truth" not in report:
            report["source_type_ground_truth"] = "generated_procedural"
            changed = True

        if "source_type_listener_guess" not in report:
            report["source_type_listener_guess"] = None
            changed = True

        # Add artificiality_discriminability to score sets and scores
        for score_key in ["scores"]:
            if score_key in report and "artificiality_discriminability" not in report[score_key]:
                report[score_key]["artificiality_discriminability"] = None
                changed = True

        if "score_sets" in report:
            for subset in ["signal_scores", "agent_scores", "final_scores"]:
                if subset in report["score_sets"] and report["score_sets"][subset]:
                    if "artificiality_discriminability" not in report["score_sets"][subset]:
                        report["score_sets"][subset]["artificiality_discriminability"] = None
                        changed = True
            if "human_scores" in report["score_sets"] and report["score_sets"]["human_scores"]:
                if "artificiality_discriminability" not in report["score_sets"]["human_scores"]:
                    report["score_sets"]["human_scores"]["artificiality_discriminability"] = None
                    changed = True

        if changed:
            modified += 1
            if not dry_run:
                with open(report_file, "w") as f:
                    json.dump(report, f, indent=2, ensure_ascii=False)
                    f.write("\n")

    return modified


def migrate_scores(dry_run: bool) -> int:
    """Add artificiality_discriminability to score records."""
    scores_path = PROJECT_ROOT / "benchmark" / "scores" / "scores-v0.1.jsonl"
    if not scores_path.exists():
        print(f"  ⚠ {scores_path} not found, skipping.")
        return 0

    records = []
    modified = 0
    with open(scores_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)

            changed = False
            if "final_scores" in record:
                if "artificiality_discriminability" not in record["final_scores"]:
                    record["final_scores"]["artificiality_discriminability"] = None
                    changed = True

            if "score_sets" in record:
                for subset in ["signal_scores", "agent_scores", "final_scores"]:
                    if subset in record["score_sets"] and record["score_sets"][subset]:
                        if "artificiality_discriminability" not in record["score_sets"][subset]:
                            record["score_sets"][subset]["artificiality_discriminability"] = None
                            changed = True

            if changed:
                modified += 1

            records.append(record)

    if not dry_run:
        with open(scores_path, "w") as f:
            for r in records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    return modified


def main():
    parser = argparse.ArgumentParser(description="Migrate Algophony data to v0.2 schema.")
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing.")
    args = parser.parse_args()

    mode = "DRY RUN" if args.dry_run else "LIVE"
    print(f"Algophony v0.1 → v0.2 migration ({mode})\n")

    gen_count = migrate_generations(args.dry_run)
    print(f"  Generations: {gen_count} records {'would be ' if args.dry_run else ''}updated")

    report_count = migrate_reports(args.dry_run)
    print(f"  Reports:     {report_count} records {'would be ' if args.dry_run else ''}updated")

    score_count = migrate_scores(args.dry_run)
    print(f"  Scores:      {score_count} records {'would be ' if args.dry_run else ''}updated")

    total = gen_count + report_count + score_count
    print(f"\n  Total: {total} records {'would be ' if args.dry_run else ''}migrated.")

    if args.dry_run:
        print("\n  Rerun without --dry-run to apply.")


if __name__ == "__main__":
    main()
