"""Stable Audio 2.5 via Replicate."""

from __future__ import annotations

import os
import time

import requests

from .base import GenerationAdapter, GenerationError
from .cloud_utils import save_audio_payload


class StableAudio25ReplicateAdapter(GenerationAdapter):
    provider_id = "stable_audio_25_replicate"
    provider_name = "Stable Audio 2.5 Replicate"
    provider_type = "ml_model"
    model_version = "stability-ai/stable-audio-2.5"
    license_status = "Replicate Stable Audio 2.5 generated output - review Replicate and model terms before publication"
    max_duration_seconds = 190

    def __init__(self, api_token: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN", "")
        self.model = os.getenv("ALGOPHONY_REPLICATE_STABLE_AUDIO_25_MODEL", self.model_version)
        if not self.api_token:
            raise GenerationError("config_error", "Missing REPLICATE_API_TOKEN.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        seed = generation_params.get("seed")
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        inputs = {
            "prompt": prompt_text,
            "duration": duration,
            "steps": generation_params.get("steps", 50),
            "cfg_scale": generation_params.get("cfg_scale", 7),
        }
        if seed is not None:
            inputs["seed"] = seed

        try:
            create = requests.post(
                "https://api.replicate.com/v1/predictions",
                json={"model": self.model, "input": inputs},
                headers={"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"},
                timeout=120,
            )
        except requests.RequestException as e:
            raise GenerationError("network_error", str(e))
        if create.status_code in (401, 403):
            raise GenerationError("auth_error", f"Replicate auth failed: HTTP {create.status_code}")
        if create.status_code >= 400:
            raise GenerationError("api_error", f"HTTP {create.status_code}: {create.text[:300]}")

        prediction = create.json()
        prediction_id = prediction.get("id")
        get_url = prediction.get("urls", {}).get("get")
        deadline = time.time() + float(generation_params.get("timeout_seconds", 900))
        while get_url and prediction.get("status") not in ("succeeded", "failed", "canceled"):
            if time.time() >= deadline:
                raise GenerationError("timeout", "Replicate generation timed out.")
            time.sleep(2)
            poll = requests.get(get_url, headers={"Authorization": f"Bearer {self.api_token}"}, timeout=120)
            if poll.status_code >= 400:
                raise GenerationError("api_error", f"Replicate poll HTTP {poll.status_code}: {poll.text[:300]}")
            prediction = poll.json()
        if prediction.get("status") != "succeeded":
            raise GenerationError("api_error", f"Replicate generation failed: {prediction.get('error') or prediction.get('status')}")

        storage_uri, sha256, ext = save_audio_payload(self, audio_id, prediction.get("output"))
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=storage_uri,
            parameters={"provider": "replicate", "model": self.model, "prediction_id": prediction_id, **inputs},
            seed=seed,
            sha256=sha256,
            file_format=ext,
        )
