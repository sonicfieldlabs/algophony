"""
AudioCraft / MusicGen adapter.

Status: Stub — requires audiocraft package.
"""

from .base import GenerationAdapter, GenerationError


class AudioCraftAdapter(GenerationAdapter):
    provider_id = "audiocraft"
    provider_name = "AudioCraft"

    def __init__(self, model_path: str | None = None):
        self.model_path = model_path

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via AudioCraft."""
        # TODO: Implement with audiocraft
        raise GenerationError(
            "not_implemented",
            "AudioCraft adapter not yet implemented."
        )
