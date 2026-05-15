"""Helpers for cloud audio generation adapters."""

from __future__ import annotations

import base64
from typing import Any

from .base import GenerationAdapter, GenerationError, infer_audio_extension


def save_audio_response(
    adapter: GenerationAdapter,
    audio_id: str,
    response,
    default_ext: str = "mp3",
) -> tuple[str, str, str]:
    """Persist a requests.Response containing either binary audio or JSON audio refs."""
    content_type = response.headers.get("Content-Type", "")
    if content_type.startswith("audio/") or content_type in ("application/octet-stream", "binary/octet-stream"):
        ext = infer_audio_extension(content_type, default=default_ext)
        _, sha256 = adapter.write_bytes(audio_id, ext, response.content)
        return adapter.relative_storage_uri(audio_id, ext), sha256, ext

    try:
        payload = response.json()
    except ValueError:
        raise GenerationError("api_error", f"Provider did not return audio or JSON: {response.text[:200]}")
    return save_audio_payload(adapter, audio_id, payload, default_ext=default_ext)


def save_audio_payload(
    adapter: GenerationAdapter,
    audio_id: str,
    payload: Any,
    default_ext: str = "mp3",
) -> tuple[str, str, str]:
    """Persist an audio result from JSON payload shape variants."""
    url = find_audio_url(payload)
    if url:
        _, sha256, ext = adapter.download_url_to_file(url, audio_id, default_ext)
        return adapter.relative_storage_uri(audio_id, ext), sha256, ext

    encoded = find_base64_audio(payload)
    if encoded:
        data = base64.b64decode(encoded)
        _, sha256 = adapter.write_bytes(audio_id, default_ext, data)
        return adapter.relative_storage_uri(audio_id, default_ext), sha256, default_ext

    raise GenerationError("api_error", "No audio URL or base64 audio found in provider response.")


def find_audio_url(payload: Any) -> str | None:
    """Find an audio URL in common provider payloads."""
    if isinstance(payload, str) and payload.startswith(("http://", "https://")):
        return payload
    if isinstance(payload, list):
        for item in payload:
            found = find_audio_url(item)
            if found:
                return found
    if isinstance(payload, dict):
        for key in ("audio", "audio_url", "url", "file", "output"):
            if key in payload:
                found = find_audio_url(payload[key])
                if found:
                    return found
        for value in payload.values():
            found = find_audio_url(value)
            if found:
                return found
    return None


def find_base64_audio(payload: Any) -> str | None:
    """Find base64 audio in common payload keys."""
    if isinstance(payload, dict):
        for key in ("audio_base64", "base64", "data"):
            value = payload.get(key)
            if isinstance(value, str) and len(value) > 100:
                if value.startswith("data:"):
                    return value.split(",", 1)[-1]
                return value
        for value in payload.values():
            found = find_base64_audio(value)
            if found:
                return found
    if isinstance(payload, list):
        for item in payload:
            found = find_base64_audio(item)
            if found:
                return found
    return None
