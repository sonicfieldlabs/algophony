#!/usr/bin/env python3
"""
Create a sanitized fresh-history Algophony public export.

The public repository contains full local-mode code and empty data directories,
but excludes the local benchmark corpus, generated metadata, reports, audio,
uploads, secrets, caches, and private machine paths.
"""

from __future__ import annotations

import argparse
import fnmatch
import os
import shutil
import subprocess
import sys
from pathlib import Path


INCLUDE_ROOTS = [
    ".github",
    "apps",
    "atlas/taxonomies",
    "docs",
    "schemas",
    "scripts",
    "workers",
]

INCLUDE_FILES = [
    ".env.example",
    ".gitignore",
    "AGENTS.md",
    "DEVELOPMENT_PLAN.md",
    "LICENSE",
    "PUBLICATION_POLICY.md",
    "README.md",
    "ROADMAP.md",
    "replan.md",
    "requirements.txt",
    "requirements-cloud.txt",
    "requirements-local-audio.txt",
    "requirements-local-macos-mlx.txt",
    "benchmark/exports/provider-status.json",
]

EXCLUDE_PATTERNS = [
    ".git/**",
    "**/.DS_Store",
    "**/.env",
    "**/.env.local",
    "**/.next/**",
    "**/.turbo/**",
    "**/__pycache__/**",
    "**/.pytest_cache/**",
    "**/.ruff_cache/**",
    "**/.mypy_cache/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.pyc",
    "apps/web/package-lock.json.bak",
    "atlas/prompts/algophony-atlas-v0.1.jsonl",
    "benchmark/exports/model-comparison-v0.1.*",
    "benchmark/scores/**",
    "benchmark/suites/algophony-benchmark-lite-v0.1.json",
    "generations/metadata/*.jsonl",
    "generations/audio/*",
    "reports/json/**",
    "reports/markdown/**",
    "uploads/**",
    "**/*.wav",
    "**/*.mp3",
    "**/*.flac",
    "**/*.aiff",
    "**/*.aif",
    "**/*.ogg",
]

EMPTY_DIRS = [
    "atlas/prompts",
    "benchmark/exports",
    "benchmark/scores",
    "benchmark/suites",
    "generations/audio",
    "generations/metadata",
    "reports/json",
    "reports/markdown",
    "uploads/audio",
    "uploads/metadata",
]

README_TEXT = {
    "atlas/prompts/README.md": "# Public Prompt Data\n\nThe full local Atlas prompt corpus is not included in the public code export. Add schema-valid JSONL data here or mount local data with `ALGOPHONY_DATA_ROOT`.\n",
    "benchmark/README.md": "# Public Benchmark Data\n\nBenchmark machinery is included, but local benchmark result data is excluded from the public code export.\n",
    "generations/README.md": "# Public Generation Data\n\nGenerated metadata and audio files are local research data and are excluded from the public code export.\n",
    "reports/README.md": "# Public Reports\n\nListening report corpora are local research data and are excluded from the public code export.\n",
    "uploads/README.md": "# Uploads\n\nUploads are local-only and gitignored. Public exports include only empty directories.\n",
}

PRIVATE_PATH_PATTERNS = [
    "/" + "Users" + "/",
    "/" + "home" + "/",
    "C:" + "\\Users\\",
]


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def excluded(rel_path: str) -> bool:
    return any(fnmatch.fnmatch(rel_path, pattern) for pattern in EXCLUDE_PATTERNS)


def copy_path(src: Path, dst: Path, root: Path, dry_run: bool, copied: list[str]) -> None:
    if src.is_dir():
        for child in sorted(src.rglob("*")):
            if child.is_dir():
                continue
            copy_path(child, dst, root, dry_run, copied)
        return

    rel_path = rel(src, root)
    if excluded(rel_path):
        return
    if not src.exists():
        return
    copied.append(rel_path)
    if dry_run:
        return
    target = dst / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)


def sanitize_text_files(out_dir: Path, dry_run: bool) -> list[str]:
    changed = []
    text_suffixes = {".md", ".mdx", ".txt", ".json", ".jsonl", ".csv", ".ts", ".tsx", ".py", ".js", ".mjs", ".yml", ".yaml"}
    for path in out_dir.rglob("*"):
        if path.is_dir() or path.suffix not in text_suffixes:
            continue
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        updated = text
        user_root = "/" + "Users" + "/" + "na" + "vi"
        updated = updated.replace(f"{user_root}/workspace/algophony", "$SFL_ROOT/algophony")
        updated = updated.replace(f"{user_root}/workspace/akouo", "$SFL_ROOT/akouo")
        updated = updated.replace(f"{user_root}/workspace/bench", "$SFL_ROOT/bench")
        updated = updated.replace(f"{user_root}/workspace/sonic field labs", "$SFL_ROOT/sonic-field-labs")
        updated = updated.replace(f"{user_root}/", "$HOME/")
        if updated != text:
            changed.append(path.relative_to(out_dir).as_posix())
            if not dry_run:
                path.write_text(updated)
    return changed


def validate_no_private_paths(out_dir: Path) -> list[str]:
    errors = []
    text_suffixes = {".md", ".mdx", ".txt", ".json", ".jsonl", ".csv", ".ts", ".tsx", ".py", ".js", ".mjs", ".yml", ".yaml"}
    for path in out_dir.rglob("*"):
        if path.is_dir() or path.suffix not in text_suffixes:
            continue
        text = path.read_text(errors="ignore")
        for pattern in PRIVATE_PATH_PATTERNS:
            if pattern in text:
                errors.append(path.relative_to(out_dir).as_posix())
                break
    return errors


def write_public_markers(out_dir: Path, dry_run: bool) -> None:
    if dry_run:
        return
    (out_dir / ".algophony-public-export").write_text("This tree was generated by scripts/prepare_public_export.py.\n")
    for directory in EMPTY_DIRS:
        target = out_dir / directory
        target.mkdir(parents=True, exist_ok=True)
        (target / ".gitkeep").touch()
    for rel_path, text in README_TEXT.items():
        path = out_dir / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)


def run_hygiene(out_dir: Path) -> int:
    result = subprocess.run(
        [sys.executable, "scripts/export_release.py", "--dry-run"],
        cwd=out_dir,
        text=True,
        capture_output=True,
    )
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare sanitized Algophony public export.")
    parser.add_argument("--out", default=None, help="Output directory for export.")
    parser.add_argument("--dry-run", action="store_true", help="List export plan without writing files.")
    parser.add_argument("--force", action="store_true", help="Delete existing output directory first.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    out_dir = Path(args.out).resolve() if args.out else root.parent / "algophony-public-release"

    copied: list[str] = []
    if not args.dry_run:
        if out_dir.exists():
            if not args.force:
                print(f"Output exists: {out_dir}. Use --force to replace it.", file=sys.stderr)
                return 2
            shutil.rmtree(out_dir)
        out_dir.mkdir(parents=True)

    for rel_root in INCLUDE_ROOTS:
        copy_path(root / rel_root, out_dir, root, args.dry_run, copied)
    for rel_file in INCLUDE_FILES:
        copy_path(root / rel_file, out_dir, root, args.dry_run, copied)

    if args.dry_run:
        print(f"Would export {len(copied)} files to {out_dir}")
        for item in copied[:200]:
            print(f"  {item}")
        if len(copied) > 200:
            print(f"  ... {len(copied) - 200} more")
        return 0

    write_public_markers(out_dir, args.dry_run)
    changed = sanitize_text_files(out_dir, args.dry_run)
    private_path_errors = validate_no_private_paths(out_dir)
    if private_path_errors:
        print("Private paths remain in public export:", file=sys.stderr)
        for item in private_path_errors:
            print(f"  {item}", file=sys.stderr)
        return 1

    hygiene_code = run_hygiene(out_dir)
    if hygiene_code != 0:
        return hygiene_code

    print(f"\nExported {len(copied)} files to {out_dir}")
    if changed:
        print(f"Sanitized private paths in {len(changed)} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
