#!/usr/bin/env python3
"""Fast provider contract tests with mocked cloud responses."""

from __future__ import annotations

import tempfile
import unittest
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from workers.adapters.elevenlabs_sfx import ElevenLabsSFXAdapter
from workers.adapters.stable_audio_25_stability import (
    StableAudio25StabilityAdapter,
    StableAudio3StabilityAdapter,
)


PROMPT = {
    "prompt_id": "ALG-0001",
    "prompt_text": "Layered coastal fog soundscape with low swell, distant horn, wet stones, no speech.",
    "category": "coast",
    "duration_target": 12,
    "loop_required": True,
}


class MockResponse:
    def __init__(self, content_type: str = "audio/mpeg", content: bytes | None = None):
        self.status_code = 200
        self.headers = {"Content-Type": content_type}
        self.content = content or (b"ID3" + b"0" * 256)
        self.text = ""

    def json(self):
        return {}


class ProviderContractTests(unittest.TestCase):
    def test_elevenlabs_sound_generation_payload_and_metadata(self) -> None:
        calls = []

        def fake_post(url, json=None, headers=None, timeout=None):
            calls.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
            return MockResponse("audio/mpeg")

        with tempfile.TemporaryDirectory() as tmp, patch("workers.adapters.elevenlabs_sfx.requests.post", fake_post):
            adapter = ElevenLabsSFXAdapter(api_key="test-key", storage_dir=tmp)
            meta = adapter.generate(PROMPT, {"duration_seconds": 12, "loop": True, "variant": "A"})

        self.assertEqual(calls[0]["url"], "https://api.elevenlabs.io/v1/sound-generation")
        self.assertEqual(calls[0]["headers"]["xi-api-key"], "test-key")
        self.assertEqual(calls[0]["json"]["model_id"], "eleven_text_to_sound_v2")
        self.assertEqual(calls[0]["json"]["duration_seconds"], 12)
        self.assertTrue(calls[0]["json"]["loop"])
        self.assertEqual(meta["source_type"], "generated_ml")
        self.assertEqual(meta["file_format"], "mp3")
        self.assertTrue(meta["storage_uri"].endswith(".mp3"))

    def test_stable_audio_25_uses_multipart_text_to_audio_contract(self) -> None:
        calls = []

        def fake_post(url, files=None, headers=None, timeout=None):
            calls.append({"url": url, "files": files, "headers": headers, "timeout": timeout})
            return MockResponse("audio/wav", b"RIFF" + b"0" * 256)

        with tempfile.TemporaryDirectory() as tmp, patch("workers.adapters.stable_audio_25_stability.requests.post", fake_post):
            adapter = StableAudio25StabilityAdapter(api_key="test-key", endpoint="https://example.test/stable25", storage_dir=tmp)
            meta = adapter.generate(PROMPT, {"duration_seconds": 45, "seed": 42, "variant": "B", "steps": 8})

        fields = {key: value[1] for key, value in calls[0]["files"].items()}
        self.assertEqual(calls[0]["url"], "https://example.test/stable25")
        self.assertEqual(calls[0]["headers"]["Authorization"], "Bearer test-key")
        self.assertEqual(fields["model"], "stable-audio-2.5")
        self.assertEqual(fields["prompt"], PROMPT["prompt_text"])
        self.assertEqual(fields["duration"], "45.0")
        self.assertEqual(fields["seed"], "42")
        self.assertEqual(fields["steps"], "8")
        self.assertEqual(meta["model_version"], "stable-audio-2.5")
        self.assertEqual(meta["source_type"], "generated_ml")
        self.assertEqual(meta["file_format"], "wav")

    def test_stable_audio_3_clamps_to_six_minutes_and_defaults_endpoint(self) -> None:
        calls = []

        def fake_post(url, files=None, headers=None, timeout=None):
            calls.append({"url": url, "files": files, "headers": headers, "timeout": timeout})
            return MockResponse("audio/mpeg")

        with tempfile.TemporaryDirectory() as tmp, patch("workers.adapters.stable_audio_25_stability.requests.post", fake_post):
            adapter = StableAudio3StabilityAdapter(api_key="test-key", storage_dir=tmp)
            meta = adapter.generate(PROMPT, {"duration_seconds": 999, "variant": "C"})

        fields = {key: value[1] for key, value in calls[0]["files"].items()}
        self.assertTrue(calls[0]["url"].endswith("/v2beta/audio/stable-audio-3.0/text-to-audio"))
        self.assertEqual(fields["model"], "stable-audio-3.0")
        self.assertEqual(fields["duration"], "360.0")
        self.assertEqual(meta["duration"], 360.0)
        self.assertEqual(meta["model_version"], "stable-audio-3.0")


class ProviderOpennessTests(unittest.TestCase):
    def test_openness_profiles_cover_registry(self) -> None:
        from workers.provider_registry import (
            PROVIDER_OPENNESS_VALUES,
            PROVIDER_REGISTRY,
            provider_openness,
            provider_status,
        )

        for key, spec in PROVIDER_REGISTRY.items():
            openness = provider_openness(spec)
            self.assertIn(openness, PROVIDER_OPENNESS_VALUES, key)
            self.assertEqual(provider_status(key)["openness"], openness)

        by_id = {key: provider_openness(spec) for key, spec in PROVIDER_REGISTRY.items()}
        self.assertEqual(by_id["synth_baseline"], "open_source_internal")
        self.assertEqual(by_id["stable_audio_open_local"], "open_weights_local")
        self.assertEqual(by_id["tangoflux_hf_endpoint"], "open_code_hosted")
        self.assertEqual(by_id["el_sfx"], "closed_api")
        self.assertEqual(by_id["stable_audio_3_stability_api"], "closed_api")

    def test_compute_provenance_stamps_locality(self) -> None:
        from workers.provider_registry import compute_provenance_for

        local = compute_provenance_for("synth_baseline")
        self.assertEqual(local["runtime_locality"], "local")
        self.assertIn("hardware", local)
        self.assertEqual(compute_provenance_for("el_sfx"), {"runtime_locality": "cloud_api"})
        self.assertEqual(compute_provenance_for("moss_sfx_hf_endpoint"), {"runtime_locality": "hosted_endpoint"})


if __name__ == "__main__":
    unittest.main()
