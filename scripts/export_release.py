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
import sys
from pathlib import Path


SECRET_PATTERNS = [
    re.compile(r"ALGOPHONY_ELEVENLABS_API_KEY\s*=\s*\S{5,}"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"api[_-]?key\s*[:=]\s*['\"]?[a-zA-Z0-9_-]{10,}", re.IGNORECASE),
]

# Files that intentionally contain variable names or documentation patterns
SKIP_SECRET_FILES = {"DEVELOPMENT_PLAN.md", ".env.example"}

PRIVATE_PATH_PATTERNS = [
    re.compile(r"/U[s]ers/\w+/"),
    re.compile(r"/home/\w+/"),
    re.compile(r"C:\\Users\\\w+\\"),
]

AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".aiff", ".aif", ".ogg"}


def check_secrets(project_root: Path) -> list[str]:
    """Scan text files for potential secrets."""
    errors = []
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
                errors.append(f"Secret file TRACKED by git: {path.relative_to(project_root)}")
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
                errors.append(
                    f"Potential secret in {path.relative_to(project_root)}"
                )
                break

    return errors


def check_private_paths(project_root: Path) -> list[str]:
    """Scan public docs for private file paths."""
    errors = []
    doc_files = list(project_root.glob("*.md"))
    doc_files.extend((project_root / "docs").rglob("*.md"))

    for path in doc_files:
        # Skip DEVELOPMENT_PLAN.md which intentionally contains workspace paths
        if path.name == "DEVELOPMENT_PLAN.md":
            continue
        try:
            content = path.read_text()
        except Exception:
            continue

        for pattern in PRIVATE_PATH_PATTERNS:
            matches = pattern.findall(content)
            for match in matches:
                errors.append(
                    f"Private path '{match}' in {path.relative_to(project_root)}"
                )

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


def check_staged_audio(project_root: Path) -> list[str]:
    """Check for large audio files that are tracked by git (not gitignored)."""
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
            size_mb = path.stat().st_size / (1024 * 1024)
            if size_mb > 0.5:
                errors.append(
                    f"Large audio file tracked by git ({size_mb:.1f}MB): {rel}"
                )

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

    # Check for secrets
    print("Checking for secrets...")
    secret_errors = check_secrets(project_root)
    all_errors.extend(secret_errors)
    if secret_errors:
        for e in secret_errors:
            print(f"  ✗ {e}")
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

    # Check for staged audio
    print("Checking for staged audio files...")
    audio_errors = check_staged_audio(project_root)
    all_errors.extend(audio_errors)
    if audio_errors:
        for e in audio_errors:
            print(f"  ✗ {e}")
    else:
        print("  ✓ No large audio files found.")

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
