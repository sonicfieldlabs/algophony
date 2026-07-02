#!/usr/bin/env python3
"""
Assemble public release package and run hygiene checks.

Checks:
  - No secrets (.env, .env.local, API keys)
  - No private file paths (home directories, local system paths)
  - No missing license fields in generation metadata
  - Schema validation passes
  - No large audio files accidentally staged for git

Usage:
    python scripts/export_release.py --dry-run
    python scripts/export_release.py --out release/
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


SECRET_PATTERNS = [
    re.compile(r"ALGOPHONY_ELEVENLABS_API_KEY\s*=\s*\S{5,}"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9_-]{10,}['\"]", re.IGNORECASE),
]

# Files that intentionally contain empty variable names. Values are still
# forbidden by SECRET_PATTERNS.
SKIP_SECRET_FILES = {".env.example"}

PRIVATE_PATH_PATTERNS = [
    re.compile(re.escape("/" + "Users" + "/") + r"\w+/"),
    re.compile(re.escape("/" + "home" + "/") + r"\w+/"),
    re.compile(re.escape("C:" + "\\Users\\") + r"\w+\\"),
]

AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".aiff", ".aif", ".ogg"}


def check_secrets(project_root: Path) -> list[str]:
    """Scan text files for potential secrets."""
    locations = []
    skip_dirs = {".git", "node_modules", "__pycache__", ".next", "dist", "build"}

    for path in project_root.rglob("*"):
        if path.is_dir():
            continue
        if any(skip in path.parts for skip in skip_dirs):
            continue
        if path.suffix in AUDIO_EXTENSIONS:
            continue
        if path.name in (".env", ".env.local"):
            # Check if tracked by git
            import subprocess
            result = subprocess.run(
                ["git", "ls-files", str(path.relative_to(project_root))],
                capture_output=True, text=True, cwd=project_root
            )
            if result.stdout.strip():
                locations.append(str(path.relative_to(project_root)))
            else:
                print(f"  ℹ {path.relative_to(project_root)} exists but is gitignored (OK)")
            continue
        if path.name in SKIP_SECRET_FILES:
            continue

        try:
            content = path.read_text(errors="ignore")
        except Exception:
            continue

        for pattern in SECRET_PATTERNS:
            if pattern.search(content):
                locations.append(str(path.relative_to(project_root)))
                break

    return locations


def check_private_paths(project_root: Path) -> list[str]:
    """Scan public text files for private file paths."""
    errors = []
    skip_dirs = {".git", "node_modules", "__pycache__", ".next", "dist", "build"}
    text_suffixes = {".md", ".mdx", ".txt", ".json", ".jsonl", ".csv", ".ts", ".tsx", ".py", ".js", ".mjs", ".yml", ".yaml"}

    for path in project_root.rglob("*"):
        if path.is_dir():
            continue
        if any(skip in path.parts for skip in skip_dirs):
            continue
        if path.suffix not in text_suffixes and path.name not in {"AGENTS.md", "README.md", "PUBLICATION_POLICY.md"}:
            continue
        try:
            content = path.read_text(errors="ignore")
        except Exception:
            continue

        for pattern in PRIVATE_PATH_PATTERNS:
            matches = pattern.findall(content)
            for match in matches:
                errors.append(
                    f"Private path '{match}' in {path.relative_to(project_root)}"
                )

    return errors


def check_public_export_data_policy(project_root: Path) -> list[str]:
    """When run inside a public export, ensure local corpus data is absent."""
    errors = []
    marker = project_root / ".algophony-public-export"
    if not marker.exists():
        return errors

    forbidden_globs = [
        "atlas/prompts/*.jsonl",
        "generations/metadata/*.jsonl",
        "reports/json/*.json",
        "reports/markdown/*.md",
        "benchmark/scores/*",
        "benchmark/exports/model-comparison-v0.1.*",
        "benchmark/suites/algophony-benchmark-lite-v0.1.json",
        "uploads/**/*",
    ]
    for pattern in forbidden_globs:
        for path in project_root.glob(pattern):
            if path.is_file() and path.name not in {".gitkeep", "README.md"}:
                errors.append(f"Public export contains local corpus data: {path.relative_to(project_root)}")

    for ext in AUDIO_EXTENSIONS:
        for path in project_root.rglob(f"*{ext}"):
            if ".git" in path.parts:
                continue
            if path.name != ".gitkeep":
                errors.append(f"Public export contains audio binary: {path.relative_to(project_root)}")

    return errors


def check_license_fields(project_root: Path) -> list[str]:
    """Check that generation metadata has license_status fields."""
    errors = []
    gen_path = project_root / "generations" / "metadata" / "generations-v0.1.jsonl"

    if not gen_path.exists():
        return errors

    with open(gen_path) as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                if not record.get("license_status"):
                    errors.append(
                        f"Generation line {i} ({record.get('audio_id', '?')}): missing license_status"
                    )
            except json.JSONDecodeError:
                pass

    return errors


def check_required_files(project_root: Path) -> list[str]:
    """Check release-critical files exist."""
    errors = []
    required = [
        "LICENSE",
        "requirements.txt",
        ".env.example",
        "docs/dataset-card-v0.1.md",
        "docs/benchmark-methodology.md",
        "docs/release-checklist.md",
        "apps/web/README.md",
        "benchmark/exports/provider-status.json",
    ]
    for rel_path in required:
        if not (project_root / rel_path).exists():
            errors.append(f"Missing required release file: {rel_path}")
    return errors


def check_strict_validation(project_root: Path) -> list[str]:
    """Run strict dataset validation as part of release readiness."""
    if (project_root / ".algophony-public-export").exists():
        data_files = [
            project_root / "atlas" / "prompts" / "algophony-atlas-v0.1.jsonl",
            project_root / "generations" / "metadata" / "generations-v0.1.jsonl",
            project_root / "benchmark" / "scores" / "scores-v0.1.jsonl",
        ]
        if not any(path.exists() for path in data_files):
            print("  ℹ Public code export has no local corpus data; skipping strict dataset validation.")
            return []
    result = subprocess.run(
        [sys.executable, "scripts/validate_dataset.py", "--strict"],
        capture_output=True,
        text=True,
        cwd=project_root,
    )
    if result.returncode == 0:
        return []
    details = (result.stdout + "\n" + result.stderr).strip().splitlines()
    tail = "\n".join(details[-20:])
    return [f"Strict dataset validation failed:\n{tail}"]


def check_public_claims(project_root: Path) -> list[str]:
    """Ensure public docs do not overclaim procedural-pilot maturity."""
    errors = []
    suite_path = project_root / "benchmark" / "suites" / "algophony-benchmark-lite-v0.1.json"
    suite = json.loads(suite_path.read_text()) if suite_path.exists() else {}
    status = suite.get("benchmark_status")
    ml_count = suite.get("ml_generation_count", 0)

    if status == "procedural_pilot":
        required_docs = [
            project_root / "README.md",
            project_root / "docs" / "dataset-card-v0.1.md",
            project_root / "docs" / "benchmark-methodology.md",
        ]
        for path in required_docs:
            text = path.read_text(errors="ignore").lower()
            if "procedural pilot" not in text:
                errors.append(f"{path.relative_to(project_root)} must label the release as a procedural pilot")
        if ml_count != 0:
            errors.append("Suite is procedural_pilot but ml_generation_count is not zero")

    return errors


def check_staged_audio(project_root: Path) -> list[str]:
    """Check for audio files that are tracked by git (not gitignored)."""
    import subprocess
    errors = []

    # Only flag audio files that are actually tracked by git
    try:
        result = subprocess.run(
            ["git", "ls-files"], capture_output=True, text=True, cwd=project_root
        )
        tracked = set(result.stdout.strip().split("\n")) if result.stdout.strip() else set()
    except Exception:
        tracked = set()

    for ext in AUDIO_EXTENSIONS:
        for path in project_root.rglob(f"*{ext}"):
            if ".git" in path.parts:
                continue
            rel = str(path.relative_to(project_root))
            if rel not in tracked:
                continue  # gitignored — expected
            errors.append(f"Audio file tracked by git: {rel}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Algophony release hygiene check.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run checks without creating release package.")
    parser.add_argument("--out", default=None,
                        help="Output directory for release package.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent

    print("Algophony Release Hygiene Check\n")

    all_errors = []

    # Check required release files
    print("Checking required release files...")
    required_errors = check_required_files(project_root)
    all_errors.extend(required_errors)
    if required_errors:
        for e in required_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ Required files present.")

    # Check for secrets
    print("Checking for secrets...")
    secret_locations = check_secrets(project_root)
    if secret_locations:
        all_errors.append(f"Potential secrets detected in {len(secret_locations)} file(s)")
        print(f"  ✗ Potential secrets detected in {len(secret_locations)} file(s)")
    else:
        print("  ✓ No secrets found.")

    # Check for private paths
    print("Checking for private paths...")
    path_errors = check_private_paths(project_root)
    all_errors.extend(path_errors)
    if path_errors:
        for e in path_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ No private paths in public docs.")

    # Check license fields
    print("Checking license fields...")
    license_errors = check_license_fields(project_root)
    all_errors.extend(license_errors)
    if license_errors:
        for e in license_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ License fields OK.")

    # Check public claims
    print("Checking public release claims...")
    claim_errors = check_public_claims(project_root)
    all_errors.extend(claim_errors)
    if claim_errors:
        for e in claim_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ Public claims match suite status.")

    # Run strict validation
    print("Running strict dataset validation...")
    strict_errors = check_strict_validation(project_root)
    all_errors.extend(strict_errors)
    if strict_errors:
        for e in strict_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ Strict dataset validation passed.")

    # Check for staged audio
    print("Checking for staged audio files...")
    audio_errors = check_staged_audio(project_root)
    all_errors.extend(audio_errors)
    if audio_errors:
        for e in audio_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ No tracked audio files found.")

    # Check public export-only policy
    print("Checking public export data policy...")
    public_export_errors = check_public_export_data_policy(project_root)
    all_errors.extend(public_export_errors)
    if public_export_errors:
        for e in public_export_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ Public export data policy OK.")

    # Summary
    print()
    if all_errors:
        print(f"FAILED: {len(all_errors)} issue(s) found.")
        sys.exit(1)
    else:
        print("PASSED: Release hygiene check complete.")
        if args.dry_run:
            print("(Dry run — no release package created.)")
        sys.exit(0)


if __name__ == "__main__":
    main()
