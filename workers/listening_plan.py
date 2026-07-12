#!/usr/bin/env python3
"""Deterministic AKOÚŌ v0.6 routing plans for the Algophony report pipeline.

Implements step 1 of the AKOÚŌ agentic integration contract without any LLM:
artifact availability maps to an evidence level, the evidence level (plus
command overrides) maps to claim permissions, and missing inputs become stop
conditions instead of imagined listening.

The AKOÚŌ contract is loaded from the machine-readable manifest
(``akouo.manifest.json`` in the adjacent akouo checkout, override with
``ALGOPHONY_AKOUO_ROOT``) when available; hardcoded fallback tables keep the
pipeline deterministic offline. ``drift_errors()`` compares the fallbacks —
and this repo's schema enums — against the published manifest so neither can
silently diverge (same pattern as oída's harness).
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

AKOUO_CONTRACT_VERSION = "akouo/v0.7"

PROJECT_ROOT = Path(__file__).resolve().parents[1]

EVIDENCE_LEVELS = [
    "none",
    "prompt_only",
    "metadata_only",
    "decoded_audio_metadata",
    "measured_signal",
    "transcript_or_caption",
    "contextual_note",
    "mixed",
]

# Evidence Ladder fallback (mirrors akouo.manifest.json `evidence_ladder`):
# level -> (heard, measured, inferred, interpreted)
_LADDER: dict[str, tuple[bool, bool, bool, bool]] = {
    "none": (False, False, False, False),
    "prompt_only": (True, False, True, True),
    "metadata_only": (False, True, True, True),
    "decoded_audio_metadata": (True, True, True, True),
    "measured_signal": (True, True, True, True),
    "transcript_or_caption": (True, False, True, True),
    "contextual_note": (True, False, True, True),
    "mixed": (True, True, True, True),
}

# Command permission overrides fallback (mirrors `command_permission_overrides`).
_COMMAND_OVERRIDES: dict[str, dict[str, bool]] = {
    "/forensic": {"interpreted_allowed": False, "speculative_allowed": False},
    "/fiction": {"speculative_allowed": True},
}


def akouo_root() -> Path:
    env = os.getenv("ALGOPHONY_AKOUO_ROOT")
    if env:
        return Path(env).expanduser()
    return PROJECT_ROOT.parent / "akouo"


def load_akouo_manifest() -> dict[str, Any] | None:
    """The published AKOÚŌ machine-readable contract, or None when the
    adjacent checkout is missing or predates v0.6."""
    path = akouo_root() / "akouo.manifest.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def claim_permissions_for(evidence_level: str, command: str = "/listen") -> dict[str, bool]:
    heard, measured, inferred, interpreted = _LADDER.get(evidence_level, _LADDER["none"])
    permissions = {
        "heard_allowed": heard,
        "measured_allowed": measured,
        "inferred_allowed": inferred,
        "interpreted_allowed": interpreted,
        "speculative_allowed": False,
        "must_include_undetermined": True,
    }
    permissions.update(_COMMAND_OVERRIDES.get(command, {}))
    return permissions


def derive_evidence_level(
    prompt: dict[str, Any] | None,
    generation: dict[str, Any] | None,
    analysis: dict[str, Any] | None,
    *,
    audio_available: bool | None = None,
) -> str:
    """Evidence is derived from what actually exists, never asserted.

    prompt without generation is ``prompt_only``; generation metadata without
    measured analysis is ``metadata_only``; analysis features present is
    ``measured_signal``; prompt plus generation plus analysis is ``mixed``.
    """
    has_prompt = bool(prompt)
    has_generation = bool(generation)
    has_analysis = bool(analysis) and bool(
        (analysis or {}).get("features") or (analysis or {}).get("metrics") or (analysis or {}).get("duration_seconds")
    )
    if audio_available is None:
        audio_available = has_analysis

    if has_analysis and (has_prompt or has_generation):
        return "mixed"
    if has_analysis:
        return "measured_signal"
    if has_generation and audio_available:
        return "decoded_audio_metadata"
    if has_generation:
        return "metadata_only"
    if has_prompt:
        return "prompt_only"
    return "none"


def _mode_chain_for(prompt: dict[str, Any] | None, command: str) -> list[dict[str, str]]:
    """Deterministic default chain for Algophony's object class (generated
    soundscapes): describe the auditum first, read its ecological relations,
    and correct through transduction — the object is a model output, and that
    mediation must stay audible."""
    category = str((prompt or {}).get("category") or "").lower()
    chain = [
        {
            "mode": "acoulogical-object-listening",
            "role": "primary",
            "reason": "Describe the generated soundscape as an auditum before any source or scene claims.",
        },
        {
            "mode": "ecological-posthuman-listening",
            "role": "secondary",
            "reason": "Read layered habitat, weather, and infrastructure relations the prompt requests.",
        },
        {
            "mode": "transductive-media-listening",
            "role": "corrective",
            "reason": "The object is a model output; generation mediation must not pass as field recording.",
        },
    ]
    if command == "/fiction" or "impossible" in category or "ritual" in category:
        chain.insert(1, {
            "mode": "symbolic-fictional-listening",
            "role": "optional",
            "reason": "The prompt requests a declared impossible or ritual world; keep speculation labeled.",
        })
    if "club" in category or "music" in category:
        chain.insert(1, {
            "mode": "musical-aesthetic-listening",
            "role": "optional",
            "reason": "The prompt implies musical organization; describe rhythm and texture with genre caution.",
        })
    return chain


def build_routing_plan(
    prompt: dict[str, Any] | None,
    generation: dict[str, Any] | None,
    analysis: dict[str, Any] | None,
    *,
    command: str = "/listen",
    budget: str | None = None,
    audio_available: bool | None = None,
) -> dict[str, Any]:
    """Deterministic v0.6 routing plan from artifact availability. No LLM."""
    evidence_level = derive_evidence_level(prompt, generation, analysis, audio_available=audio_available)
    audio_id = (generation or {}).get("audio_id") or (analysis or {}).get("audio_id")
    prompt_id = (prompt or {}).get("prompt_id") or (generation or {}).get("prompt_id")
    object_name = str(audio_id or prompt_id or "unnamed generated soundscape")

    stop_conditions = ["Stop if the named evidence cannot be accessed; never substitute imagined evidence."]
    required_inputs: list[str] = []
    if evidence_level in ("none", "prompt_only"):
        stop_conditions.append("Stop before any heard or measured claim about audio content until a generated file and its analysis are supplied.")
        required_inputs.extend(["generated audio file", "analysis feature block"])
    if evidence_level == "metadata_only":
        stop_conditions.append("Stop before measured signal claims until analyze_audio features are supplied.")
        required_inputs.append("analysis feature block")

    input_type = {
        "none": "unknown",
        "prompt_only": "sound_prompt",
        "metadata_only": "metadata",
        "decoded_audio_metadata": "audio_file",
        "measured_signal": "audio_file",
        "transcript_or_caption": "transcript",
        "contextual_note": "field_note",
        "mixed": "mixed",
    }[evidence_level]

    route_confidence = "high" if evidence_level in ("measured_signal", "mixed") else ("medium" if evidence_level not in ("none",) else "undetermined")

    plan: dict[str, Any] = {
        "object_listened_to": object_name,
        "input_type": input_type,
        "route_confidence": route_confidence,
        "evidence_level": evidence_level,
        "mode_chain": _mode_chain_for(prompt, command),
        "claim_permissions": claim_permissions_for(evidence_level, command),
        "agent_handoff": {
            "summary": (
                f"Route {object_name} through the deterministic Algophony chain at {evidence_level} evidence; "
                "the object is a generated soundscape, so transduction stays corrective and provenance claims stay disciplined."
            ),
            "required_inputs": required_inputs,
            "forbidden_assumptions": [
                "Do not identify animal species, real locations, or cultures from generated audio.",
                "Do not present the generation as a real field recording.",
                "Do not treat model output as documentary evidence.",
            ],
            "recommended_command": command,
        },
        "stop_conditions": stop_conditions,
    }
    if budget in ("light", "standard", "deep"):
        plan["budget"] = budget
    return plan


def enforce_claim_permissions(claims: dict[str, list[dict[str, Any]]], permissions: dict[str, bool]) -> dict[str, list[dict[str, Any]]]:
    """Move claims from disallowed categories into ``undetermined`` with an
    explicit blocked marker; never silently drop a claim."""
    mapping = {
        "heard": "heard_allowed",
        "measured": "measured_allowed",
        "inferred": "inferred_allowed",
        "interpreted": "interpreted_allowed",
        "speculative": "speculative_allowed",
    }
    moved: list[dict[str, Any]] = []
    for category, permission_key in mapping.items():
        if permissions.get(permission_key, False):
            continue
        for claim in claims.get(category, []):
            moved.append(
                {
                    **claim,
                    "statement": f"Blocked {category} claim: {claim.get('statement', '')}",
                    "confidence": "undetermined",
                    "basis": f"{claim.get('basis', '')}; disallowed by routing claim_permissions".strip("; "),
                }
            )
        claims[category] = []
    if moved:
        claims.setdefault("undetermined", []).extend(moved)
    return claims


def drift_errors() -> list[str] | None:
    """Compare the fallback tables and this repo's schema enums against the
    published AKOÚŌ manifest. None when no manifest is available; empty list
    when in sync."""
    manifest = load_akouo_manifest()
    if manifest is None:
        return None
    errors: list[str] = []

    ladder = {rung["level"]: rung for rung in manifest.get("evidence_ladder", [])}
    for level in EVIDENCE_LEVELS:
        if level not in ladder:
            errors.append(f"evidence level {level} missing from manifest ladder")
            continue
        ours = claim_permissions_for(level, "/listen")
        for key in ("heard_allowed", "measured_allowed", "inferred_allowed", "interpreted_allowed", "speculative_allowed", "must_include_undetermined"):
            if bool(ours[key]) != bool(ladder[level].get(key)):
                errors.append(f"ladder drift at {level}.{key}: local={ours[key]} manifest={ladder[level].get(key)}")

    overrides = manifest.get("command_permission_overrides", {})
    for command, expected in _COMMAND_OVERRIDES.items():
        published = overrides.get(command, {})
        for key, value in expected.items():
            if key in published and bool(published[key]) != bool(value):
                errors.append(f"override drift at {command}.{key}: local={value} manifest={published[key]}")
        if command not in overrides:
            errors.append(f"override {command} missing from manifest")

    schema = json.loads((PROJECT_ROOT / "schemas" / "listening-report.schema.json").read_text(encoding="utf-8"))
    schema_modes = set(schema["$defs"]["akouo_listening_mode"]["enum"])
    schema_commands = set(schema["$defs"]["akouo_command"]["enum"])
    manifest_modes = {s["id"] for s in manifest.get("skills", []) if s.get("kind") == "mode"}
    manifest_commands = {c["name"] for c in manifest.get("commands", [])}
    for mode in manifest_modes - schema_modes:
        errors.append(f"manifest mode {mode} missing from listening-report schema enum")
    for mode in schema_modes - manifest_modes:
        errors.append(f"schema mode {mode} not in manifest")
    for command in manifest_commands - schema_commands:
        errors.append(f"manifest command {command} missing from listening-report schema enum")
    for command in schema_commands - manifest_commands:
        errors.append(f"schema command {command} not in manifest")

    version = str(manifest.get("akouo_version") or "")
    if version and AKOUO_CONTRACT_VERSION != f"akouo/v{version}":
        errors.append(f"contract pin {AKOUO_CONTRACT_VERSION} does not match manifest akouo_version {version}")

    return errors
