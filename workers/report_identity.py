"""Stable report references, with compatibility for existing dataset identities."""
import hashlib
import re


def report_id_for_audio(audio_id: str, assigned: str | None = None) -> str:
    if not isinstance(audio_id, str) or not audio_id:
        raise ValueError("Report identity requires a non-empty audio ID")
    if assigned is not None:
        if not isinstance(assigned, str) or not re.fullmatch(r"AK-(?:[0-9]{4}|[0-9a-f]{64})", assigned):
            raise ValueError("Generation contains an invalid report identity")
        return assigned
    return "AK-" + hashlib.sha256(audio_id.encode("utf-8")).hexdigest()
