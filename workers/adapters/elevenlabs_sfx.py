"""
ElevenLabs Sound Effects adapter.

Status: Stub — verify API documentation before implementation.
See: https://elevenlabs.io/docs
"""

from .base import GenerationAdapter, GenerationError


class ElevenLabsSFXAdapter(GenerationAdapter):
    provider_id = "el_sfx"
    provider_name = "ElevenLabs Sound Effects"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via ElevenLabs Sound Effects API."""
        # TODO: Implement after verifying current API documentation
        raise GenerationError(
            "not_implemented",
            "ElevenLabs SFX adapter not yet implemented. Verify API docs first."
        )
