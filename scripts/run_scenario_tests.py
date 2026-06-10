#!/usr/bin/env python3
"""
Run destructive validation scenarios against a temporary copy of the repository.

The scenarios mirror the post-implementation audit plan:
  1. Suite schema mismatch.
  2. Absolute local storage path.
  3. Empty interpretive report buckets.
  4. Constant score axis.
  5. Incorrect ML benchmark claim with only procedural controls.

Optional flags can run the slower dashboard build and fresh virtualenv install.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


IGNORE_DIRS = {
    ".git",
    ".next",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
}


def ignore_names(_: str, names: list[str]) -> set[str]:
    ignored = {name for name in names if name in IGNORE_DIRS}
    if "audio" in names:
        ignored.add("audio")
    return ignored


def copy_repo(project_root: Path, target: Path) -> None:
    shutil.copytree(project_root, target, ignore=ignore_names)
    audio_dir = target / "generations" / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    (audio_dir / ".gitkeep").touch()


def run(cmd: list[str], cwd: Path, expect_fail: bool = False) -> tuple[bool, str]:
    result = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    ok = result.returncode != 0 if expect_fail else result.returncode == 0
    output = (result.stdout + "\n" + result.stderr).strip()
    return ok, output


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.write_text("\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n")


def scenario_suite_schema_mismatch(root: Path) -> None:
    suite_path = root / "benchmark" / "suites" / "algophony-benchmark-lite-v0.1.json"
    suite = json.loads(suite_path.read_text())
    suite["suite_id"] = suite.pop("id")
    suite_path.write_text(json.dumps(suite, indent=2) + "\n")


def scenario_absolute_path(root: Path) -> None:
    path = root / "generations" / "metadata" / "generations-v0.1.jsonl"
    records = read_jsonl(path)
    records[0]["storage_uri"] = "$HOME/example/private/ALG-0001.wav"
    write_jsonl(path, records)


def scenario_bad_report(root: Path) -> None:
    path = root / "reports" / "json" / "AK-0001.json"
    report = json.loads(path.read_text())
    report["report_type"] = "listening_report"
    report["review_status"] = "hybrid_reviewed"
    report["claim_taxonomy"]["heard"] = []
    report["claim_taxonomy"]["interpreted"] = []
    report["claim_taxonomy"]["undetermined"] = []
    path.write_text(json.dumps(report, indent=2) + "\n")


def scenario_constant_score(root: Path) -> None:
    path = root / "benchmark" / "scores" / "scores-v0.1.jsonl"
    records = read_jsonl(path)
    for record in records:
        record["final_scores"]["source_accuracy"] = 1
        for score_set in ("signal_scores", "agent_scores", "human_scores", "final_scores"):
            scores = record["score_sets"].get(score_set)
            if scores:
                scores["source_accuracy"] = 1
    write_jsonl(path, records)


def scenario_bad_model_coverage(root: Path) -> None:
    suite_path = root / "benchmark" / "suites" / "algophony-benchmark-lite-v0.1.json"
    suite = json.loads(suite_path.read_text())
    suite["benchmark_status"] = "ml_benchmark"
    suite["ml_generation_count"] = 0
    suite_path.write_text(json.dumps(suite, indent=2) + "\n")


SCENARIOS = [
    ("suite schema mismatch", scenario_suite_schema_mismatch, "Benchmark suite"),
    ("path hygiene", scenario_absolute_path, "storage_uri"),
    ("report quality", scenario_bad_report, "empty heard"),
    ("score variance", scenario_constant_score, "constant across benchmark"),
    ("model coverage", scenario_bad_model_coverage, "zero ML generations"),
]


def run_mutation_scenarios(project_root: Path) -> bool:
    passed = True
    with tempfile.TemporaryDirectory(prefix="algophony-scenarios-") as tmp:
        base = Path(tmp)
        for name, mutate, expected_text in SCENARIOS:
            work = base / name.replace(" ", "-")
            copy_repo(project_root, work)
            mutate(work)
            ok, output = run(
                [sys.executable, "scripts/validate_dataset.py", "--strict"],
                cwd=work,
                expect_fail=True,
            )
            found = expected_text in output
            status = "PASS" if ok and found else "FAIL"
            print(f"{status} {name}")
            if not ok or not found:
                passed = False
                print(output[-2000:])
    return passed


def run_dashboard_build(project_root: Path) -> bool:
    ok, output = run(["npm", "run", "build"], cwd=project_root / "apps" / "web")
    print(("PASS" if ok and "Turbopack build encountered" not in output else "FAIL") + " dashboard build")
    if "Turbopack build encountered" in output:
        print(output)
        return False
    if not ok:
        print(output)
    return ok


def run_fresh_install(project_root: Path) -> bool:
    with tempfile.TemporaryDirectory(prefix="algophony-venv-") as tmp:
        venv = Path(tmp) / "venv"
        ok, output = run([sys.executable, "-m", "venv", str(venv)], cwd=project_root)
        if not ok:
            print("FAIL fresh install: venv")
            print(output)
            return False
        python = venv / "bin" / "python"
        ok, output = run([str(python), "-m", "pip", "install", "-r", "requirements.txt"], cwd=project_root)
        if not ok:
            print("FAIL fresh install: pip")
            print(output)
            return False
        ok, output = run([str(python), "scripts/validate_dataset.py"], cwd=project_root)
        print(("PASS" if ok else "FAIL") + " fresh install")
        if not ok:
            print(output)
        return ok


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Algophony scenario tests.")
    parser.add_argument("--include-dashboard-build", action="store_true")
    parser.add_argument("--include-fresh-install", action="store_true")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    passed = run_mutation_scenarios(project_root)

    if args.include_dashboard_build:
        passed = run_dashboard_build(project_root) and passed
    if args.include_fresh_install:
        passed = run_fresh_install(project_root) and passed

    if not passed:
        sys.exit(1)
    print("PASSED: Scenario tests complete.")


if __name__ == "__main__":
    main()
