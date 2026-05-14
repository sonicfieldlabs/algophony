#!/usr/bin/env python3
"""
Generate soundscapes across selected prompt IDs and providers.

Usage:
    python scripts/generate_matrix.py \\
        --prompts atlas/prompts/algophony-atlas-v0.1.jsonl \\
        --providers scaper,elevenlabs_sfx \\
        --limit 10

    python scripts/generate_matrix.py \\
        --prompts atlas/prompts/algophony-atlas-v0.1.jsonl \\
        --providers scaper \\
        --prompt-ids ALG-0001,ALG-0002,ALG-0003 \\
        --variants 3

Status: Stub — adapter implementations required in workers/adapters/.
"""

import argparse
import json
import sys
from pathlib import Path


def load_prompts(path: Path, limit: int | None = None,
                 prompt_ids: list[str] | None = None) -> list[dict]:
    """Load prompt records from JSONL, optionally filtering by IDs and limit."""
    prompts = []
    if not path.exists():
        print(f"Error: Prompt file not found: {path}")
        sys.exit(1)

    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if prompt_ids and record.get("prompt_id") not in prompt_ids:
                continue
            prompts.append(record)

    if limit:
        prompts = prompts[:limit]

    return prompts


def main():
    parser = argparse.ArgumentParser(description="Run Algophony generation matrix.")
    parser.add_argument("--prompts", required=True, help="Path to prompt JSONL file.")
    parser.add_argument("--providers", required=True,
                        help="Comma-separated list of provider IDs.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Maximum number of prompts to process.")
    parser.add_argument("--prompt-ids", default=None,
                        help="Comma-separated list of specific prompt IDs.")
    parser.add_argument("--variants", type=int, default=3,
                        help="Number of variants per prompt per provider (default: 3).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be generated without running.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    prompt_path = Path(args.prompts)
    if not prompt_path.is_absolute():
        prompt_path = project_root / prompt_path

    provider_ids = [p.strip() for p in args.providers.split(",")]
    prompt_ids = [p.strip() for p in args.prompt_ids.split(",")] if args.prompt_ids else None

    prompts = load_prompts(prompt_path, args.limit, prompt_ids)

    if not prompts:
        print("No prompts found matching criteria.")
        sys.exit(0)

    total = len(prompts) * len(provider_ids) * args.variants
    print(f"Generation matrix: {len(prompts)} prompts × {len(provider_ids)} providers × {args.variants} variants = {total} generations\n")

    if args.dry_run:
        for prompt in prompts:
            for provider in provider_ids:
                for v in range(args.variants):
                    variant = chr(65 + v)  # A, B, C, ...
                    print(f"  [DRY RUN] {prompt['prompt_id']} × {provider} × {variant}")
        print(f"\nDry run complete. {total} generation(s) planned.")
        sys.exit(0)

    # TODO: Import and instantiate adapters from workers/adapters/
    print("Error: Generation adapters not yet implemented.")
    print("Implement adapters in workers/adapters/ and update this script.")
    sys.exit(1)


if __name__ == "__main__":
    main()
