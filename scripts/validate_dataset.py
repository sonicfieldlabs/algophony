#!/usr/bin/env python3
"""
Validate the Algophony dataset and release metadata.

Default mode checks schema shape and cross-references. Strict mode adds release
quality gates: no local absolute paths, no unresolved model versions, no pending
models in the suite manifest, score variance, and report claim quality.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
    from referencing import Registry, Resource
    from referencing.jsonschema import DRAFT202012
except ImportError:
    print("Error: jsonschema package required. Install with: pip install jsonschema referencing")
    sys.exit(1)


CORE_SCORE_AXES = [
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

EXPECTED_CATEGORIES = [
    "forest",
    "city",
    "coast",
    "interior",
    "machine",
    "ritual",
    "archive",
    "club_exterior",
    "ruin",
    "impossible_ecology",
]


def load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def load_jsonl(path: Path) -> list[tuple[int, dict[str, Any] | None, str | None]]:
    records = []
    if not path.exists():
        return records
    with open(path) as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append((line_num, json.loads(line), None))
            except json.JSONDecodeError as e:
                records.append((line_num, None, str(e)))
    return records


def jsonl_values(records: list[tuple[int, dict | None, str | None]]) -> list[dict]:
    return [record for _, record, error in records if record is not None and error is None]


def build_schema_registry(schema_dir: Path) -> Registry:
    resources = []
    for schema_path in schema_dir.glob("*.schema.json"):
        schema = load_json(schema_path)
        if schema and "$id" in schema:
            resources.append((schema["$id"], Resource.from_contents(schema, default_specification=DRAFT202012)))
    return Registry().with_resources(resources)


def validate_records(
    records: list[tuple[int, dict | None, str | None]],
    schema: dict | None,
    id_field: str,
    label: str,
    registry: Registry,
) -> list[str]:
    errors = []
    seen = set()
    validator = Draft202012Validator(schema, registry=registry) if schema else None

    for line_num, record, parse_error in records:
        if parse_error:
            errors.append(f"{label} line {line_num}: JSON parse error: {parse_error}")
            continue
        if not record:
            errors.append(f"{label} line {line_num}: empty record")
            continue

        record_id = record.get(id_field)
        if not record_id:
            errors.append(f"{label} line {line_num}: missing {id_field}")
        elif record_id in seen:
            errors.append(f"{label} line {line_num}: duplicate {id_field} {record_id}")
        seen.add(record_id)

        if validator:
            for error in validator.iter_errors(record):
                path = ".".join(str(p) for p in error.path) or "<root>"
                errors.append(f"{label} line {line_num} ({record_id}): {path}: {error.message}")

    print(f"  {'OK' if not errors else 'FAIL'} {label}: {len(records)} record(s), {len(errors)} issue(s)")
    return errors


def validate_json_file(path: Path, schema: dict, label: str, registry: Registry) -> list[str]:
    record = load_json(path)
    if record is None:
        return [f"{label}: missing file {path}"]
    errors = []
    validator = Draft202012Validator(schema, registry=registry)
    for error in validator.iter_errors(record):
        loc = ".".join(str(p) for p in error.path) or "<root>"
        errors.append(f"{label}: {loc}: {error.message}")
    print(f"  {'OK' if not errors else 'FAIL'} {label}: {len(errors)} issue(s)")
    return errors


def check_category_balance(prompts: list[dict]) -> list[str]:
    counts = Counter(p.get("category") for p in prompts)
    errors = []
    for category in EXPECTED_CATEGORIES:
        if counts.get(category, 0) != 10:
            errors.append(f"Category {category}: expected 10, got {counts.get(category, 0)}")
    for category in set(counts) - set(EXPECTED_CATEGORIES):
        errors.append(f"Unexpected category {category}")
    return errors


def check_cross_refs(prompts: list[dict], generations: list[dict], reports: list[dict], scores: list[dict]) -> list[str]:
    errors = []
    prompt_ids = {p["prompt_id"] for p in prompts}
    generation_ids = {g["audio_id"] for g in generations}
    report_ids = {r["report_id"] for r in reports}

    for generation in generations:
        if generation["prompt_id"] not in prompt_ids:
            errors.append(f"Generation {generation['audio_id']}: missing prompt {generation['prompt_id']}")
        report_id = generation.get("akouo_report_id")
        if report_id and report_id not in report_ids:
            errors.append(f"Generation {generation['audio_id']}: missing linked report {report_id}")

    for report in reports:
        if report["prompt_id"] not in prompt_ids:
            errors.append(f"Report {report['report_id']}: missing prompt {report['prompt_id']}")
        if report["audio_id"] not in generation_ids:
            errors.append(f"Report {report['report_id']}: missing generation {report['audio_id']}")
        matching_generation = next((g for g in generations if g["audio_id"] == report["audio_id"]), None)
        if matching_generation and matching_generation.get("akouo_report_id") != report["report_id"]:
            errors.append(f"Report {report['report_id']}: generation links to {matching_generation.get('akouo_report_id')}")

    for score in scores:
        if score["prompt_id"] not in prompt_ids:
            errors.append(f"Score {score['audio_id']}: missing prompt {score['prompt_id']}")
        if score["audio_id"] not in generation_ids:
            errors.append(f"Score {score['audio_id']}: missing generation")
        if score["report_id"] not in report_ids:
            errors.append(f"Score {score['audio_id']}: missing report {score['report_id']}")

    return errors


def check_markdown_parity(report_dir: Path, reports: list[dict]) -> list[str]:
    errors = []
    markdown_ids = {p.stem for p in (report_dir / "markdown").glob("AK-*.md")}
    json_ids = {r["report_id"] for r in reports}
    for missing in sorted(json_ids - markdown_ids):
        errors.append(f"Missing Markdown report for {missing}")
    for extra in sorted(markdown_ids - json_ids):
        errors.append(f"Markdown report has no JSON peer: {extra}")
    return errors


def check_analysis(analysis_records: list[dict], generations: list[dict]) -> list[str]:
    errors = []
    generation_ids = {g["audio_id"] for g in generations}
    analysis_ids = {a.get("audio_id") for a in analysis_records}
    for missing in sorted(generation_ids - analysis_ids):
        errors.append(f"Missing audio analysis for {missing}")
    for extra in sorted(analysis_ids - generation_ids):
        errors.append(f"Audio analysis has no generation metadata: {extra}")
    required = {"duration", "sample_rate", "channels", "rms", "peak_level", "spectral_centroid_hz", "event_density_per_sec"}
    for record in analysis_records:
        missing_fields = required - set(record)
        if missing_fields:
            errors.append(f"Analysis {record.get('audio_id')}: missing {sorted(missing_fields)}")
    return errors


def check_readme_counts(project_root: Path, prompts: list[dict], generations: list[dict], reports: list[dict]) -> list[str]:
    """Fail strict validation when README corpus counts drift from the data."""
    readme_path = project_root / "README.md"
    if not readme_path.exists():
        return ["README.md is missing"]

    text = readme_path.read_text(errors="ignore")
    audio_count = 0
    for generation in generations:
        storage_uri = generation.get("storage_uri")
        if not isinstance(storage_uri, str):
            continue
        target = (project_root / storage_uri).resolve()
        try:
            target.relative_to(project_root)
        except ValueError:
            continue
        if target.exists():
            audio_count += 1
    hybrid_reviewed = sum(1 for report in reports if report.get("review_status") == "hybrid_reviewed")
    agent_draft = sum(1 for report in reports if report.get("review_status") == "agent_draft")

    expectations = [
        ("prompt count", rf"{len(prompts)}\s+schema-valid Atlas prompts"),
        ("generation metadata count", rf"{len(generations)}\s+generation metadata records"),
        ("local audio count", rf"{audio_count}\s+local audio files"),
        ("JSON report count", rf"{len(reports)}\s+JSON reports"),
        ("hybrid-reviewed seed report count", rf"{hybrid_reviewed}\s+hybrid-reviewed seed reports"),
        ("agent-draft report count", rf"{agent_draft}\s+agent-draft reports"),
    ]

    errors = []
    for label, pattern in expectations:
        if not re.search(pattern, text):
            errors.append(f"README {label} does not match derived data ({pattern})")
    return errors


def check_strict_quality(project_root: Path, suite: dict, generations: list[dict], reports: list[dict], scores: list[dict]) -> list[str]:
    errors = []

    for generation in generations:
        if generation.get("model_version") in ("needs verification", "", None):
            errors.append(f"Generation {generation['audio_id']}: unresolved model_version")
        uri = generation.get("storage_uri", "")
        private_roots = ("/" + "Users" + "/", "/" + "home" + "/")
        if uri.startswith(private_roots) or ":\\\\" in uri or uri.startswith("$"):
            errors.append(f"Generation {generation['audio_id']}: storage_uri is machine-specific")
        if not generation.get("akouo_report_id"):
            errors.append(f"Generation {generation['audio_id']}: missing akouo_report_id")

    for model in suite.get("models_compared", []):
        if model.get("status") in ("configured_missing_key", "not_installed", "not_implemented", "failed"):
            errors.append(f"Suite model {model.get('provider_id')}: status {model.get('status')} is not releasable")

    if suite.get("benchmark_status") == "ml_benchmark" and suite.get("ml_generation_count", 0) == 0:
        errors.append("Suite claims ml_benchmark but has zero ML generations")
    if suite.get("benchmark_status") == "procedural_pilot" and suite.get("ml_generation_count", 0) > 0:
        errors.append("Suite is procedural_pilot but includes ML generations")

    reviewed_count = 0
    interpreted_count = 0
    recommendation_counts = Counter()
    for report in reports:
        recommendation_counts[report.get("regeneration_recommendation")] += 1
        if report.get("report_type") == "listening_report":
            claims = report.get("claim_taxonomy", {})
            if not claims.get("heard") and not claims.get("interpreted") and not claims.get("undetermined"):
                errors.append(f"Report {report['report_id']}: empty heard/interpreted/undetermined buckets")
        if report.get("review_status") in ("human_reviewed", "hybrid_reviewed"):
            reviewed_count += 1
            if not report.get("claim_taxonomy", {}).get("heard"):
                errors.append(f"Reviewed report {report['report_id']}: empty heard bucket")
            if report.get("claim_taxonomy", {}).get("interpreted"):
                interpreted_count += 1

    if reviewed_count < 50:
        errors.append(f"Reviewed reports: expected at least 50, got {reviewed_count}")
    if interpreted_count < 30:
        errors.append(f"Reviewed interpreted reports: expected at least 30, got {interpreted_count}")
    if len({k for k, v in recommendation_counts.items() if v}) < 3:
        errors.append(f"Regeneration recommendations need keep/revise/reject distribution, got {dict(recommendation_counts)}")

    values_by_axis = defaultdict(set)
    for score in scores:
        for axis in CORE_SCORE_AXES:
            value = score.get("final_scores", {}).get(axis)
            if isinstance(value, (int, float)):
                values_by_axis[axis].add(value)
        if not score.get("score_provenance"):
            errors.append(f"Score {score.get('audio_id')}: missing score_provenance")
    for axis in CORE_SCORE_AXES:
        if len(values_by_axis[axis]) <= 1:
            errors.append(f"Score axis {axis}: constant across benchmark")

    scan_paths = [
        project_root / "README.md",
        project_root / "docs",
        project_root / "benchmark" / "suites",
        project_root / "benchmark" / "scores",
        project_root / "generations" / "metadata",
    ]
    for scan_path in scan_paths:
        files = scan_path.rglob("*") if scan_path.is_dir() else [scan_path]
        for path in files:
            if path.is_dir():
                continue
            if path.name == "DEVELOPMENT_PLAN.md":
                continue
            text = path.read_text(errors="ignore")
            if "needs verification" in text:
                errors.append(f"Unresolved placeholder in {path.relative_to(project_root)}")

    return errors


def print_report(prompts: list[dict], generations: list[dict], reports: list[dict], scores: list[dict], suite: dict) -> None:
    print("\nAudit report")
    print(f"  prompts: {len(prompts)}")
    print(f"  generations: {len(generations)}")
    print(f"  reports: {len(reports)}")
    print(f"  scores: {len(scores)}")
    print(f"  suite status: {suite.get('benchmark_status')}")
    print(f"  models: {Counter(g['model'] for g in generations)}")
    print(f"  review status: {Counter(r['review_status'] for r in reports)}")
    print(f"  recommendations: {Counter(r['regeneration_recommendation'] for r in reports)}")
    private_roots = ("/" + "Users" + "/", "/" + "home" + "/")
    print(f"  absolute storage URIs: {sum(str(g.get('storage_uri','')).startswith(private_roots) for g in generations)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Algophony dataset.")
    parser.add_argument("--strict", action="store_true", help="Enable release-quality checks.")
    parser.add_argument("--report", action="store_true", help="Print audit counts.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    schema_dir = project_root / "schemas"
    registry = build_schema_registry(schema_dir)

    schemas = {
        "prompt": load_json(schema_dir / "prompt.schema.json"),
        "generation": load_json(schema_dir / "generation.schema.json"),
        "report": load_json(schema_dir / "listening-report.schema.json"),
        "score_record": load_json(schema_dir / "benchmark-run.schema.json"),
        "suite": load_json(schema_dir / "benchmark-suite.schema.json"),
    }

    print("Algophony Dataset Validation\n")
    all_errors: list[str] = []

    prompt_records = load_jsonl(project_root / "atlas/prompts/algophony-atlas-v0.1.jsonl")
    generation_records = load_jsonl(project_root / "generations/metadata/generations-v0.1.jsonl")
    analysis_records = load_jsonl(project_root / "generations/metadata/audio-analysis-v0.1.jsonl")
    score_records = load_jsonl(project_root / "benchmark/scores/scores-v0.1.jsonl")

    report_records = []
    for path in sorted((project_root / "reports/json").glob("AK-*.json")):
        try:
            report_records.append((0, json.loads(path.read_text()), None))
        except json.JSONDecodeError as e:
            report_records.append((0, None, f"{path.name}: {e}"))

    all_errors.extend(validate_records(prompt_records, schemas["prompt"], "prompt_id", "Prompts", registry))
    all_errors.extend(validate_records(generation_records, schemas["generation"], "audio_id", "Generations", registry))
    all_errors.extend(validate_records(report_records, schemas["report"], "report_id", "Reports", registry))
    all_errors.extend(validate_records(score_records, schemas["score_record"], "audio_id", "Scores", registry))

    suite_path = project_root / "benchmark/suites/algophony-benchmark-lite-v0.1.json"
    all_errors.extend(validate_json_file(suite_path, schemas["suite"], "Benchmark suite", registry))
    suite = load_json(suite_path) or {}

    prompts = jsonl_values(prompt_records)
    generations = jsonl_values(generation_records)
    analysis = jsonl_values(analysis_records)
    reports = jsonl_values(report_records)
    scores = jsonl_values(score_records)

    balance_errors = check_category_balance(prompts)
    all_errors.extend(balance_errors)
    print(f"  {'OK' if not balance_errors else 'FAIL'} Category balance: {len(balance_errors)} issue(s)")

    xref_errors = check_cross_refs(prompts, generations, reports, scores)
    all_errors.extend(xref_errors)
    print(f"  {'OK' if not xref_errors else 'FAIL'} Cross references: {len(xref_errors)} issue(s)")

    markdown_errors = check_markdown_parity(project_root / "reports", reports)
    all_errors.extend(markdown_errors)
    print(f"  {'OK' if not markdown_errors else 'FAIL'} Markdown parity: {len(markdown_errors)} issue(s)")

    analysis_errors = check_analysis(analysis, generations)
    all_errors.extend(analysis_errors)
    print(f"  {'OK' if not analysis_errors else 'FAIL'} Audio analysis: {len(analysis_errors)} issue(s)")

    if args.strict:
        readme_errors = check_readme_counts(project_root, prompts, generations, reports)
        all_errors.extend(readme_errors)
        print(f"  {'OK' if not readme_errors else 'FAIL'} README corpus counts: {len(readme_errors)} issue(s)")

        strict_errors = check_strict_quality(project_root, suite, generations, reports, scores)
        all_errors.extend(strict_errors)
        print(f"  {'OK' if not strict_errors else 'FAIL'} Strict release quality: {len(strict_errors)} issue(s)")

    if args.report:
        print_report(prompts, generations, reports, scores, suite)

    print()
    if all_errors:
        print(f"FAILED: {len(all_errors)} total issue(s).")
        for error in all_errors[:80]:
            print(f"  - {error}")
        if len(all_errors) > 80:
            print(f"  ... {len(all_errors) - 80} more")
        sys.exit(1)

    print("PASSED: Dataset validation complete.")


if __name__ == "__main__":
    main()
