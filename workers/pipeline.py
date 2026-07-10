#!/usr/bin/env python3
"""
Algophony generation pipeline orchestrator.

Coordinates provider selection, adapter instantiation, generation execution,
incoming metadata recording, and structured failure logging.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from workers.adapters.base import GenerationError
from workers.provider_registry import (
    PROVIDER_REGISTRY,
    canonical_provider_id,
    compute_provenance_for,
    list_provider_statuses,
    provider_status,
    select_default_provider,
)


def _next_report_ids(project_root: Path, count: int) -> list[str]:
    """Reserve next AK report IDs from existing JSON/Markdown reports."""
    existing = set()
    for root in (project_root / "reports" / "json", project_root / "reports" / "markdown"):
        if not root.exists():
            continue
        for path in root.glob("AK-*.*"):
            try:
                existing.add(int(path.stem.replace("AK-", "")))
            except ValueError:
                continue
    start = (max(existing) + 1) if existing else 1
    return [f"AK-{i:04d}" for i in range(start, start + count)]


def get_adapter(provider_id: str, **kwargs: Any):
    """Instantiate an adapter by provider ID."""
    key = canonical_provider_id(provider_id)
    if key not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown provider: {provider_id}")

    info = provider_status(key)
    if info["status"] == "configured_missing_key":
        raise GenerationError("config_error", f"{info['name']}: {info.get('status_reason', 'missing configuration')}")
    if info["status"] in ("not_installed", "not_implemented", "failed"):
        raise GenerationError(info["status"], f"{info['name']}: {info.get('status_reason', info['status'])}")

    spec = PROVIDER_REGISTRY[key]
    module = __import__(spec.module, fromlist=[spec.class_name])
    cls = getattr(module, spec.class_name)
    provider_config = dict(info)
    return cls(provider_config=provider_config, **kwargs)


def resolve_providers(
    requested: list[str] | None = None,
    allow_procedural_fallback: bool = False,
) -> tuple[list[str], list[dict[str, Any]]]:
    """Resolve requested/default provider IDs plus status diagnostics."""
    if requested:
        return [canonical_provider_id(provider) for provider in requested], [provider_status(provider) for provider in requested]
    return select_default_provider(allow_procedural_fallback=allow_procedural_fallback)


def run_pipeline(
    prompts: list[dict],
    providers: list[str],
    variants: int = 1,
    delay_seconds: float = 2.0,
    storage_dir: str = "generations/audio",
    metadata_path: str = "generations/metadata/incoming-generations-v0.1.jsonl",
    failure_path: str = "generations/metadata/generation-failures-v0.1.jsonl",
    project_root: str | Path | None = None,
    commit_to_dataset: bool = False,
    reserve_report_ids: bool = False,
    provider_params: dict[str, Any] | None = None,
    **adapter_kwargs: Any,
) -> dict[str, Any]:
    """Run the generation pipeline."""
    if commit_to_dataset and not reserve_report_ids:
        raise GenerationError("config_error", "--commit-to-dataset requires --reserve-report-ids.")

    results: dict[str, Any] = {"successes": [], "failures": [], "metadata_records": []}
    metadata_file = Path(metadata_path)
    failure_file = Path(failure_path)
    metadata_file.parent.mkdir(parents=True, exist_ok=True)
    failure_file.parent.mkdir(parents=True, exist_ok=True)

    project = Path(project_root) if project_root else Path.cwd()
    report_ids = _next_report_ids(project, len(prompts) * len(providers) * variants) if reserve_report_ids else []
    report_cursor = 0
    params_from_cli = provider_params or {}

    for requested_provider in providers:
        provider_id = canonical_provider_id(requested_provider)
        try:
            adapter = get_adapter(provider_id, storage_dir=storage_dir, **adapter_kwargs)
        except (GenerationError, ValueError) as e:
            failure = {
                "provider_id": provider_id,
                "status": "failed",
                "error_type": getattr(e, "error_type", "config_error"),
                "message": str(e),
                "date": time.strftime("%Y-%m-%d"),
            }
            print(f"  x Cannot init {provider_id}: {e}")
            results["failures"].append(failure)
            with open(failure_file, "a") as f:
                f.write(json.dumps(failure, ensure_ascii=False) + "\n")
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
                        **params_from_cli,
                    }
                    meta = adapter.generate(prompt, params)
                    if reserve_report_ids:
                        meta["akouo_report_id"] = report_ids[report_cursor]
                        report_cursor += 1
                    # Material footprint stamped from the registry at generation
                    # time; never guessed after the fact (framework: compute
                    # provenance is part of the sound's body).
                    meta.setdefault("compute_provenance", compute_provenance_for(provider_id))
                    results["successes"].append(aid)
                    results["metadata_records"].append(meta)

                    with open(metadata_file, "a") as f:
                        f.write(json.dumps(meta, ensure_ascii=False) + "\n")

                    print(f"    OK {aid}")

                    if provider_id == "el_sfx":
                        time.sleep(delay_seconds)

                except GenerationError as e:
                    failure = adapter.build_failure_record(pid, variant, e.error_type, e.message)
                    results["failures"].append(failure)
                    with open(failure_file, "a") as f:
                        f.write(json.dumps(failure, ensure_ascii=False) + "\n")
                    print(f"    x {aid}: {e.error_type} - {e.message}")

                    if e.error_type in ("quota_exceeded", "auth_error", "config_error", "model_access_error"):
                        print(f"    ! Stopping {provider_id} due to {e.error_type}")
                        stop_provider = True
                        break

                except Exception as e:
                    failure = adapter.build_failure_record(pid, variant, "unexpected", str(e))
                    results["failures"].append(failure)
                    with open(failure_file, "a") as f:
                        f.write(json.dumps(failure, ensure_ascii=False) + "\n")
                    print(f"    x {aid}: unexpected - {e}")

    return results


__all__ = [
    "PROVIDER_REGISTRY",
    "canonical_provider_id",
    "provider_status",
    "list_provider_statuses",
    "resolve_providers",
    "get_adapter",
    "run_pipeline",
]
