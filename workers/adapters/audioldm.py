"""
AudioLDM adapter — text-to-audio via latent diffusion.

Status: Stub — requires audioldm or diffusers package.
"""

from .base import GenerationAdapter, GenerationError


class AudioLDMAdapter(GenerationAdapter):
    provider_id = "audioldm"
    provider_name = "AudioLDM"
    provider_type = "ml_model"
    model_version = "audioldm-local-unconfigured"

    def __init__(self, model_path: str | None = None, **_: object):
        self.model_path = model_path

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via AudioLDM."""
        # TODO: Implement with audioldm or diffusers
        raise GenerationError(
            "not_implemented",
            "AudioLDM adapter not yet implemented."
        )
