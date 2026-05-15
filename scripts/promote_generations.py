#!/usr/bin/env python3
"""
Promote incoming generation metadata into the canonical dataset.

This script is intentionally conservative. It verifies generated audio files,
relative storage paths, hashes, model versions, license fields, and report IDs
before appending to generations-v0.1.jsonl.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_jsonl(path: Path, records: list[dict], append: bool = True) -> None:
    mode = "a" if append else "w"
    with path.open(mode) as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def next_report_ids(project_root: Path, count: int) -> list[str]:
    existing = set()
    for root in (project_root / "reports" / "json", project_root / "reports" / "markdown"):
        if root.exists():
            for path in root.glob("AK-*.*"):
                try:
                    existing.add(int(path.stem.replace("AK-", "")))
                except ValueError:
                    pass
    start = max(existing) + 1 if existing else 1
    return [f"AK-{i:04d}" for i in range(start, start + count)]


def validate_record(project_root: Path, record: dict) -> list[str]:
    errors = []
    uri = record.get("storage_uri", "")
    private_roots = ("/" + "Users" + "/", "/" + "home" + "/")
    if uri.startswith(private_roots) or ":\\\\" in uri:
        errors.append(f"{record.get('audio_id')}: storage_uri must be relative")
    audio_path = project_root / uri
    if not audio_path.exists():
        errors.append(f"{record.get('audio_id')}: audio file missing at {uri}")
    elif record.get("sha256"):
        actual = hashlib.sha256(audio_path.read_bytes()).hexdigest()
        if actual != record["sha256"]:
            errors.append(f"{record.get('audio_id')}: sha256 mismatch")
    else:
        errors.append(f"{record.get('audio_id')}: missing sha256")
    for field in ("audio_id", "prompt_id", "model", "model_version", "license_status", "file_format"):
        if not record.get(field):
            errors.append(f"{record.get('audio_id', '?')}: missing {field}")
    if not record.get("akouo_report_id"):
        errors.append(f"{record.get('audio_id')}: missing akouo_report_id")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote incoming Algophony generations.")
    parser.add_argument("--incoming", default="generations/metadata/incoming-generations-v0.1.jsonl")
    parser.add_argument("--canonical", default="generations/metadata/generations-v0.1.jsonl")
    parser.add_argument("--reserve-report-ids", action="store_true")
    parser.add_argument("--append-canonical", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    incoming_path = project_root / args.incoming
    canonical_path = project_root / args.canonical
    incoming = load_jsonl(incoming_path)
    if not incoming:
        print(f"No incoming records found at {incoming_path}")
        return

    if args.reserve_report_ids:
        ids = next_report_ids(project_root, len(incoming))
        for record, report_id in zip(incoming, ids, strict=True):
            record["akouo_report_id"] = record.get("akouo_report_id") or report_id

    all_errors = []
    for record in incoming:
        all_errors.extend(validate_record(project_root, record))
    if all_errors:
        print(f"FAILED: {len(all_errors)} issue(s).")
        for error in all_errors[:80]:
            print(f"  - {error}")
        sys.exit(1)

    print(f"Ready to promote {len(incoming)} generation record(s).")
    if args.dry_run:
        return
    if not args.append_canonical:
        print("Refusing to write without --append-canonical.")
        sys.exit(1)
    write_jsonl(canonical_path, incoming, append=True)
    print(f"Appended to {canonical_path}")


if __name__ == "__main__":
    main()
