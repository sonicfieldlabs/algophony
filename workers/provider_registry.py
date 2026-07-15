"""
Provider registry for Algophony generation backends.

This module is intentionally lightweight. It must not import heavyweight local
model packages; availability checks use importlib probes and environment
configuration only.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import importlib.util
import os
import platform
import re
from pathlib import Path
from typing import Any

from workers.env import load_project_env


load_project_env()


DEFAULT_PROVIDER_CHAIN = (
    "el_sfx,"
    "stable_audio_3_stability_api,"
    "stable_audio_25_stability_api,"
    "stable_audio_25_fal,"
    "stable_audio_25_replicate,"
    "tangoflux_local,"
    "stable_audio_open_local,"
    "audiogen_local,"
    "moss_sfx_mlx,"
    "moss_sfx_local"
)

PROVIDER_STATUSES = {"available", "configured_missing_key", "not_installed", "not_implemented", "failed"}


@dataclass(frozen=True)
class ProviderSpec:
    provider_id: str
    name: str
    type: str
    runtime: str
    module: str
    class_name: str
    version: str
    license_status: str
    install_hint: str
    env_requirements: list[str] = field(default_factory=list)
    optional_dependencies: list[str] = field(default_factory=list)
    max_duration_seconds: int | None = None
    supports_loop: bool = False
    supports_seed: bool = False
    default_parameters: dict[str, Any] = field(default_factory=dict)


PROVIDER_REGISTRY: dict[str, ProviderSpec] = {
    "synth_baseline": ProviderSpec(
        provider_id="synth_baseline",
        name="Synthetic Baseline",
        type="procedural_control",
        runtime="local",
        module="workers.adapters.scaper",
        class_name="SyntheticBaselineAdapter",
        version="procedural-synth-v0.1.1",
        license_status="MIT procedural generation / no external samples",
        install_hint="Base requirements only.",
        supports_loop=True,
        supports_seed=True,
    ),
    "spectral_fm": ProviderSpec(
        provider_id="spectral_fm",
        name="Spectral FM Baseline",
        type="procedural_control",
        runtime="local",
        module="workers.adapters.spectral_fm",
        class_name="SpectralFMAdapter",
        version="spectral-fm-v0.1.1",
        license_status="MIT procedural generation / no external samples",
        install_hint="Base requirements only.",
        supports_loop=True,
        supports_seed=True,
    ),
    "el_sfx": ProviderSpec(
        provider_id="el_sfx",
        name="ElevenLabs Sound Effects",
        type="ml_model",
        runtime="api",
        module="workers.adapters.elevenlabs_sfx",
        class_name="ElevenLabsSFXAdapter",
        version="eleven_text_to_sound_v2",
        license_status="ElevenLabs generated output - review account terms before publication",
        install_hint="Set ALGOPHONY_ELEVENLABS_API_KEY.",
        env_requirements=["ALGOPHONY_ELEVENLABS_API_KEY"],
        max_duration_seconds=30,
        supports_loop=True,
    ),
    "audiogen_local": ProviderSpec(
        provider_id="audiogen_local",
        name="AudioGen Local",
        type="ml_model",
        runtime="local",
        module="workers.adapters.audiogen_local",
        class_name="AudioGenLocalAdapter",
        version="facebook/audiogen-medium",
        license_status="facebook/audiogen-medium generated output - model weights CC-BY-NC-4.0; non-commercial unless separately licensed",
        install_hint="Install requirements-local-audio.txt and optionally set ALGOPHONY_AUDIOGEN_MODEL_PATH.",
        optional_dependencies=["audiocraft", "torch", "torchaudio"],
        max_duration_seconds=30,
        supports_seed=True,
    ),
    "moss_sfx_local": ProviderSpec(
        provider_id="moss_sfx_local",
        name="MOSS SoundEffect Local",
        type="ml_model",
        runtime="local",
        module="workers.adapters.moss_sound_effect_local",
        class_name="MOSSSoundEffectLocalAdapter",
        version="OpenMOSS-Team/MOSS-SoundEffect",
        license_status="OpenMOSS SoundEffect generated output - Apache-2.0 model; verify upstream terms",
        install_hint="Install requirements-local-audio.txt, opt into remote code, and pin ALGOPHONY_MOSS_SFX_REVISION to a 40-character commit SHA.",
        env_requirements=["ALGOPHONY_MOSS_SFX_TRUST_REMOTE_CODE"],
        optional_dependencies=["transformers", "torch", "huggingface_hub"],
        max_duration_seconds=30,
        supports_seed=True,
    ),
    "moss_sfx_mlx": ProviderSpec(
        provider_id="moss_sfx_mlx",
        name="MOSS SoundEffect MLX",
        type="ml_model",
        runtime="local",
        module="workers.adapters.moss_sound_effect_mlx",
        class_name="MOSSSoundEffectMLXAdapter",
        version="appautomaton/openmoss-sound-effect-mlx",
        license_status="OpenMOSS SoundEffect MLX generated output - Apache-2.0 model; verify upstream terms",
        install_hint="Install requirements-local-macos-mlx.txt and set ALGOPHONY_MOSS_SFX_MLX_MODEL_PATH plus ALGOPHONY_MOSS_SFX_MLX_SCRIPT.",
        env_requirements=["ALGOPHONY_MOSS_SFX_MLX_MODEL_PATH", "ALGOPHONY_MOSS_SFX_MLX_SCRIPT"],
        optional_dependencies=["mlx"],
        max_duration_seconds=30,
        supports_seed=True,
    ),
    "stable_audio_open_local": ProviderSpec(
        provider_id="stable_audio_open_local",
        name="Stable Audio Open 1.0 Local",
        type="ml_model",
        runtime="local",
        module="workers.adapters.stable_audio_open",
        class_name="StableAudioOpenAdapter",
        version="stabilityai/stable-audio-open-1.0",
        license_status="Stable Audio Open 1.0 generated output - Stability AI Community License; commercial use requires separate license",
        install_hint="Install requirements-local-audio.txt, set ALGOPHONY_HF_TOKEN if needed, and accept model terms.",
        optional_dependencies=["stable_audio_tools", "torch", "torchaudio"],
        max_duration_seconds=47,
        supports_seed=True,
    ),
    "stable_audio_25_stability_api": ProviderSpec(
        provider_id="stable_audio_25_stability_api",
        name="Stable Audio 2.5 Stability API",
        type="ml_model",
        runtime="api",
        module="workers.adapters.stable_audio_25_stability",
        class_name="StableAudio25StabilityAdapter",
        version="stable-audio-2.5",
        license_status="Stability API generated output - review Stability API terms before publication",
        install_hint="Set ALGOPHONY_STABILITY_API_KEY. Optionally override ALGOPHONY_STABLE_AUDIO_25_ENDPOINT.",
        env_requirements=["ALGOPHONY_STABILITY_API_KEY"],
        max_duration_seconds=190,
        supports_seed=True,
    ),
    "stable_audio_3_stability_api": ProviderSpec(
        provider_id="stable_audio_3_stability_api",
        name="Stable Audio 3.0 Stability API",
        type="ml_model",
        runtime="api",
        module="workers.adapters.stable_audio_25_stability",
        class_name="StableAudio3StabilityAdapter",
        version="stable-audio-3.0",
        license_status="Stability API generated output - review Stability API terms before publication",
        install_hint="Set ALGOPHONY_STABILITY_API_KEY. Optionally override ALGOPHONY_STABLE_AUDIO_3_ENDPOINT.",
        env_requirements=["ALGOPHONY_STABILITY_API_KEY"],
        max_duration_seconds=360,
        supports_seed=True,
    ),
    "stable_audio_25_fal": ProviderSpec(
        provider_id="stable_audio_25_fal",
        name="Stable Audio 2.5 fal",
        type="ml_model",
        runtime="api",
        module="workers.adapters.stable_audio_25_fal",
        class_name="StableAudio25FalAdapter",
        version="fal-ai/stable-audio-25/text-to-audio",
        license_status="fal Stable Audio 2.5 generated output - review fal and model terms before publication",
        install_hint="Set FAL_KEY.",
        env_requirements=["FAL_KEY"],
        max_duration_seconds=190,
        supports_seed=True,
    ),
    "stable_audio_25_replicate": ProviderSpec(
        provider_id="stable_audio_25_replicate",
        name="Stable Audio 2.5 Replicate",
        type="ml_model",
        runtime="api",
        module="workers.adapters.stable_audio_25_replicate",
        class_name="StableAudio25ReplicateAdapter",
        version="stability-ai/stable-audio-2.5",
        license_status="Replicate Stable Audio 2.5 generated output - review Replicate and model terms before publication",
        install_hint="Set REPLICATE_API_TOKEN.",
        env_requirements=["REPLICATE_API_TOKEN"],
        max_duration_seconds=190,
        supports_seed=True,
    ),
    "tangoflux_local": ProviderSpec(
        provider_id="tangoflux_local",
        name="TangoFlux Local",
        type="ml_model",
        runtime="local",
        module="workers.adapters.tangoflux_local",
        class_name="TangoFluxLocalAdapter",
        version="declare-lab/TangoFlux",
        license_status="TangoFlux generated output - check repository and Stability AI Community License files before publication",
        install_hint="Install requirements-local-audio.txt and optionally set ALGOPHONY_TANGOFLUX_MODEL_PATH.",
        optional_dependencies=["tangoflux", "torch", "torchaudio"],
        max_duration_seconds=30,
        supports_seed=True,
        default_parameters={"steps": 25},
    ),
    "audiogen_hf_endpoint": ProviderSpec(
        provider_id="audiogen_hf_endpoint",
        name="AudioGen Hugging Face Endpoint",
        type="ml_model",
        runtime="api",
        module="workers.adapters.huggingface_endpoint",
        class_name="AudioGenHFEndpointAdapter",
        version="user-hosted-audiogen-endpoint",
        license_status="User-hosted AudioGen endpoint output - verify endpoint/model terms",
        install_hint="Set ALGOPHONY_AUDIOGEN_HF_ENDPOINT and ALGOPHONY_HF_TOKEN.",
        env_requirements=["ALGOPHONY_AUDIOGEN_HF_ENDPOINT", "ALGOPHONY_HF_TOKEN"],
        max_duration_seconds=30,
        supports_seed=True,
    ),
    "moss_sfx_hf_endpoint": ProviderSpec(
        provider_id="moss_sfx_hf_endpoint",
        name="MOSS SoundEffect Hugging Face Endpoint",
        type="ml_model",
        runtime="api",
        module="workers.adapters.huggingface_endpoint",
        class_name="MOSSHFEndpointAdapter",
        version="user-hosted-moss-sfx-endpoint",
        license_status="User-hosted MOSS endpoint output - verify endpoint/model terms",
        install_hint="Set ALGOPHONY_MOSS_SFX_HF_ENDPOINT and ALGOPHONY_HF_TOKEN.",
        env_requirements=["ALGOPHONY_MOSS_SFX_HF_ENDPOINT", "ALGOPHONY_HF_TOKEN"],
        max_duration_seconds=30,
        supports_seed=True,
    ),
    "stable_audio_open_hf_endpoint": ProviderSpec(
        provider_id="stable_audio_open_hf_endpoint",
        name="Stable Audio Open Hugging Face Endpoint",
        type="ml_model",
        runtime="api",
        module="workers.adapters.huggingface_endpoint",
        class_name="StableAudioOpenHFEndpointAdapter",
        version="user-hosted-stable-audio-open-endpoint",
        license_status="User-hosted Stable Audio Open endpoint output - verify endpoint/model terms",
        install_hint="Set ALGOPHONY_STABLE_AUDIO_OPEN_HF_ENDPOINT and ALGOPHONY_HF_TOKEN.",
        env_requirements=["ALGOPHONY_STABLE_AUDIO_OPEN_HF_ENDPOINT", "ALGOPHONY_HF_TOKEN"],
        max_duration_seconds=47,
        supports_seed=True,
    ),
    "tangoflux_hf_endpoint": ProviderSpec(
        provider_id="tangoflux_hf_endpoint",
        name="TangoFlux Hugging Face Endpoint",
        type="ml_model",
        runtime="api",
        module="workers.adapters.huggingface_endpoint",
        class_name="TangoFluxHFEndpointAdapter",
        version="user-hosted-tangoflux-endpoint",
        license_status="User-hosted TangoFlux endpoint output - verify endpoint/model terms",
        install_hint="Set ALGOPHONY_TANGOFLUX_HF_ENDPOINT and ALGOPHONY_HF_TOKEN.",
        env_requirements=["ALGOPHONY_TANGOFLUX_HF_ENDPOINT", "ALGOPHONY_HF_TOKEN"],
        max_duration_seconds=30,
        supports_seed=True,
    ),
}


ALIASES = {
    "elevenlabs": "el_sfx",
    "elevenlabs_sfx": "el_sfx",
    "synthetic": "synth_baseline",
    "baseline": "synth_baseline",
    "fm": "spectral_fm",
    "fm_baseline": "spectral_fm",
    "audiogen": "audiogen_local",
    "audio_gen": "audiogen_local",
    "audiocraft_audiogen": "audiogen_local",
    "audiocraft": "audiogen_local",
    "moss": "moss_sfx_local",
    "moss_sfx": "moss_sfx_local",
    "moss_mlx": "moss_sfx_mlx",
    "stable_audio": "stable_audio_open_local",
    "stable_audio_open": "stable_audio_open_local",
    "sta_audio_open_1_0": "stable_audio_open_local",
    "stable_audio_open_1_0": "stable_audio_open_local",
    "stable_audio_25": "stable_audio_25_stability_api",
    "stable_audio_3": "stable_audio_3_stability_api",
    "stable_audio_30": "stable_audio_3_stability_api",
    "stable_audio_3_api": "stable_audio_3_stability_api",
    "stable_25_fal": "stable_audio_25_fal",
    "stable_25_replicate": "stable_audio_25_replicate",
    "tango_flux": "tangoflux_local",
    "tangoflux": "tangoflux_local",
}


def canonical_provider_id(provider_id: str) -> str:
    return ALIASES.get(provider_id, provider_id)


def _has_all_env(names: list[str]) -> tuple[bool, list[str]]:
    missing = [name for name in names if not os.getenv(name)]
    return not missing, missing


def _has_all_packages(names: list[str]) -> tuple[bool, list[str]]:
    missing = [name for name in names if importlib.util.find_spec(name) is None]
    return not missing, missing


def _path_env_exists(name: str) -> bool:
    value = os.getenv(name, "")
    return bool(value and Path(value).expanduser().exists())


PROVIDER_OPENNESS_VALUES = {
    "open_source_internal",
    "open_weights_local",
    "open_code_hosted",
    "closed_api",
}


def provider_openness(spec: ProviderSpec) -> str:
    """Provider literacy-or-capture axis, derived from provider conventions:
    a score earned by a pinned local model describes a reproducible system; a
    score earned inside a closed API describes a service at a moment in time."""
    if spec.type in ("procedural_control", "spatial_procedural"):
        return "open_source_internal"
    if spec.runtime == "local":
        return "open_weights_local"
    if spec.provider_id.endswith("_hf_endpoint"):
        return "open_code_hosted"
    return "closed_api"


def compute_provenance_for(provider_id: str) -> dict[str, Any]:
    """Schema-conformant ``compute_provenance`` record for a generation run,
    stamped from the registry at generation time (never guessed afterwards)."""
    spec = PROVIDER_REGISTRY[canonical_provider_id(provider_id)]
    if spec.runtime == "local":
        return {
            "runtime_locality": "local",
            "hardware": f"{platform.system()} {platform.machine()}",
        }
    if spec.provider_id.endswith("_hf_endpoint"):
        return {"runtime_locality": "hosted_endpoint"}
    return {"runtime_locality": "cloud_api"}


def provider_status(provider_id: str) -> dict[str, Any]:
    key = canonical_provider_id(provider_id)
    if key not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown provider: {provider_id}")

    spec = PROVIDER_REGISTRY[key]
    record = asdict(spec)
    record["openness"] = provider_openness(spec)
    record["status"] = "available"
    record["status_reason"] = "ready"

    if spec.type == "procedural_control":
        return record

    env_ok, missing_env = _has_all_env(spec.env_requirements)
    if not env_ok:
        record["status"] = "configured_missing_key"
        record["status_reason"] = f"Missing configuration: {', '.join(missing_env)}"
        return record

    if key == "moss_sfx_local" and os.getenv("ALGOPHONY_MOSS_SFX_TRUST_REMOTE_CODE", "").lower() != "true":
        record["status"] = "configured_missing_key"
        record["status_reason"] = "Set ALGOPHONY_MOSS_SFX_TRUST_REMOTE_CODE=true to permit MOSS custom code loading."
        return record

    if key == "moss_sfx_local":
        model_path = os.getenv("ALGOPHONY_MOSS_SFX_MODEL_PATH", "").strip()
        revision = os.getenv("ALGOPHONY_MOSS_SFX_REVISION", "").strip()
        if model_path and not Path(model_path).expanduser().exists():
            record["status"] = "configured_missing_key"
            record["status_reason"] = "The configured local MOSS model path does not exist."
            return record
        if not model_path and re.fullmatch(r"[0-9a-fA-F]{40}", revision) is None:
            record["status"] = "configured_missing_key"
            record["status_reason"] = "Set ALGOPHONY_MOSS_SFX_REVISION to the immutable 40-character Hugging Face commit SHA."
            return record

    if key == "moss_sfx_mlx":
        if platform.system() != "Darwin" or platform.machine() != "arm64":
            record["status"] = "not_installed"
            record["status_reason"] = "MOSS MLX provider requires macOS arm64."
            return record
        missing_paths = [
            name for name in ("ALGOPHONY_MOSS_SFX_MLX_MODEL_PATH", "ALGOPHONY_MOSS_SFX_MLX_SCRIPT")
            if not _path_env_exists(name)
        ]
        if missing_paths:
            record["status"] = "configured_missing_key"
            record["status_reason"] = f"Missing existing path(s): {', '.join(missing_paths)}"
            return record

    if spec.runtime == "local":
        ok, missing = _has_all_packages(spec.optional_dependencies)
        if not ok:
            record["status"] = "not_installed"
            record["status_reason"] = f"Missing optional package(s): {', '.join(missing)}. {spec.install_hint}"
            return record

    return record


def list_provider_statuses() -> list[dict[str, Any]]:
    return [provider_status(key) for key in PROVIDER_REGISTRY]


def default_provider_chain() -> list[str]:
    value = os.getenv("ALGOPHONY_DEFAULT_PROVIDERS", DEFAULT_PROVIDER_CHAIN)
    return [canonical_provider_id(item.strip()) for item in value.split(",") if item.strip()]


def select_default_provider(allow_procedural_fallback: bool = False) -> tuple[list[str], list[dict[str, Any]]]:
    checked: list[dict[str, Any]] = []
    for provider_id in default_provider_chain():
        status = provider_status(provider_id)
        checked.append(status)
        if status["status"] == "available":
            return [provider_id], checked

    allow_env = os.getenv("ALGOPHONY_ALLOW_PROCEDURAL_FALLBACK", "false").lower() == "true"
    if allow_procedural_fallback or allow_env:
        return ["synth_baseline"], checked

    return [], checked
