#!/usr/bin/env python3
"""
Algophony generation pipeline orchestrator.

Coordinates prompt loading, adapter selection, generation execution,
metadata recording, and failure logging.
"""

import json
import time
from pathlib import Path
from typing import Any

from workers.adapters.base import GenerationError


ADAPTER_REGISTRY = {}


def get_adapter(provider_id: str, **kwargs):
    """Instantiate an adapter by provider ID."""
    if provider_id in ("el_sfx", "elevenlabs_sfx", "elevenlabs"):
        from workers.adapters.elevenlabs_sfx import ElevenLabsSFXAdapter
        return ElevenLabsSFXAdapter(**kwargs)
    elif provider_id in ("synth_baseline", "synthetic", "baseline"):
        from workers.adapters.scaper import SyntheticBaselineAdapter
        return SyntheticBaselineAdapter(**kwargs)
    elif provider_id in ("spectral_fm", "fm", "fm_baseline"):
        from workers.adapters.spectral_fm import SpectralFMAdapter
        return SpectralFMAdapter(**kwargs)
    else:
        raise ValueError(f"Unknown provider: {provider_id}")


def run_pipeline(
    prompts: list[dict],
    providers: list[str],
    variants: int = 1,
    delay_seconds: float = 2.0,
    storage_dir: str = "generations/audio",
    metadata_path: str = "generations/metadata/generations-v0.1.jsonl",
    **adapter_kwargs,
) -> dict[str, Any]:
    """Run the generation pipeline."""
    results = {"successes": [], "failures": [], "metadata_records": []}
    metadata_file = Path(metadata_path)
    metadata_file.parent.mkdir(parents=True, exist_ok=True)

    for provider_id in providers:
        try:
            adapter = get_adapter(provider_id, storage_dir=storage_dir, **adapter_kwargs)
        except (GenerationError, ValueError) as e:
            print(f"  ✗ Cannot init {provider_id}: {e}")
            results["failures"].append({"provider": provider_id, "error": str(e)})
            continue

        print(f"\n  Provider: {adapter.provider_name}")
        stop_provider = False
        for prompt in prompts:
            if stop_provider:
                break
            for v in range(variants):
                variant = chr(65 + v)
                pid = prompt["prompt_id"]
                aid = adapter.build_audio_id(pid, variant)

                try:
                    params = {
                        "duration_seconds": prompt.get("duration_target", 30),
                        "loop": prompt.get("loop_required", False),
                        "variant": variant,
                    }
                    meta = adapter.generate(prompt, params)
                    results["successes"].append(aid)
                    results["metadata_records"].append(meta)

                    # Append to JSONL
                    with open(metadata_file, "a") as f:
                        f.write(json.dumps(meta, ensure_ascii=False) + "\n")

                    print(f"    ✓ {aid}")

                    # Rate limiting for API providers
                    if provider_id in ("el_sfx", "elevenlabs_sfx", "elevenlabs"):
                        time.sleep(delay_seconds)

                except GenerationError as e:
                    failure = adapter.build_failure_record(pid, variant, e.error_type, e.message)
                    results["failures"].append(failure)
                    print(f"    ✗ {aid}: {e.error_type} — {e.message}")

                    if e.error_type in ("quota_exceeded", "auth_error"):
                        print(f"    ⚠ Stopping {provider_id} due to {e.error_type}")
                        stop_provider = True
                        break

                except Exception as e:
                    failure = adapter.build_failure_record(pid, variant, "unexpected", str(e))
                    results["failures"].append(failure)
                    print(f"    ✗ {aid}: unexpected — {e}")

    return results
