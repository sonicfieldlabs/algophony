"""Stable Audio 2.5 via configurable Stability API endpoint."""

from __future__ import annotations

import os

import requests

from .base import GenerationAdapter, GenerationError
from .cloud_utils import save_audio_response


class StableAudio25StabilityAdapter(GenerationAdapter):
    provider_id = "stable_audio_25_stability_api"
    provider_name = "Stable Audio 2.5 Stability API"
    provider_type = "ml_model"
    model_version = "stable-audio-2.5"
    license_status = "Stability API generated output - review Stability API terms before publication"
    max_duration_seconds = 190

    def __init__(self, api_key: str | None = None, endpoint: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.api_key = api_key or os.getenv("ALGOPHONY_STABILITY_API_KEY", "")
        self.endpoint = endpoint or os.getenv("ALGOPHONY_STABLE_AUDIO_25_ENDPOINT", "")
        if not self.api_key:
            raise GenerationError("config_error", "Missing ALGOPHONY_STABILITY_API_KEY.")
        if not self.endpoint:
            raise GenerationError("config_error", "Missing ALGOPHONY_STABLE_AUDIO_25_ENDPOINT.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        seed = generation_params.get("seed")
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        payload = {
            "prompt": prompt_text,
            "duration": duration,
            "duration_seconds": duration,
        }
        if seed is not None:
            payload["seed"] = seed

        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "audio/*, application/json",
                    "Content-Type": "application/json",
                },
                timeout=300,
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
                "duration_seconds": duration,
                "requested_duration_seconds": generation_params.get("duration_seconds", prompt_record.get("duration_target", 30)),
                "seed": seed,
            },
            seed=seed,
            sha256=sha256,
            file_format=ext,
        )
