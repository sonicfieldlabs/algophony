"""
Scaper adapter — controlled procedural/sample-based baseline.

Status: Stub — requires scaper package.
See: https://github.com/justinsalamon/scaper
"""

from .base import GenerationAdapter, GenerationError


class ScaperAdapter(GenerationAdapter):
    provider_id = "scaper"
    provider_name = "Scaper"

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate soundscape via Scaper procedural synthesis."""
        # TODO: Implement with scaper library
        raise GenerationError(
            "not_implemented",
            "Scaper adapter not yet implemented."
        )
