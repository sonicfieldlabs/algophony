#!/usr/bin/env python3
"""
Playground single-shot generator for the Algophony web dashboard.

Accepts JSON on stdin, generates one audio file, analyzes it,
builds an AKOÚŌ listening report, and outputs all results as JSON to stdout.

Input JSON:
{
  "prompt_text": "...",
  "category": "forest",
  "provider_id": "synth_baseline",
  "duration": 30,
  "loop": true,
  "seed": null,
  "forbidden_sources": ["music"],
  "intended_sources": ["wind", "rain"]
}

Output JSON:
{
  "ok": true,
  "generation": { ... },
  "analysis": { ... },
  "report": { ... },
  "audio_id": "...",
  "error": null
}
"""

from __future__ import annotations

import json
import sys
import time
import traceback
import hashlib
from datetime import date
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from workers.pipeline import get_adapter
from workers.provider_registry import canonical_provider_id


LISTENING_MODES = {
    "signal-inspection-listening",
    "acoulogical-object-listening",
    "embodied-affective-listening",
    "transductive-media-listening",
    "forensic-archival-listening",
    "ecological-posthuman-listening",
    "critical-political-listening",
    "musical-aesthetic-listening",
    "symbolic-fictional-listening",
}

ALLOWED_SOURCE_TYPES = {
    "generated_procedural",
    "generated_ml",
    "field_recording",
    "found_sound",
    "hybrid",
}


def akouo_route_for_prompt(prompt: dict, has_audio: bool = True) -> dict:
    """Build a deterministic AKOÚŌ route draft for playground reports."""
    mode = prompt.get("listening_mode") or "acoulogical-object-listening"
    if mode not in LISTENING_MODES:
        mode = "acoulogical-object-listening"
    secondary = "signal-inspection-listening" if has_audio else "acoulogical-object-listening"
    corrective = "critical-political-listening" if prompt.get("category") in {"ritual", "archive", "ruin"} else "transductive-media-listening"
    return {
        "object_listened_to": prompt.get("prompt_text", "Algophony sound object")[:180],
        "input_type": "audio_file" if has_audio else "sound_prompt",
        "user_intent": "Algophony local playground routed listening",
        "available_evidence": ["prompt metadata", "generation metadata", "signal analysis" if has_audio else "prompt text"],
        "unavailable_evidence": ["recording chain", "human listening panel", "field-recording provenance"],
        "primary_mode": mode,
        "secondary_mode": secondary,
        "corrective_mode": corrective,
        "route_reasoning": [
            "The prompt-selected mode is used as the primary ear.",
            "Signal inspection is included when waveform measurements are available.",
            "A corrective mode keeps mediation and cultural overclaiming visible.",
        ],
        "risks": [
            "Do not treat generated audio as documentary evidence.",
            "Do not identify real species, places, cultures, or events without evidence.",
        ],
        "must_not_assume": [
            "The generated sound is not a verified field recording.",
            "Prompt text and metadata are not equivalent to measured audio.",
            "Speculative or cultural readings must remain outside inferred claims.",
        ],
        "recommended_command": "/listen",
        "recommended_next_mode": secondary,
    }


def akouo_mode_output(prompt: dict, analysis: dict, route: dict) -> dict:
    claims = {
        "heard": [],
        "measured": [
            {
                "statement": f"Duration is {analysis.get('duration', 'undetermined')} seconds.",
                "confidence": "high" if analysis.get("duration") is not None else "undetermined",
                "basis": "local signal analysis",
            }
        ],
        "inferred": [
            {
                "statement": "The sound should be evaluated as mediated algorithmic or uploaded material, not as direct environmental proof.",
                "confidence": "high",
                "basis": "Algophony source workflow",
            }
        ],
        "interpreted": [],
        "speculative": [],
        "undetermined": [
            {
                "statement": "Species, location, culture, and recording provenance remain undetermined unless supplied as evidence.",
                "confidence": "high",
                "basis": "AKOÚŌ claim discipline",
            }
        ],
    }
    return {
        "object_listened_to": route["object_listened_to"],
        "input_type": route["input_type"],
        "listening_mode": route["primary_mode"],
        "listening_claims": claims,
        "what_appears": prompt.get("intended_sources", [])[:6] or ["sonic object for evaluation"],
        "what_remains_hidden": route["unavailable_evidence"],
        "mediations": {
            "technical": ["generation or upload pipeline", "file encoding", "signal analysis"],
            "cultural": ["prompt language and category framing"],
            "spatial": ["simulated or undocumented spatial field"],
            "bodily": ["playback context unavailable"],
            "archival": ["no chain of custody in local playground output"],
            "computational": ["provider adapter", "AKOÚŌ route draft"],
        },
        "risks": {
            "hallucination": ["unsupported source identification"],
            "over_identification": ["species, location, and culture claims without evidence"],
            "cultural_flattening": ["prompt categories can flatten context"],
            "forensic_overreach": ["generated or uploaded files are not proof of events"],
            "source_confusion": ["apparent source can differ from actual provenance"],
            "aesthetic_overstatement": ["draft reports need review before publication"],
        },
        "main_reading": "A routed Algophony listening pass should separate prompt intent, measured signal features, and source/provenance uncertainty.",
        "alternative_reading": "A later human or full AKOÚŌ multi-mode pass may revise this draft.",
        "recommended_next_mode": route["secondary_mode"],
    }


def analyze_audio(audio_path: Path) -> dict | None:
    """Inline audio analysis — mirrors scripts/analyze_audio.py."""
    if not audio_path.exists():
        return None

    try:
        import librosa
        import numpy as np
        import soundfile as sf

        info = sf.info(str(audio_path))
        y, sr = librosa.load(str(audio_path), sr=None, mono=True)
    except Exception:
        return None

    duration = librosa.get_duration(y=y, sr=sr)
    rms_val = float(np.sqrt(np.mean(y ** 2)))
    peak = float(np.max(np.abs(y)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))

    frame_rms = librosa.feature.rms(y=y)[0]
    silence_threshold = 10 ** (-40 / 20)
    silence_ratio = float(np.sum(frame_rms < silence_threshold) / max(len(frame_rms), 1))

    try:
        onsets = librosa.onset.onset_detect(y=y, sr=sr)
        event_density = len(onsets) / duration if duration > 0 else 0
    except Exception:
        onsets = []
        event_density = 0

    boundary_samples = int(0.05 * sr)
    if len(y) > boundary_samples * 2:
        start_rms = float(np.sqrt(np.mean(y[:boundary_samples] ** 2)))
        end_rms = float(np.sqrt(np.mean(y[-boundary_samples:] ** 2)))
        loop_disc = abs(start_rms - end_rms) / max(rms_val, 1e-10)
    else:
        loop_disc = None

    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))

    return {
        "duration": round(duration, 3),
        "sample_rate": sr,
        "channels": info.channels,
        "rms": round(rms_val, 6),
        "peak_level": round(peak, 6),
        "spectral_centroid_hz": round(centroid, 2),
        "spectral_bandwidth_hz": round(bandwidth, 2),
        "spectral_flatness": round(flatness, 6),
        "zero_crossing_rate": round(zcr, 6),
        "silence_ratio": round(silence_ratio, 4),
        "onset_count": len(onsets),
        "event_density_per_sec": round(event_density, 3),
        "loop_boundary_discontinuity": round(loop_disc, 6) if loop_disc is not None else None,
    }


def build_playground_report(prompt: dict, generation: dict, analysis: dict) -> dict:
    """Build an AKOÚŌ listening report using the existing report generation logic."""
    scripts_dir = str(PROJECT_ROOT / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    from generate_reports import build_report  # type: ignore

    # Find next available report number
    json_dir = PROJECT_ROOT / "reports" / "json"
    existing = set()
    if json_dir.exists():
        for p in json_dir.glob("AK-*.json"):
            try:
                existing.add(int(p.stem.replace("AK-", "")))
            except ValueError:
                continue
    report_num = (max(existing) + 1) if existing else 1

    report = build_report(prompt, generation, analysis, report_num)
    # Override review status for playground
    report["review_status"] = "playground_draft"
    report["listener_type"] = "hybrid"
    report["reviewer_notes"] = [
        "Playground generation — interactive session, not batch pipeline.",
        "This is a draft report pending human review.",
    ]
    route = akouo_route_for_prompt(prompt, has_audio=True)
    report["akouo_router_output"] = route
    report["akouo_mode_outputs"] = [akouo_mode_output(prompt, analysis, route)]
    augment_report_with_llm(prompt, generation, analysis, report)
    return report


def build_playground_report_inline(prompt: dict, generation: dict, analysis: dict) -> dict:
    """Fallback inline report builder if the import from generate_reports fails."""
    from datetime import date

    category = prompt.get("category", "unknown")
    model = generation.get("model", "unknown")
    is_procedural = generation.get("source_type") == "generated_procedural" or "Baseline" in model
    if is_procedural:
        layers = (
            ["FM carrier/modulator layer", "granular synthetic events", "spectral sweep"]
            if "Spectral FM" in model
            else ["broadband noise layer", "low sine drone", "stochastic transient events"]
        )
        basic_description = f"{model} output for playground prompt ({category}). Procedural control, not a realistic text-to-audio rendering."
        inferred_sources = [f"synthetic {category} control profile"]
        hallucinated_sources = ["synthesis artifacts standing in for requested sources"]
        prompt_comparison = f"Prompt requested {', '.join(prompt.get('intended_sources', [])[:5])}. Generated output provides procedural layers."
        suggested_prompt_revision = "Route through a real text-to-audio backend for production."
    else:
        layers = ["unverified model-rendered soundscape layer", "prompt-conditioned ambient texture", "possible generation artifacts"]
        basic_description = f"{model} output for playground prompt ({category}). ML-generated soundscape candidate requiring bounded listening review."
        inferred_sources = [f"prompt-conditioned {category} soundscape candidate"]
        hallucinated_sources = []
        prompt_comparison = f"Prompt requested {', '.join(prompt.get('intended_sources', [])[:5])}. This automated draft does not certify which requested sources are audibly present."
        suggested_prompt_revision = "Run a routed AKOÚŌ listening pass, then revise missing-source, forbidden-source, loopability, and spatial-coherence details."

    # Simple scores based on analysis
    density = analysis.get("event_density_per_sec", 0)
    loop_disc = analysis.get("loop_boundary_discontinuity")
    loop_required = prompt.get("loop_required", False)

    loop_s = 3.0
    if loop_required:
        if loop_disc is not None and loop_disc < 0.03:
            loop_s = 4.7
        elif loop_disc is not None and loop_disc < 0.12:
            loop_s = 3.8
        elif loop_disc is not None and loop_disc < 0.35:
            loop_s = 2.7
        else:
            loop_s = 1.5

    scores = {
        "prompt_adherence": round(min(max(1.4 + (0.3 if density > 0.2 else 0), 1), 5), 1),
        "source_accuracy": 1.0,
        "spatial_coherence": round(min(max(1.8 + (0.3 if analysis.get("spectral_flatness", 0) > 0.05 else 0), 1), 5), 1),
        "event_density_score": round(min(max(density / 2.5, 1), 5), 1),
        "ecological_plausibility": 1.5,
        "causal_coherence": 1.2,
        "false_source_index": 0.5,
        "generic_naturalism_index": 0.5,
        "cultural_cliche_index": 0.5,
        "loopability": round(loop_s, 1),
        "regeneration_potential": "revise",
    }

    # Find next report number
    json_dir = PROJECT_ROOT / "reports" / "json"
    existing = set()
    if json_dir.exists():
        for p in json_dir.glob("AK-*.json"):
            try:
                existing.add(int(p.stem.replace("AK-", "")))
            except ValueError:
                continue
    report_num = (max(existing) + 1) if existing else 1
    report_id = f"AK-{report_num:04d}"

    route = akouo_route_for_prompt(prompt, has_audio=True)
    if is_procedural:
        heard_claims = []
        inferred_claims = [
            {"statement": f"The output presents a procedural {category} profile built from {', '.join(layers)}.", "confidence": "medium", "basis": "synthesis method and audible texture class"},
            {"statement": "No recognizable field-recorded source identity is established.", "confidence": "high", "basis": "procedural generation metadata"},
            {"statement": "The prompt's intended sources are abstracted into procedural control textures.", "confidence": "high", "basis": "prompt/generation comparison"},
        ]
    else:
        heard_claims = []
        inferred_claims = [
            {"statement": f"The supplied metadata identifies the output as generated by {model} for a {category} prompt.", "confidence": "high", "basis": "generation metadata and prompt record"},
            {"statement": "This draft does not establish verified source identities inside the generated soundscape.", "confidence": "high", "basis": "no human annotation or source classifier evidence is supplied"},
            {"statement": "The file should be evaluated as an ML-generated soundscape candidate rather than as documentary field evidence.", "confidence": "high", "basis": "generation source_type and model metadata"},
        ]
    report = {
        "report_id": report_id,
        "report_type": "listening_report",
        "audio_id": generation["audio_id"],
        "prompt_id": prompt.get("prompt_id", "PLAYGROUND"),
        "listening_date": date.today().isoformat(),
        "listener_type": "hybrid",
        "review_status": "playground_draft",
        "reviewer_notes": [
            "Playground generation — interactive session, not batch pipeline.",
            "This is a draft report pending human review.",
        ],
        "evidence_inputs": ["prompt metadata", "generation metadata", "signal analysis"],
        "classifier_outputs": [],
        "revision_history": [{"date": date.today().isoformat(), "change": "Playground draft created."}],
        "claim_taxonomy": {
            "heard": heard_claims,
            "measured": [
                {"statement": f"Duration is {analysis['duration']} seconds at {analysis['sample_rate']} Hz.", "confidence": "high", "basis": "audio metadata"},
                {"statement": f"RMS is {analysis['rms']:.4f} with peak level {analysis['peak_level']:.4f}.", "confidence": "high", "basis": "signal measurement"},
                {"statement": f"Spectral centroid is {analysis['spectral_centroid_hz']:.0f} Hz.", "confidence": "high", "basis": "spectral feature extraction"},
                {"statement": f"Event density is {analysis['event_density_per_sec']:.2f} events/sec.", "confidence": "high", "basis": "librosa onset detection"},
            ],
            "inferred": inferred_claims,
            "interpreted": [],
            "speculative": [],
            "undetermined": [
                {"statement": "Species, location, culture, and field-recording provenance remain undetermined.", "confidence": "high", "basis": "generated audio is not documentary evidence"},
            ],
        },
        "basic_description": basic_description,
        "sources": {
            "detected": layers,
            "inferred": inferred_sources,
            "absent_expected": prompt.get("intended_sources", []),
            "forbidden_detected": [],
            "hallucinated": hallucinated_sources,
        },
        "spatial_structure": {
            "foreground": layers[-1] if layers else "unknown",
            "midground": layers[0] if layers else "unknown",
            "background": "steady procedural bed",
            "depth": "Simulated only; no measured room impulse response.",
        },
        "temporal_behavior": {
            "onset_count": analysis.get("onset_count", 0),
            "event_density_per_sec": analysis.get("event_density_per_sec", 0),
            "silence_ratio": analysis.get("silence_ratio", 0),
            "loop_boundary_discontinuity": analysis.get("loop_boundary_discontinuity"),
            "pattern": "Procedural event placement; no verified causal sequence.",
        },
        "ecological_plausibility": "Low to moderate as a soundscape claim.",
        "causal_coherence": "Limited. Events are generated by synthesis rules.",
        "cultural_assumptions": "Prompt category flattened into a technical texture.",
        "false_sources": ["synthesis artifacts standing in for requested sources"],
        "prompt_comparison": prompt_comparison,
        "suggested_prompt_revision": suggested_prompt_revision,
        "regeneration_recommendation": scores["regeneration_potential"],
        "score_sets": {
            "signal_scores": scores,
            "agent_scores": scores,
            "human_scores": None,
            "final_scores": scores,
        },
        "score_provenance": [
            {"axis": axis, "score": scores[axis], "scorer": "hybrid", "evidence": "signal + prompt comparison", "confidence": "medium", "notes": "Playground draft score."}
            for axis in scores if axis != "regeneration_potential"
        ],
        "scores": scores,
        "akouo_router_output": route,
        "akouo_mode_outputs": [akouo_mode_output(prompt, analysis, route)],
    }
    augment_report_with_llm(prompt, generation, analysis, report)
    return report


def augment_report_with_llm(prompt: dict, generation: dict, analysis: dict, report: dict) -> None:
    """Optionally append a schema-constrained LLM listening pass."""
    try:
        from workers.listening.llm_processor import run_llm_listening

        llm_output = run_llm_listening(prompt, generation, analysis, report)
    except Exception as exc:
        report.setdefault("reviewer_notes", []).append(f"LLM listening pass unavailable: {exc}")
        return
    if not llm_output:
        return
    report.setdefault("akouo_mode_outputs", []).append(llm_output)
    report.setdefault("reviewer_notes", []).append("LLM listening pass appended through configured Algophony LLM backend.")


def analyze_upload(input_path: Path, output_path: Path) -> None:
    payload = json.loads(input_path.read_text())
    audio_path = Path(payload.get("audio_path", ""))
    analysis = analyze_audio(audio_path) or {
        "duration": None,
        "sample_rate": None,
        "channels": None,
        "rms": 0,
        "peak_level": 0,
        "spectral_centroid_hz": 0,
        "spectral_bandwidth_hz": 0,
        "spectral_flatness": 0,
        "zero_crossing_rate": 0,
        "silence_ratio": 0,
        "onset_count": 0,
        "event_density_per_sec": 0,
        "loop_boundary_discontinuity": None,
    }
    sha = hashlib.sha256(audio_path.read_bytes()).hexdigest() if audio_path.exists() else ""
    upload_meta = payload.get("upload_metadata") or {}
    prompt = {
        "prompt_id": "UPLOAD",
        "prompt_text": upload_meta.get("notes") or upload_meta.get("original_filename") or "Uploaded audio for AKOÚŌ listening",
        "category": "upload",
        "intended_sources": [],
        "forbidden_sources": [],
        "listening_mode": "signal-inspection-listening",
    }
    source_type = payload.get("source_type")
    if source_type not in ALLOWED_SOURCE_TYPES:
        source_type = "found_sound"

    generation = {
        "audio_id": audio_path.stem if audio_path.name else f"UPL-{int(time.time())}-UPLOAD-A",
        "prompt_id": "UPLOAD",
        "model": "Uploaded Audio",
        "model_version": "local-upload",
        "generation_date": date.today().isoformat(),
        "duration": analysis.get("duration") or 0,
        "seed": None,
        "parameters": {},
        "license_status": "User supplied; verify before publication",
        "file_format": audio_path.suffix.lstrip(".").lower(),
        "storage_uri": f"uploads/audio/{audio_path.name}",
        "sha256": sha,
        "human_notes": ["Uploaded through local playground."],
        "source_type": source_type,
        "upload_metadata": upload_meta,
    }
    report = build_playground_report_inline(prompt, generation, analysis)
    report["audio_id"] = generation["audio_id"]
    report["prompt_id"] = "UPLOAD"
    report["basic_description"] = "Uploaded audio analyzed in local playground mode. Provenance depends on user-supplied metadata and remains unverified."
    result = {
        "generation": generation,
        "analysis": analysis,
        "report": report,
        "sha256": sha,
    }
    output_path.write_text(json.dumps(result, ensure_ascii=False))


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--analyze-upload":
        analyze_upload(Path(sys.argv[2]), Path(sys.argv[3]))
        return

    if len(sys.argv) == 3 and sys.argv[1] == "--stdin-from":
        raw = Path(sys.argv[2]).read_text(encoding="utf-8")
    else:
        raw = sys.stdin.read()
    try:
        params = json.loads(raw)
    except json.JSONDecodeError as e:
        json.dump({"ok": False, "error": f"Invalid JSON input: {e}"}, sys.stdout)
        sys.exit(1)

    prompt_text = params.get("prompt_text", "").strip()
    provider_id = params.get("provider_id", "synth_baseline")
    duration = params.get("duration", 30)
    loop = params.get("loop", False)
    seed = params.get("seed")
    category = params.get("category", "forest")
    intended_sources = params.get("intended_sources", [])
    forbidden_sources = params.get("forbidden_sources", [])

    if not prompt_text:
        json.dump({"ok": False, "error": "No prompt_text provided."}, sys.stdout)
        sys.exit(1)

    # Build an ad-hoc prompt record
    timestamp = int(time.time())
    prompt_id = f"PG-{timestamp}"
    prompt_record = {
        "prompt_id": prompt_id,
        "prompt_text": prompt_text,
        "category": category,
        "subcategories": [],
        "intended_sources": intended_sources,
        "forbidden_sources": forbidden_sources,
        "location_imaginary": "",
        "listening_mode": "exploratory",
        "duration_target": duration,
        "loop_required": loop,
        "difficulty": "medium",
        "evaluation_focus": [],
    }

    storage_dir = str(PROJECT_ROOT / "generations" / "audio")

    try:
        resolved_id = canonical_provider_id(provider_id)
        # Try the standard pipeline approach first, fall back to simpler init
        try:
            adapter = get_adapter(resolved_id, storage_dir=storage_dir)
        except TypeError:
            # Some adapters don't accept provider_config — instantiate directly
            from workers.provider_registry import PROVIDER_REGISTRY
            spec = PROVIDER_REGISTRY[resolved_id]
            module = __import__(spec.module, fromlist=[spec.class_name])
            cls = getattr(module, spec.class_name)
            adapter = cls(storage_dir=storage_dir)
    except Exception as e:
        json.dump({"ok": False, "error": f"Provider error: {e}"}, sys.stdout)
        sys.exit(1)

    try:
        gen_params = {
            "duration_seconds": duration,
            "loop": loop,
            "variant": "A",
        }
        if seed is not None:
            gen_params["seed"] = seed

        generation = adapter.generate(prompt_record, gen_params)
    except Exception as e:
        json.dump({"ok": False, "error": f"Generation failed: {e}", "traceback": traceback.format_exc()}, sys.stdout)
        sys.exit(1)

    # Analyze the generated audio
    audio_id = generation.get("audio_id", "")
    audio_path = PROJECT_ROOT / generation.get("storage_uri", "")
    analysis = analyze_audio(audio_path)

    if not analysis:
        analysis = {
            "duration": duration, "sample_rate": 44100, "channels": 1,
            "rms": 0, "peak_level": 0, "spectral_centroid_hz": 0,
            "spectral_bandwidth_hz": 0, "spectral_flatness": 0,
            "zero_crossing_rate": 0, "silence_ratio": 0,
            "onset_count": 0, "event_density_per_sec": 0,
            "loop_boundary_discontinuity": None,
        }

    analysis["audio_id"] = audio_id
    analysis["prompt_id"] = prompt_id
    analysis["model"] = generation.get("model", "")

    # Build report
    try:
        report = build_playground_report(prompt_record, generation, analysis)
    except Exception:
        report = build_playground_report_inline(prompt_record, generation, analysis)

    result = {
        "ok": True,
        "audio_id": audio_id,
        "prompt": prompt_record,
        "generation": generation,
        "analysis": analysis,
        "report": report,
        "error": None,
    }

    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
