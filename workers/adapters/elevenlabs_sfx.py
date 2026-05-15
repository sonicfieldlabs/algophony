"""
ElevenLabs Sound Effects adapter.

API: POST https://api.elevenlabs.io/v1/sound-generation
Model: eleven_text_to_sound_v2
Max duration: 30 seconds
"""

import hashlib
import os
from pathlib import Path

import requests

from .base import GenerationAdapter, GenerationError


class ElevenLabsSFXAdapter(GenerationAdapter):
    provider_id = "el_sfx"
    provider_name = "ElevenLabs Sound Effects"
    provider_type = "ml_model"
    model_version = "eleven_text_to_sound_v2"
    license_status = "ElevenLabs generated output - review account terms before publication"
    max_duration_seconds = 30

    API_URL = "https://api.elevenlabs.io/v1/sound-generation"
    MAX_DURATION = 30

    def __init__(self, api_key: str | None = None, storage_dir: str = "generations/audio", **_: object):
        self.api_key = api_key or os.getenv("ALGOPHONY_ELEVENLABS_API_KEY", "")
        self.model_id = os.getenv("ALGOPHONY_ELEVENLABS_MODEL_ID", self.model_version)
        self.model_version = self.model_id
        self.storage_dir = Path(storage_dir)
        if not self.api_key:
            raise GenerationError("config_error", "No ElevenLabs API key provided.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via ElevenLabs Sound Effects API."""
        prompt_text = prompt_record["prompt_text"]
        requested_duration = generation_params.get("duration_seconds", prompt_record.get("duration_target", 30))
        duration = self.resolve_duration(prompt_record, generation_params, self.MAX_DURATION)
        loop = generation_params.get("loop", prompt_record.get("loop_required", False))
        variant = generation_params.get("variant", "A")
        prompt_influence = generation_params.get("prompt_influence", 0.5)

        payload = {
            "text": prompt_text,
            "model_id": self.model_id,
            "duration_seconds": duration,
            "prompt_influence": prompt_influence,
        }
        if loop:
            payload["loop"] = True

        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            resp = requests.post(self.API_URL, json=payload, headers=headers, timeout=120)
        except requests.RequestException as e:
            raise GenerationError("network_error", str(e))

        if resp.status_code == 429:
            raise GenerationError("quota_exceeded", "ElevenLabs rate limit reached.")
        if resp.status_code == 401:
            raise GenerationError("auth_error", "Invalid ElevenLabs API key.")
        if resp.status_code != 200:
            raise GenerationError("api_error", f"HTTP {resp.status_code}: {resp.text[:200]}")

        audio_bytes = resp.content
        if len(audio_bytes) < 100:
            raise GenerationError("empty_response", "API returned empty or tiny audio.")

        # Save audio file
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        file_path = self.storage_dir / f"{audio_id}.mp3"
        file_path.write_bytes(audio_bytes)

        sha256 = hashlib.sha256(audio_bytes).hexdigest()

        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=f"generations/audio/{audio_id}.mp3",
            parameters={
                "model_id": self.model_id,
                "requested_duration_seconds": requested_duration,
                "duration_seconds": duration,
                "loop": loop,
                "prompt_influence": prompt_influence,
            },
            sha256=sha256,
            file_format="mp3",
        )
