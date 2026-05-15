#!/usr/bin/env python3
"""
Generate soundscapes across selected prompt IDs and providers.

Usage:
    python scripts/generate_matrix.py --providers synth_baseline --limit 5
    python scripts/generate_matrix.py --limit 1 --dry-run
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

from workers.pipeline import list_provider_statuses, resolve_providers, run_pipeline


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
    parser.add_argument("--providers", default="",
                        help="Comma-separated provider IDs. If omitted, uses configured default ML/API fallback chain.")
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
    parser.add_argument("--list-providers", action="store_true",
                        help="Print provider availability and exit.")
    parser.add_argument("--json", action="store_true",
                        help="Emit JSON with --list-providers.")
    parser.add_argument("--allow-procedural-fallback", action="store_true",
                        help="Allow default provider selection to fall back to synth_baseline.")
    parser.add_argument("--metadata-output", default="generations/metadata/incoming-generations-v0.1.jsonl",
                        help="Metadata JSONL output path for new generations.")
    parser.add_argument("--commit-to-dataset", action="store_true",
                        help="Write to canonical generations-v0.1.jsonl. Requires --reserve-report-ids.")
    parser.add_argument("--reserve-report-ids", action="store_true",
                        help="Reserve AK report IDs and include akouo_report_id in metadata.")
    parser.add_argument("--provider-param", action="append", default=[],
                        help="Additional generation parameter as key=value. Can be repeated.")
    args = parser.parse_args()

    if args.list_providers:
        providers = list_provider_statuses()
        if args.json:
            print(json.dumps(providers, indent=2, ensure_ascii=False))
        else:
            for provider in providers:
                print(
                    f"{provider['provider_id']}: {provider['name']} "
                    f"({provider['type']}, {provider['runtime']}, {provider['status']}, {provider['version']})"
                )
                print(f"  {provider.get('status_reason', '')}")
        sys.exit(0)

    project_root = Path(__file__).resolve().parent.parent
    prompt_path = Path(args.prompts)
    if not prompt_path.is_absolute():
        prompt_path = project_root / prompt_path

    requested_provider_ids = [p.strip() for p in args.providers.split(",") if p.strip()]
    provider_ids, diagnostics = resolve_providers(
        requested_provider_ids or None,
        allow_procedural_fallback=args.allow_procedural_fallback,
    )
    if not provider_ids:
        print("Error: no available default provider.")
        print("Checked providers:")
        for provider in diagnostics:
            print(f"  - {provider['provider_id']}: {provider['status']} — {provider.get('status_reason', '')}")
        print("\nSet ALGOPHONY_ELEVENLABS_API_KEY, configure another ML/API provider, pass --providers explicitly, or use --allow-procedural-fallback.")
        sys.exit(1)
    prompt_ids = [p.strip() for p in args.prompt_ids.split(",")] if args.prompt_ids else None
    categories = [c.strip() for c in args.categories.split(",")] if args.categories else None

    prompts = load_prompts(prompt_path, args.limit, prompt_ids, categories)

    if not prompts:
        print("No prompts found matching criteria.")
        sys.exit(0)

    total = len(prompts) * len(provider_ids) * args.variants
    print(f"Generation matrix: {len(prompts)} prompts × {len(provider_ids)} providers × {args.variants} variants = {total} generations\n")
    if not requested_provider_ids:
        print(f"Selected default provider: {', '.join(provider_ids)}\n")
    if args.dry_run:
        print("Provider status:")
        for provider in diagnostics:
            if provider["provider_id"] in provider_ids:
                print(f"  - {provider['provider_id']}: {provider['status']} — {provider.get('status_reason', '')}")
        print()

    if args.dry_run:
        for prompt in prompts:
            for provider in provider_ids:
                for v in range(args.variants):
                    variant = chr(65 + v)
                    print(f"  [DRY RUN] {prompt['prompt_id']} ({prompt['category']}) × {provider} × {variant}")
        print(f"\nDry run complete. {total} generation(s) planned.")
        sys.exit(0)

    provider_params = {}
    for item in args.provider_param:
        if "=" not in item:
            print(f"Error: --provider-param must be key=value, got {item!r}")
            sys.exit(1)
        key, value = item.split("=", 1)
        provider_params[key] = coerce_value(value)

    metadata_path = args.metadata_output
    if args.commit_to_dataset:
        if not args.reserve_report_ids:
            print("Error: --commit-to-dataset requires --reserve-report-ids.")
            sys.exit(1)
        metadata_path = "generations/metadata/generations-v0.1.jsonl"
    metadata_target = Path(metadata_path)
    if not metadata_target.is_absolute():
        metadata_target = project_root / metadata_target

    results = run_pipeline(
        prompts=prompts,
        providers=provider_ids,
        variants=args.variants,
        delay_seconds=args.delay,
        storage_dir=str(project_root / "generations" / "audio"),
        metadata_path=str(metadata_target),
        failure_path=str(project_root / "generations" / "metadata" / "generation-failures-v0.1.jsonl"),
        project_root=project_root,
        commit_to_dataset=args.commit_to_dataset,
        reserve_report_ids=args.reserve_report_ids,
        provider_params=provider_params,
    )

    print(f"\n{'='*40}")
    print(f"Successes: {len(results['successes'])}")
    print(f"Failures:  {len(results['failures'])}")
    if results['failures']:
        for f in results['failures'][:5]:
            print(f"  - {f}")


def coerce_value(value: str):
    """Coerce CLI key=value strings into simple JSON-like values."""
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    if value.lower() in {"null", "none"}:
        return None
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


if __name__ == "__main__":
    main()
