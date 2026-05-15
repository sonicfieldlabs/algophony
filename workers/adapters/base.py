"""
GenerationAdapter — abstract base class for Algophony generation backends.

Every adapter must implement the `generate` method and provide metadata that
validates against schemas/generation.schema.json.
"""

from abc import ABC, abstractmethod
from datetime import date
import hashlib
from pathlib import Path
from typing import Any

import requests


class GenerationAdapter(ABC):
    """
    Abstract base class for soundscape generation adapters.

    Subclasses must set provider_id and provider_name, and implement generate().
    """

    provider_id: str = ""
    provider_name: str = ""
    provider_type: str = "procedural_control"
    model_version: str = "unspecified"
    license_status: str = "Generated output - review provider/model terms before publication"
    max_duration_seconds: int | None = None

    def __init__(
        self,
        storage_dir: str = "generations/audio",
        provider_config: dict | None = None,
        **_: Any,
    ):
        self.storage_dir = Path(storage_dir)
        self.provider_config = provider_config or {}

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

    def resolve_variant(self, generation_params: dict) -> str:
        """Resolve generation variant from params."""
        return generation_params.get("variant", "A")

    def resolve_duration(
        self,
        prompt_record: dict,
        generation_params: dict,
        max_duration: int | float | None = None,
    ) -> float:
        """Resolve and clamp generation duration."""
        requested = generation_params.get("duration_seconds", prompt_record.get("duration_target", 30))
        duration = float(requested)
        cap = max_duration if max_duration is not None else self.max_duration_seconds
        if cap is not None:
            duration = min(duration, float(cap))
        return duration

    def output_path(self, audio_id: str, ext: str) -> Path:
        """Return absolute output path for an audio file."""
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        return self.storage_dir / f"{audio_id}.{ext.lstrip('.')}"

    def relative_storage_uri(self, audio_id: str, ext: str) -> str:
        """Return public relative storage URI."""
        return f"generations/audio/{audio_id}.{ext.lstrip('.')}"

    def sha256_file(self, path: Path) -> str:
        """Hash an audio file."""
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def write_bytes(self, audio_id: str, ext: str, data: bytes) -> tuple[Path, str]:
        """Write bytes to storage and return path/hash."""
        if len(data) < 100:
            raise GenerationError("empty_response", "Provider returned empty or tiny audio.")
        path = self.output_path(audio_id, ext)
        path.write_bytes(data)
        return path, self.sha256_file(path)

    def download_url_to_file(
        self,
        url: str,
        audio_id: str,
        ext: str = "mp3",
        headers: dict | None = None,
    ) -> tuple[Path, str, str]:
        """Download an audio URL to storage and infer file extension when possible."""
        try:
            resp = requests.get(url, headers=headers or {}, timeout=180)
        except requests.RequestException as e:
            raise GenerationError("network_error", str(e))
        if resp.status_code >= 400:
            raise GenerationError("api_error", f"Download failed HTTP {resp.status_code}: {resp.text[:200]}")
        content_type = resp.headers.get("Content-Type", "")
        inferred = infer_audio_extension(content_type, url, ext)
        path, sha256 = self.write_bytes(audio_id, inferred, resp.content)
        return path, sha256, inferred

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
            "model_version": self.model_version,
            "generation_date": date.today().isoformat(),
            "duration": duration,
            "seed": seed,
            "parameters": parameters or {},
            "license_status": self.license_status,
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


def infer_audio_extension(content_type: str = "", url: str = "", default: str = "mp3") -> str:
    """Infer a supported audio extension from content type or URL."""
    normalized = content_type.lower().split(";")[0].strip()
    if normalized in ("audio/wav", "audio/x-wav"):
        return "wav"
    if normalized in ("audio/mpeg", "audio/mp3"):
        return "mp3"
    if normalized in ("audio/flac", "audio/x-flac"):
        return "flac"
    if normalized in ("audio/ogg", "application/ogg"):
        return "ogg"
    suffix = Path(url.split("?", 1)[0]).suffix.lower().lstrip(".")
    if suffix in {"wav", "mp3", "flac", "aiff", "ogg"}:
        return suffix
    return default
