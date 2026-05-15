"""User-hosted Hugging Face audio endpoint adapters."""

from __future__ import annotations

import os

import requests

from .base import GenerationAdapter, GenerationError
from .cloud_utils import save_audio_response


class HuggingFaceAudioEndpointAdapter(GenerationAdapter):
    endpoint_url_env = ""
    hf_model_name = "user-hosted-endpoint"
    max_duration_seconds = 30

    def __init__(self, endpoint_url: str | None = None, hf_token: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.endpoint_url = endpoint_url or os.getenv(self.endpoint_url_env, "")
        self.hf_token = hf_token or os.getenv("ALGOPHONY_HF_TOKEN", "")
        if not self.endpoint_url:
            raise GenerationError("config_error", f"Missing {self.endpoint_url_env}.")
        if not self.hf_token:
            raise GenerationError("config_error", "Missing ALGOPHONY_HF_TOKEN.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        seed = generation_params.get("seed")
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        payload = {
            "inputs": prompt_text,
            "parameters": {"duration": duration, "duration_seconds": duration, "seed": seed},
        }
        try:
            response = requests.post(
                self.endpoint_url,
                json=payload,
                headers={"Authorization": f"Bearer {self.hf_token}", "Accept": "audio/*, application/json"},
                timeout=600,
            )
        except requests.RequestException as e:
            raise GenerationError("network_error", str(e))
        if response.status_code in (401, 403):
            raise GenerationError("auth_error", f"Hugging Face endpoint auth failed: HTTP {response.status_code}")
        if response.status_code >= 400:
            raise GenerationError("api_error", f"HTTP {response.status_code}: {response.text[:300]}")

        storage_uri, sha256, ext = save_audio_response(self, audio_id, response)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=storage_uri,
            parameters={"provider": "huggingface_endpoint", "endpoint_env": self.endpoint_url_env, "model": self.hf_model_name, "duration_seconds": duration, "seed": seed},
            seed=seed,
            sha256=sha256,
            file_format=ext,
        )


class AudioGenHFEndpointAdapter(HuggingFaceAudioEndpointAdapter):
    provider_id = "audiogen_hf_endpoint"
    provider_name = "AudioGen Hugging Face Endpoint"
    provider_type = "ml_model"
    model_version = "user-hosted-audiogen-endpoint"
    license_status = "User-hosted AudioGen endpoint output - verify endpoint/model terms"
    endpoint_url_env = "ALGOPHONY_AUDIOGEN_HF_ENDPOINT"
    hf_model_name = "AudioGen"


class MOSSHFEndpointAdapter(HuggingFaceAudioEndpointAdapter):
    provider_id = "moss_sfx_hf_endpoint"
    provider_name = "MOSS SoundEffect Hugging Face Endpoint"
    provider_type = "ml_model"
    model_version = "user-hosted-moss-sfx-endpoint"
    license_status = "User-hosted MOSS endpoint output - verify endpoint/model terms"
    endpoint_url_env = "ALGOPHONY_MOSS_SFX_HF_ENDPOINT"
    hf_model_name = "MOSS-SoundEffect"


class StableAudioOpenHFEndpointAdapter(HuggingFaceAudioEndpointAdapter):
    provider_id = "stable_audio_open_hf_endpoint"
    provider_name = "Stable Audio Open Hugging Face Endpoint"
    provider_type = "ml_model"
    model_version = "user-hosted-stable-audio-open-endpoint"
    license_status = "User-hosted Stable Audio Open endpoint output - verify endpoint/model terms"
    endpoint_url_env = "ALGOPHONY_STABLE_AUDIO_OPEN_HF_ENDPOINT"
    hf_model_name = "Stable Audio Open"
    max_duration_seconds = 47


class TangoFluxHFEndpointAdapter(HuggingFaceAudioEndpointAdapter):
    provider_id = "tangoflux_hf_endpoint"
    provider_name = "TangoFlux Hugging Face Endpoint"
    provider_type = "ml_model"
    model_version = "user-hosted-tangoflux-endpoint"
    license_status = "User-hosted TangoFlux endpoint output - verify endpoint/model terms"
    endpoint_url_env = "ALGOPHONY_TANGOFLUX_HF_ENDPOINT"
    hf_model_name = "TangoFlux"
