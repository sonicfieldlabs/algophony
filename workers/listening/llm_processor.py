"""Optional LLM augmentation for AKOÚŌ listening reports.

The bridge is disabled unless ALGOPHONY_ENABLE_LLM_LISTENING=true. It is meant
for local/studio use behind the existing app auth boundary, not public release.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from workers.env import load_project_env


load_project_env()

PROJECT_ROOT = Path(__file__).resolve().parents[2]

AKOUO_INPUT_TYPES = [
    "audio_file",
    "sound_prompt",
    "transcript",
    "field_note",
    "archive_note",
    "dataset_description",
    "spectrogram",
    "waveform",
    "video",
    "metadata",
    "model_output",
    "mixed",
    "unknown",
    "other",
]

AKOUO_LISTENING_MODES = [
    "signal-inspection-listening",
    "acoulogical-object-listening",
    "embodied-affective-listening",
    "transductive-media-listening",
    "forensic-archival-listening",
    "ecological-posthuman-listening",
    "critical-political-listening",
    "musical-aesthetic-listening",
    "symbolic-fictional-listening",
]

LISTENING_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "object_listened_to",
        "input_type",
        "listening_mode",
        "listening_claims",
        "what_appears",
        "what_remains_hidden",
        "mediations",
        "risks",
        "main_reading",
        "alternative_reading",
        "recommended_next_mode",
    ],
    "properties": {
        "object_listened_to": {"type": "string"},
        "input_type": {"type": "string", "enum": AKOUO_INPUT_TYPES},
        "listening_mode": {"type": "string", "enum": AKOUO_LISTENING_MODES},
        "listening_claims": {
            "type": "object",
            "required": ["heard", "measured", "inferred", "interpreted", "speculative", "undetermined"],
            "additionalProperties": False,
            "properties": {
                key: {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["statement", "confidence", "basis"],
                        "properties": {
                            "statement": {"type": "string"},
                            "confidence": {"type": "string", "enum": ["high", "medium", "low", "undetermined"]},
                            "basis": {"type": "string"},
                        },
                    },
                }
                for key in ("heard", "measured", "inferred", "interpreted", "speculative", "undetermined")
            },
        },
        "what_appears": {"type": "array", "items": {"type": "string"}},
        "what_remains_hidden": {"type": "array", "items": {"type": "string"}},
        "mediations": {
            "type": "object",
            "additionalProperties": False,
            "required": ["technical", "cultural", "spatial", "bodily", "archival", "computational"],
            "properties": {
                key: {"type": "array", "items": {"type": "string"}}
                for key in ("technical", "cultural", "spatial", "bodily", "archival", "computational")
            },
        },
        "risks": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "hallucination",
                "over_identification",
                "cultural_flattening",
                "forensic_overreach",
                "source_confusion",
                "aesthetic_overstatement",
            ],
            "properties": {
                key: {"type": "array", "items": {"type": "string"}}
                for key in (
                    "hallucination",
                    "over_identification",
                    "cultural_flattening",
                    "forensic_overreach",
                    "source_confusion",
                    "aesthetic_overstatement",
                )
            },
        },
        "main_reading": {"type": "string"},
        "alternative_reading": {"type": "string"},
        "recommended_next_mode": {"type": "string", "enum": AKOUO_LISTENING_MODES + ["none", "undetermined"]},
    },
}


def llm_listening_enabled() -> bool:
    return os.getenv("ALGOPHONY_ENABLE_LLM_LISTENING", "false").lower() == "true"


def build_llm_prompt(prompt_record: dict, generation: dict, analysis: dict, report: dict) -> str:
    """Build a strict, evidence-bounded listening prompt for an external LLM."""
    payload = {
        "prompt": prompt_record,
        "generation_metadata": generation,
        "signal_analysis": analysis,
        "current_report_summary": {
            "claim_taxonomy": report.get("claim_taxonomy", {}),
            "scores": report.get("scores", {}),
            "akouo_router_output": report.get("akouo_router_output"),
        },
    }
    return (
        "You are producing one AKOÚŌ listening-mode output for Algophony.\n"
        "Return JSON only. Follow the supplied schema exactly.\n"
        "Respect the claim taxonomy: heard, measured, inferred, interpreted, speculative, undetermined.\n"
        "Do not identify species, real locations, cultures, recordings, or events unless supplied as evidence.\n"
        "Treat generated audio as generated, not documentary field evidence.\n"
        "Use measured claims only from signal_analysis. Keep unsupported facts in undetermined.\n\n"
        f"Evidence JSON:\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n"
    )


def run_codex_cli(prompt: str, timeout_seconds: float) -> dict[str, Any]:
    """Run an authorized local Codex CLI pass and parse its schema-constrained output."""
    model = os.getenv("ALGOPHONY_LLM_MODEL", "").strip()
    with tempfile.TemporaryDirectory(prefix="algophony-llm-") as tmp:
        tmp_dir = Path(tmp)
        schema_path = tmp_dir / "listening-output.schema.json"
        output_path = tmp_dir / "last-message.json"
        schema_path.write_text(json.dumps(LISTENING_OUTPUT_SCHEMA), encoding="utf-8")
        cmd = [
            "codex",
            "exec",
            "--ephemeral",
            "--sandbox",
            "read-only",
            "--cd",
            str(PROJECT_ROOT),
            "--output-schema",
            str(schema_path),
            "--output-last-message",
            str(output_path),
        ]
        if model:
            cmd.extend(["--model", model])
        cmd.append("-")
        completed = subprocess.run(
            cmd,
            input=prompt,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            check=False,
        )
        if completed.returncode != 0:
            raise RuntimeError((completed.stderr or completed.stdout or "Codex CLI failed")[-2000:])
        raw = output_path.read_text(encoding="utf-8").strip()
        return json.loads(raw)


def run_llm_listening(prompt_record: dict, generation: dict, analysis: dict, report: dict) -> dict[str, Any] | None:
    """Return an optional LLM listening output, or None when disabled."""
    if not llm_listening_enabled():
        return None

    backend = os.getenv("ALGOPHONY_LLM_BACKEND", "codex_cli").strip().lower()
    timeout_seconds = float(os.getenv("ALGOPHONY_LLM_TIMEOUT_SECONDS", "180"))
    llm_prompt = build_llm_prompt(prompt_record, generation, analysis, report)
    if backend == "codex_cli":
        return run_codex_cli(llm_prompt, timeout_seconds)
    raise RuntimeError(f"Unsupported ALGOPHONY_LLM_BACKEND: {backend}")
