"""
SpatialScaper adapter — spatial soundscape simulation.

Status: Stub — optional for MVP.
"""

from .base import GenerationAdapter, GenerationError


class SpatialScaperAdapter(GenerationAdapter):
    provider_id = "spatialscaper"
    provider_name = "SpatialScaper"

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate spatial soundscape via SpatialScaper."""
        # TODO: Implement for spatial simulation tests
        raise GenerationError(
            "not_implemented",
            "SpatialScaper adapter not yet implemented."
        )
