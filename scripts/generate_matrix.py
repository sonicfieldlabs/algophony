#!/usr/bin/env python3
"""
Generate soundscapes across selected prompt IDs and providers.

Usage:
    python scripts/generate_matrix.py --providers synth_baseline --limit 5
    python scripts/generate_matrix.py --providers el_sfx --prompt-ids ALG-0001,ALG-0011 --variants 2
    python scripts/generate_matrix.py --providers synth_baseline,el_sfx --limit 10 --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

from workers.pipeline import run_pipeline


def load_prompts(path: Path, limit: int | None = None,
                 prompt_ids: list[str] | None = None,
                 categories: list[str] | None = None) -> list[dict]:
    """Load prompt records from JSONL, optionally filtering."""
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
            if categories and record.get("category") not in categories:
                continue
            prompts.append(record)

    if limit:
        prompts = prompts[:limit]
    return prompts


def main():
    parser = argparse.ArgumentParser(description="Run Algophony generation matrix.")
    parser.add_argument("--prompts", default="atlas/prompts/algophony-atlas-v0.1.jsonl",
                        help="Path to prompt JSONL file.")
    parser.add_argument("--providers", required=True,
                        help="Comma-separated provider IDs (el_sfx, synth_baseline).")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max prompts to process.")
    parser.add_argument("--prompt-ids", default=None,
                        help="Comma-separated specific prompt IDs.")
    parser.add_argument("--categories", default=None,
                        help="Comma-separated categories to filter.")
    parser.add_argument("--variants", type=int, default=1,
                        help="Variants per prompt per provider (default: 1).")
    parser.add_argument("--delay", type=float, default=2.0,
                        help="Delay between API calls in seconds.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show plan without generating.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    prompt_path = Path(args.prompts)
    if not prompt_path.is_absolute():
        prompt_path = project_root / prompt_path

    provider_ids = [p.strip() for p in args.providers.split(",")]
    prompt_ids = [p.strip() for p in args.prompt_ids.split(",")] if args.prompt_ids else None
    categories = [c.strip() for c in args.categories.split(",")] if args.categories else None

    prompts = load_prompts(prompt_path, args.limit, prompt_ids, categories)

    if not prompts:
        print("No prompts found matching criteria.")
        sys.exit(0)

    total = len(prompts) * len(provider_ids) * args.variants
    print(f"Generation matrix: {len(prompts)} prompts × {len(provider_ids)} providers × {args.variants} variants = {total} generations\n")

    if args.dry_run:
        for prompt in prompts:
            for provider in provider_ids:
                for v in range(args.variants):
                    variant = chr(65 + v)
                    print(f"  [DRY RUN] {prompt['prompt_id']} ({prompt['category']}) × {provider} × {variant}")
        print(f"\nDry run complete. {total} generation(s) planned.")
        sys.exit(0)

    results = run_pipeline(
        prompts=prompts,
        providers=provider_ids,
        variants=args.variants,
        delay_seconds=args.delay,
        storage_dir=str(project_root / "generations" / "audio"),
        metadata_path=str(project_root / "generations" / "metadata" / "generations-v0.1.jsonl"),
    )

    print(f"\n{'='*40}")
    print(f"Successes: {len(results['successes'])}")
    print(f"Failures:  {len(results['failures'])}")
    if results['failures']:
        for f in results['failures'][:5]:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
