"""Stable Audio via configurable Stability API endpoints."""

from __future__ import annotations

import os

import requests

from .base import GenerationAdapter, GenerationError
from .cloud_utils import save_audio_response


def _default_endpoint(path: str) -> str:
    base_url = os.getenv("ALGOPHONY_STABILITY_API_BASE_URL", "https://api.stability.ai").rstrip("/")
    return f"{base_url}{path}"


class StableAudioStabilityAdapter(GenerationAdapter):
    provider_id = "stable_audio_stability_api"
    provider_name = "Stable Audio Stability API"
    provider_type = "ml_model"
    model_version = "stable-audio"
    license_status = "Stability API generated output - review Stability API terms before publication"
    max_duration_seconds = 190
    default_endpoint_path = "/v2beta/audio/stable-audio-2/text-to-audio"
    endpoint_env = "ALGOPHONY_STABLE_AUDIO_ENDPOINT"
    model_parameter: str | None = None
    min_duration_seconds = 1.0
    max_prompt_chars = 10000

    def __init__(self, api_key: str | None = None, endpoint: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.api_key = api_key or os.getenv("ALGOPHONY_STABILITY_API_KEY", "")
        self.endpoint = endpoint or os.getenv(self.endpoint_env, "") or _default_endpoint(self.default_endpoint_path)
        self.payload_mode = os.getenv("ALGOPHONY_STABILITY_PAYLOAD_MODE", "multipart").strip().lower()
        self.output_format = os.getenv("ALGOPHONY_STABLE_AUDIO_OUTPUT_FORMAT", "mp3").strip().lower()
        if not self.api_key:
            raise GenerationError("config_error", "Missing ALGOPHONY_STABILITY_API_KEY.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        prompt_text = prompt_record["prompt_text"]
        if len(prompt_text) > self.max_prompt_chars:
            raise GenerationError(
                "prompt_too_long",
                f"Stability prompt is {len(prompt_text)} characters; maximum is {self.max_prompt_chars}.",
            )

        variant = self.resolve_variant(generation_params)
        duration = max(self.min_duration_seconds, self.resolve_duration(prompt_record, generation_params))
        seed = generation_params.get("seed")
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        output_format = str(generation_params.get("output_format", self.output_format)).lower()
        payload: dict[str, object] = {
            "prompt": prompt_text,
            "duration": duration,
            "output_format": output_format,
        }
        if self.model_parameter:
            payload["model"] = self.model_parameter
        if seed is not None:
            payload["seed"] = seed
        for key in ("steps", "cfg_scale"):
            if generation_params.get(key) is not None:
                payload[key] = generation_params[key]

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "audio/*, application/json",
            }
            if self.payload_mode == "json":
                response = requests.post(
                    self.endpoint,
                    json=payload,
                    headers={**headers, "Content-Type": "application/json"},
                    timeout=600,
                )
            else:
                response = requests.post(
                    self.endpoint,
                    files={key: (None, str(value)) for key, value in payload.items() if value is not None},
                    headers=headers,
                    timeout=600,
                )
        except requests.RequestException as e:
            raise GenerationError("network_error", str(e))
        if response.status_code in (401, 403):
            raise GenerationError("auth_error", f"Stability API auth failed: HTTP {response.status_code}")
        if response.status_code >= 400:
            raise GenerationError("api_error", f"HTTP {response.status_code}: {response.text[:300]}")

        storage_uri, sha256, ext = save_audio_response(self, audio_id, response)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=storage_uri,
            parameters={
                "provider": "stability_api",
                "endpoint": self.endpoint,
                "payload_mode": self.payload_mode,
                "model": self.model_parameter or self.model_version,
                "duration_seconds": duration,
                "requested_duration_seconds": generation_params.get("duration_seconds", prompt_record.get("duration_target", 30)),
                "output_format": output_format,
                "seed": seed,
            },
            seed=seed,
            sha256=sha256,
            file_format=ext,
        )


class StableAudio25StabilityAdapter(StableAudioStabilityAdapter):
    provider_id = "stable_audio_25_stability_api"
    provider_name = "Stable Audio 2.5 Stability API"
    model_version = "stable-audio-2.5"
    max_duration_seconds = 190
    default_endpoint_path = "/v2beta/audio/stable-audio-2/text-to-audio"
    endpoint_env = "ALGOPHONY_STABLE_AUDIO_25_ENDPOINT"
    model_parameter = "stable-audio-2.5"


class StableAudio3StabilityAdapter(StableAudioStabilityAdapter):
    provider_id = "stable_audio_3_stability_api"
    provider_name = "Stable Audio 3.0 Stability API"
    model_version = "stable-audio-3.0"
    max_duration_seconds = 360
    default_endpoint_path = "/v2beta/audio/stable-audio-3.0/text-to-audio"
    endpoint_env = "ALGOPHONY_STABLE_AUDIO_3_ENDPOINT"
    model_parameter = "stable-audio-3.0"
