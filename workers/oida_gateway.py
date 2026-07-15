"""Oída v0.2 gateway adapter for Algophony listening and evaluation."""
from __future__ import annotations

import copy
import json
import os
from pathlib import Path
from typing import Any
from urllib import request
from urllib.parse import urlparse

OIDA_GATEWAY_CONTRACT = "oida/gateway/v0.2"


def server_url() -> str:
    value = os.getenv("ALGOPHONY_OIDA_URL", os.getenv("OIDA_SERVER_URL", "http://127.0.0.1:8765")).rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Oída gateway URL must be an http:// or https:// URL")
    return value


def listen_audio(
    path: str | Path,
    *,
    route_preset: str = "deep",
    remember: bool = False,
    privacy_mode: str = "session",
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Run an actual generated/recorded file through the unified gateway."""
    return _post(
        "/gateway/listen",
        {
            "path": str(Path(path).expanduser().resolve()),
            "route_preset": route_preset,
            "remember": remember,
            "privacy_mode": privacy_mode,
            "raw_audio_policy": "external_ref",
            "tags": tags or ["algophony"],
        },
    )


def harness_host(
    perception: dict[str, Any],
    *,
    route_preset: str = "deep",
    remember: bool = False,
) -> dict[str, Any]:
    """Use a host audio model while retaining Oída routing/provenance/memory."""
    return _post(
        "/gateway/harness",
        {
            "perception": perception,
            "route_preset": route_preset,
            "remember": remember,
            "privacy_mode": "session",
            "raw_audio_policy": "not_stored",
        },
    )


def algophony_patch(result: dict[str, Any]) -> dict[str, Any]:
    """Translate one gateway result into optional Algophony report fields."""
    if result.get("contract") != OIDA_GATEWAY_CONTRACT:
        raise ValueError(f"unsupported Oída gateway contract: {result.get('contract')!r}")
    event = result.get("listening_event") if isinstance(result.get("listening_event"), dict) else {}
    command = result.get("command_output") if isinstance(result.get("command_output"), dict) else {}
    perception = result.get("perception_report") if isinstance(result.get("perception_report"), dict) else {}
    earworm = result.get("earworm") if isinstance(result.get("earworm"), dict) else {}
    trace = result.get("trace") if isinstance(result.get("trace"), dict) else None
    outputs = command.get("outputs") if isinstance(command.get("outputs"), list) else []
    first_output = outputs[0] if outputs and isinstance(outputs[0], dict) else {}
    routes = event.get("routes") if isinstance(event.get("routes"), list) else []
    first_route = routes[0] if routes and isinstance(routes[0], dict) else {}
    structured = first_route.get("structured") if isinstance(first_route.get("structured"), dict) else {}
    route_preset = str(structured.get("route_preset") or "basic")
    session = earworm.get("session") if isinstance(earworm.get("session"), dict) else {}
    return {
        "claim_taxonomy": copy.deepcopy(command.get("claim_summary") or _empty_claims()),
        "akouo_routing_plan": copy.deepcopy(command.get("routing_plan")),
        "akouo_mode_outputs": copy.deepcopy(outputs),
        "akouo_contract_version": f"akouo/v{command.get('akouo_version') or '0.6'}",
        "earworm_trace": _compact_earworm(earworm, remembered=trace is not None, event=event),
        "oida_gateway": {
            "contract": OIDA_GATEWAY_CONTRACT,
            "perception_path": str(result.get("perception_path") or "oida_owned"),
            "listening_event_id": str(event.get("id") or "unknown-event"),
            "route_preset": route_preset,
            "earworm_session_id": session.get("session_id"),
            "akousmata_trace_id": trace.get("id") if trace else None,
            "apparatus": copy.deepcopy(first_output.get("apparatus") or perception.get("apparatus") or {}),
            "host": copy.deepcopy(perception.get("host")) if isinstance(perception.get("host"), dict) else None,
            "raw_audio_policy": str(event.get("raw_audio_policy") or "not_stored"),
            "memory_persistence": "remembered" if trace else "session_only",
        },
    }


def apply_to_report(report: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of an Algophony report with real gateway fields attached."""
    updated = copy.deepcopy(report)
    updated.update(algophony_patch(result))
    return updated


def _compact_earworm(earworm: dict[str, Any], *, remembered: bool, event: dict[str, Any]) -> dict[str, Any]:
    session = earworm.get("session") if isinstance(earworm.get("session"), dict) else {}
    session_id = session.get("session_id")
    events = session.get("events") if isinstance(session.get("events"), list) else []
    assets = session.get("assets") if isinstance(session.get("assets"), list) else []
    provenance = session.get("provenance") if isinstance(session.get("provenance"), list) else []
    policy = session.get("policy") if isinstance(session.get("policy"), dict) else {}

    event_chain = []
    signal_packets = []
    for item in events:
        if not isinstance(item, dict):
            continue
        source = item.get("source") if isinstance(item.get("source"), dict) else {}
        time_block = item.get("time") if isinstance(item.get("time"), dict) else {}
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        event_chain.append(
            {
                "event_id": str(item.get("event_id") or "unknown-event"),
                "type": str(item.get("type") or "analysis.frame"),
                "actor": str(source.get("actor") or "agent"),
                "wall_clock": str(time_block.get("wall_clock") or event.get("created_at") or "unknown"),
                "parent_event_ids": [str(value) for value in item.get("parent_event_ids") or []],
                **({"provenance_id": str(item["provenance_id"])} if item.get("provenance_id") else {}),
                **({"event_hash": str(item["event_hash"])} if item.get("event_hash") else {}),
            }
        )
        if item.get("type") == "signal.packet.ingested":
            time_range = payload.get("time_range") if isinstance(payload.get("time_range"), dict) else {}
            signal_packets.append(
                {
                    "packet_id": str(payload.get("packet_id") or item.get("event_id") or "packet"),
                    "signal_type": "audio",
                    **({"asset_ref": str(payload["asset_ref"])} if payload.get("asset_ref") else {}),
                    **({"segment_id": str(payload["segment_id"])} if payload.get("segment_id") else {}),
                    "time_range": {
                        "start": float(time_range.get("start") or 0),
                        "end": float(time_range.get("end") or 0),
                        "unit": str(time_range.get("unit") or "seconds"),
                    },
                    "context_refs": [str(value) for value in payload.get("context_refs") or []],
                    **({"provenance_id": str(payload["provenance_id"])} if payload.get("provenance_id") else {}),
                    "tags": [str(value) for value in payload.get("tags") or []],
                }
            )

    asset_refs = []
    for asset in assets:
        if not isinstance(asset, dict) or not asset.get("asset_id"):
            continue
        clean = {key: copy.deepcopy(value) for key, value in asset.items() if key in {"asset_id", "type", "duration_seconds", "sample_rate", "channels", "provenance_id"}}
        if isinstance(clean.get("sample_rate"), int) and clean["sample_rate"] < 1:
            clean.pop("sample_rate")
        if isinstance(clean.get("channels"), int) and clean["channels"] < 1:
            clean.pop("channels")
        asset_refs.append(clean)

    provenance_refs = []
    for item in provenance:
        if not isinstance(item, dict) or not item.get("provenance_id"):
            continue
        provenance_refs.append(
            {
                "provenance_id": str(item["provenance_id"]),
                "source_type": str(item.get("source_type") or "unknown"),
                **({"provider": str(item["provider"])} if item.get("provider") else {}),
                **({"model_id": str(item["model_id"])} if item.get("model_id") else {}),
                **({"asset_hash": str(item["asset_hash"])} if item.get("asset_hash") else {}),
                "consent_status": str(item.get("consent_status") or "unknown"),
                "usage_constraints": [str(value) for value in item.get("usage_constraints") or []],
            }
        )

    consent = provenance_refs[0]["consent_status"] if provenance_refs else "unknown"
    aggregate = event.get("aggregate") if isinstance(event.get("aggregate"), dict) else {}
    bundle_id = f"bundle_{session_id or event.get('id') or 'oida'}"
    return {
        "trace_status": "active",
        "session_id": str(session_id) if session_id else None,
        "app_id": "algophony.oida",
        "akousmata_operations": ["remember", "list", "search", "similarity", "export", "forget"],
        "event_chain": event_chain,
        "asset_refs": asset_refs,
        "provenance_refs": provenance_refs,
        "signal_packets": signal_packets,
        "context_bundle_refs": [
            {
                "bundle_id": bundle_id,
                "selector": {"listening_event_id": event.get("id"), "agent_safe": True},
                "summary": str(aggregate.get("short_summary") or aggregate.get("title") or "Oída listening context"),
                "event_ids": [item["event_id"] for item in event_chain],
                "asset_ids": [item["asset_id"] for item in asset_refs],
                "provenance_ids": [item["provenance_id"] for item in provenance_refs],
            }
        ],
        "retention_policy": {
            "retention_class": "project" if remembered else "session",
            "consent_status": consent,
            "local_only": bool(policy.get("local_only", True)),
            "deletion_supported": True,
            "expires_at": None,
        },
        "notes": [
            "Gateway context is durable only when akousmata_trace_id is present.",
            "Raw local paths are omitted from the Algophony trace reference.",
        ],
    }


def _post(endpoint: str, payload: dict[str, Any], *, timeout: int = 600) -> dict[str, Any]:
    url = f"{server_url()}/{endpoint.lstrip('/')}"
    headers = {"Content-Type": "application/json"}
    token = os.getenv("OIDA_AUTH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    # server_url() rejects every scheme except HTTP(S) before this request is built.
    with request.urlopen(req, timeout=timeout) as response:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError("Oída gateway returned a non-object response")
    return value


def _empty_claims() -> dict[str, list[Any]]:
    return {category: [] for category in ("heard", "measured", "inferred", "interpreted", "speculative", "undetermined")}


__all__ = ["OIDA_GATEWAY_CONTRACT", "algophony_patch", "apply_to_report", "harness_host", "listen_audio", "server_url"]
