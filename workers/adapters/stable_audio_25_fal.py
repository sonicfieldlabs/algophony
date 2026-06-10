"""Stable Audio 2.5 via fal."""

from __future__ import annotations

import os
import time

import requests

from .base import GenerationAdapter, GenerationError
from .cloud_utils import save_audio_payload


class StableAudio25FalAdapter(GenerationAdapter):
    provider_id = "stable_audio_25_fal"
    provider_name = "Stable Audio 2.5 fal"
    provider_type = "ml_model"
    model_version = "fal-ai/stable-audio-25/text-to-audio"
    license_status = "fal Stable Audio 2.5 generated output - review fal and model terms before publication"
    max_duration_seconds = 190

    def __init__(self, api_key: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.api_key = api_key or os.getenv("FAL_KEY", "")
        self.model = os.getenv("ALGOPHONY_FAL_STABLE_AUDIO_25_MODEL", self.model_version)
        if not self.api_key:
            raise GenerationError("config_error", "Missing FAL_KEY.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        seed = generation_params.get("seed")
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        payload = {"prompt": prompt_text, "duration": duration}
        if seed is not None:
            payload["seed"] = seed

        try:
            submit = requests.post(
                f"https://queue.fal.run/{self.model}",
                json=payload,
                headers={"Authorization": f"Key {self.api_key}", "Content-Type": "application/json"},
                timeout=120,
            )
        except requests.RequestException as e:
            raise GenerationError("network_error", str(e))
        if submit.status_code in (401, 403):
            raise GenerationError("auth_error", f"fal auth failed: HTTP {submit.status_code}")
        if submit.status_code >= 400:
            raise GenerationError("api_error", f"HTTP {submit.status_code}: {submit.text[:300]}")

        data = submit.json()
        request_id = data.get("request_id") or data.get("id")
        status_url = data.get("status_url")
        response_url = data.get("response_url")
        result = data
        if status_url or response_url:
            deadline = time.time() + float(generation_params.get("timeout_seconds", 600))
            while time.time() < deadline:
                poll_url = response_url or status_url
                poll = requests.get(poll_url, headers={"Authorization": f"Key {self.api_key}"}, timeout=120)
                if poll.status_code >= 400:
                    raise GenerationError("api_error", f"fal poll HTTP {poll.status_code}: {poll.text[:300]}")
                result = poll.json()
                status = str(result.get("status", "")).upper()
                if response_url or status in ("COMPLETED", "SUCCEEDED"):
                    break
                if status in ("FAILED", "ERROR"):
                    raise GenerationError("api_error", f"fal generation failed: {result}")
                time.sleep(2)
            else:
                raise GenerationError("timeout", "fal generation timed out.")

        storage_uri, sha256, ext = save_audio_payload(self, audio_id, result)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=storage_uri,
            parameters={"provider": "fal", "model": self.model, "request_id": request_id, "duration_seconds": duration, "seed": seed},
            seed=seed,
            sha256=sha256,
            file_format=ext,
        )
