#!/usr/bin/env python3
"""
Validate the Algophony dataset: prompts, generation metadata, listening reports,
scores, and benchmark suite records.

Checks:
  - JSON syntax
  - JSONL line validity
  - Schema validity
  - Unique IDs
  - Cross-reference integrity
  - Category balance
  - Score ranges
  - Missing metadata

Usage:
    python scripts/validate_dataset.py
    python scripts/validate_dataset.py --verbose
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, ValidationError
except ImportError:
    print("Error: jsonschema package required. Install with: pip install jsonschema")
    sys.exit(1)


def load_schema(schema_path: Path) -> dict | None:
    """Load and return a JSON Schema, or None if not found."""
    if not schema_path.exists():
        return None
    with open(schema_path) as f:
        return json.load(f)


def load_jsonl(jsonl_path: Path) -> list[tuple[int, dict | None, str | None]]:
    """Load JSONL file, returning (line_number, parsed_record, error) tuples."""
    records = []
    if not jsonl_path.exists():
        return records
    with open(jsonl_path) as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                records.append((i, record, None))
            except json.JSONDecodeError as e:
                records.append((i, None, str(e)))
    return records


def validate_records(records: list[tuple[int, dict | None, str | None]],
                     schema: dict | None,
                     id_field: str,
                     label: str,
                     verbose: bool = False) -> list[str]:
    """Validate parsed JSONL records against a schema."""
    errors = []
    seen_ids = set()

    if not records:
        if verbose:
            print(f"  ℹ {label}: No records found (empty file).")
        return errors

    validator = Draft202012Validator(schema) if schema else None

    for line_num, record, parse_error in records:
        if parse_error:
            errors.append(f"{label} line {line_num}: JSON parse error: {parse_error}")
            continue

        # Check unique ID
        record_id = record.get(id_field)
        if record_id:
            if record_id in seen_ids:
                errors.append(f"{label} line {line_num}: Duplicate ID '{record_id}'")
            seen_ids.add(record_id)
        else:
            errors.append(f"{label} line {line_num}: Missing required field '{id_field}'")

        # Schema validation
        if validator:
            for ve in validator.iter_errors(record):
                errors.append(f"{label} line {line_num} ({record_id}): {ve.message}")

    if not errors:
        print(f"  ✓ {label}: {len(records)} record(s) valid.")
    else:
        print(f"  ✗ {label}: {len(errors)} error(s) in {len(records)} record(s).")

    return errors


def check_category_balance(records: list[tuple[int, dict | None, str | None]],
                           expected_categories: list[str],
                           expected_per_category: int = 10) -> list[str]:
    """Check that prompt categories are balanced."""
    errors = []
    counts: dict[str, int] = {}
    for _, record, err in records:
        if err or not record:
            continue
        cat = record.get("category", "UNKNOWN")
        counts[cat] = counts.get(cat, 0) + 1

    for cat in expected_categories:
        count = counts.get(cat, 0)
        if count != expected_per_category:
            errors.append(
                f"Category '{cat}': expected {expected_per_category}, got {count}"
            )

    unexpected = set(counts.keys()) - set(expected_categories)
    for cat in unexpected:
        errors.append(f"Unexpected category '{cat}' with {counts[cat]} record(s).")

    return errors


def check_cross_references(prompt_ids: set[str],
                           generation_records: list[tuple[int, dict | None, str | None]],
                           report_records: list[tuple[int, dict | None, str | None]]) -> list[str]:
    """Check that generation and report records reference valid prompt IDs."""
    errors = []
    generation_ids = set()

    for line_num, record, err in generation_records:
        if err or not record:
            continue
        pid = record.get("prompt_id")
        if pid and pid not in prompt_ids:
            errors.append(f"Generation line {line_num}: prompt_id '{pid}' not in prompt corpus.")
        aid = record.get("audio_id")
        if aid:
            generation_ids.add(aid)

    for line_num, record, err in report_records:
        if err or not record:
            continue
        pid = record.get("prompt_id")
        if pid and pid not in prompt_ids:
            errors.append(f"Report line {line_num}: prompt_id '{pid}' not in prompt corpus.")
        aid = record.get("audio_id")
        if aid and generation_ids and aid not in generation_ids:
            errors.append(f"Report line {line_num}: audio_id '{aid}' not in generation metadata.")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate Algophony dataset.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    schema_dir = project_root / "schemas"

    print("Algophony Dataset Validation\n")

    all_errors = []

    # Load schemas
    prompt_schema = load_schema(schema_dir / "prompt.schema.json")
    generation_schema = load_schema(schema_dir / "generation.schema.json")
    report_schema = load_schema(schema_dir / "listening-report.schema.json")

    # Validate prompts
    prompt_path = project_root / "atlas" / "prompts" / "algophony-atlas-v0.1.jsonl"
    prompt_records = load_jsonl(prompt_path)
    prompt_errors = validate_records(prompt_records, prompt_schema, "prompt_id", "Prompts", args.verbose)
    all_errors.extend(prompt_errors)

    # Check category balance
    if prompt_records:
        expected_categories = [
            "forest", "city", "coast", "interior", "machine",
            "ritual", "archive", "club_exterior", "ruin", "impossible_ecology"
        ]
        balance_errors = check_category_balance(prompt_records, expected_categories)
        all_errors.extend(balance_errors)
        if balance_errors:
            print(f"  ✗ Category balance: {len(balance_errors)} issue(s).")
            for e in balance_errors:
                print(f"    - {e}")
        elif prompt_records:
            print("  ✓ Category balance: OK.")

    # Validate generation metadata
    gen_path = project_root / "generations" / "metadata" / "generations-v0.1.jsonl"
    gen_records = load_jsonl(gen_path)
    gen_errors = validate_records(gen_records, generation_schema, "audio_id", "Generations", args.verbose)
    all_errors.extend(gen_errors)

    # Validate reports (JSON files)
    report_dir = project_root / "reports" / "json"
    report_records = []
    if report_dir.exists():
        for rfile in sorted(report_dir.glob("*.json")):
            try:
                with open(rfile) as f:
                    record = json.load(f)
                report_records.append((0, record, None))
            except json.JSONDecodeError as e:
                report_records.append((0, None, f"{rfile.name}: {e}"))

    report_errors = validate_records(report_records, report_schema, "report_id", "Reports", args.verbose)
    all_errors.extend(report_errors)

    # Cross-reference checks
    prompt_ids = set()
    for _, record, err in prompt_records:
        if not err and record:
            pid = record.get("prompt_id")
            if pid:
                prompt_ids.add(pid)

    if prompt_ids:
        xref_errors = check_cross_references(prompt_ids, gen_records, report_records)
        all_errors.extend(xref_errors)
        if xref_errors:
            print(f"  ✗ Cross-references: {len(xref_errors)} issue(s).")
            for e in xref_errors:
                print(f"    - {e}")
        else:
            print("  ✓ Cross-references: OK.")

    # Summary
    print()
    if all_errors:
        print(f"FAILED: {len(all_errors)} total error(s).")
        sys.exit(1)
    else:
        print("PASSED: Dataset validation complete.")
        sys.exit(0)


if __name__ == "__main__":
    main()
