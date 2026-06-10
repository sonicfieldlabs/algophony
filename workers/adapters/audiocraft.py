"""
AudioCraft / MusicGen adapter.

Status: Stub — requires audiocraft package.
"""

from __future__ import annotations

from .base import GenerationAdapter, GenerationError


class AudioCraftAdapter(GenerationAdapter):
    provider_id = "audiocraft"
    provider_name = "AudioCraft"
    provider_type = "ml_model"
    model_version = "audiocraft-local-unconfigured"

    def __init__(self, model_path: str | None = None, **_: object):
        self.model_path = model_path

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via AudioCraft."""
        # TODO: Implement with audiocraft
        raise GenerationError(
            "not_implemented",
            "AudioCraft adapter not yet implemented."
        )
