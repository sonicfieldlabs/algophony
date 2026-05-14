"""
Stable Audio Open adapter.

Status: Stub — optional for MVP.
"""

from .base import GenerationAdapter, GenerationError


class StableAudioOpenAdapter(GenerationAdapter):
    provider_id = "stable_audio"
    provider_name = "Stable Audio Open"

    def __init__(self, model_path: str | None = None):
        self.model_path = model_path

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via Stable Audio Open."""
        # TODO: Implement after first 3 modes are stable
        raise GenerationError(
            "not_implemented",
            "Stable Audio Open adapter not yet implemented."
        )
