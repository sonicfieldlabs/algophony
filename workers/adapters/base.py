"""
GenerationAdapter — abstract base class for Algophony generation backends.

Every adapter must implement the `generate` method and provide metadata that
validates against schemas/generation.schema.json.
"""

from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path
from typing import Any


class GenerationAdapter(ABC):
    """
    Abstract base class for soundscape generation adapters.

    Subclasses must set provider_id and provider_name, and implement generate().
    """

    provider_id: str = ""
    provider_name: str = ""

    @abstractmethod
    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """
        Generate or synthesize one soundscape.

        Args:
            prompt_record: A validated prompt record from the atlas.
            generation_params: Additional parameters (duration, loop, seed, etc.).

        Returns:
            A generation metadata record that validates against
            schemas/generation.schema.json. Do not return raw audio bytes
            in metadata.

        Raises:
            GenerationError: If generation fails.
        """
        ...

    def build_audio_id(self, prompt_id: str, variant: str = "A") -> str:
        """Build a standardized audio ID."""
        provider_tag = self.provider_id.upper().replace("_", "-")
        return f"{prompt_id}-{provider_tag}-{variant}"

    def build_metadata(
        self,
        prompt_record: dict,
        variant: str,
        duration: float,
        storage_uri: str,
        parameters: dict | None = None,
        seed: int | None = None,
        sha256: str | None = None,
        file_format: str = "wav",
    ) -> dict:
        """Build a standard generation metadata record."""
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        record = {
            "audio_id": audio_id,
            "prompt_id": prompt_record["prompt_id"],
            "model": self.provider_name,
            "model_version": "needs verification",
            "generation_date": date.today().isoformat(),
            "duration": duration,
            "seed": seed,
            "parameters": parameters or {},
            "license_status": "internal research / publication pending",
            "file_format": file_format,
            "storage_uri": storage_uri,
            "human_notes": [],
        }
        if sha256:
            record["sha256"] = sha256
        return record

    def build_failure_record(
        self,
        prompt_id: str,
        variant: str,
        error_type: str,
        message: str,
    ) -> dict:
        """Build a structured failure record for logging."""
        return {
            "prompt_id": prompt_id,
            "provider_id": self.provider_id,
            "variant": variant,
            "status": "failed",
            "error_type": error_type,
            "message": message,
            "date": date.today().isoformat(),
        }


class GenerationError(Exception):
    """Raised when a generation adapter encounters a recoverable failure."""

    def __init__(self, error_type: str, message: str):
        self.error_type = error_type
        self.message = message
        super().__init__(f"{error_type}: {message}")
