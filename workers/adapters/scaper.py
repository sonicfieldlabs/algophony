"""
Synthetic procedural baseline adapter.

Generates deterministic synthetic soundscapes using sine waves, noise, and
amplitude modulation. Serves as a controlled baseline where every parameter
is known — no ML model, no training data bias.

This replaces Scaper for MVP since Scaper requires a sample library.
"""

import hashlib
import os
from pathlib import Path

import numpy as np
import soundfile as sf

from .base import GenerationAdapter, GenerationError


class SyntheticBaselineAdapter(GenerationAdapter):
    provider_id = "synth_baseline"
    provider_name = "Synthetic Baseline"

    def __init__(self, storage_dir: str = "generations/audio", sample_rate: int = 44100):
        self.storage_dir = Path(storage_dir)
        self.sample_rate = sample_rate

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate a synthetic baseline soundscape."""
        duration = generation_params.get("duration_seconds", prompt_record.get("duration_target", 30))
        variant = generation_params.get("variant", "A")
        seed = generation_params.get("seed", hash(prompt_record["prompt_id"] + variant) % (2**31))

        rng = np.random.RandomState(seed)
        sr = self.sample_rate
        n_samples = int(duration * sr)
        t = np.linspace(0, duration, n_samples, endpoint=False)

        # Build layers based on category
        category = prompt_record.get("category", "forest")
        audio = np.zeros(n_samples, dtype=np.float64)

        if category in ("forest", "coast", "ruin", "impossible_ecology"):
            # Broadband noise base (wind/ambience)
            noise = rng.randn(n_samples) * 0.05
            # Slow amplitude modulation
            mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t + rng.uniform(0, 2*np.pi))
            audio += noise * mod

            # Low drone
            f0 = rng.uniform(40, 120)
            audio += 0.03 * np.sin(2 * np.pi * f0 * t)

            # Sporadic events (clicks/cracks)
            n_events = rng.randint(5, 20)
            for _ in range(n_events):
                pos = rng.randint(0, n_samples - sr//10)
                length = rng.randint(sr//100, sr//10)
                env = np.hanning(length)
                freq = rng.uniform(200, 4000)
                event = env * np.sin(2 * np.pi * freq * np.arange(length) / sr) * 0.1
                audio[pos:pos+length] += event

        elif category in ("city", "machine", "club_exterior"):
            # Low-frequency rumble
            f0 = rng.uniform(30, 80)
            audio += 0.06 * np.sin(2 * np.pi * f0 * t)
            # Mid-frequency texture
            audio += rng.randn(n_samples) * 0.03
            # Rhythmic pulse
            pulse_rate = rng.uniform(0.5, 4.0)
            pulse = 0.5 + 0.5 * np.sin(2 * np.pi * pulse_rate * t)
            audio *= (0.7 + 0.3 * pulse)
            # Occasional transients
            n_events = rng.randint(3, 15)
            for _ in range(n_events):
                pos = rng.randint(0, n_samples - sr//5)
                length = rng.randint(sr//50, sr//5)
                env = np.hanning(length)
                freq = rng.uniform(100, 2000)
                audio[pos:pos+length] += env * np.sin(2 * np.pi * freq * np.arange(length) / sr) * 0.08

        elif category in ("interior", "ritual", "archive"):
            # Quiet room tone
            audio += rng.randn(n_samples) * 0.01
            # Resonant frequency
            f0 = rng.uniform(60, 300)
            audio += 0.02 * np.sin(2 * np.pi * f0 * t)
            # Sparse events
            n_events = rng.randint(2, 10)
            for _ in range(n_events):
                pos = rng.randint(0, n_samples - sr//4)
                length = rng.randint(sr//20, sr//2)
                env = np.hanning(length)
                freq = rng.uniform(300, 5000)
                audio[pos:pos+length] += env * np.sin(2 * np.pi * freq * np.arange(length) / sr) * 0.05

        else:
            audio += rng.randn(n_samples) * 0.04

        # Normalize
        peak = np.max(np.abs(audio))
        if peak > 0:
            audio = audio / peak * 0.8

        # Loop crossfade if required
        if prompt_record.get("loop_required", False):
            fade_len = min(int(0.05 * sr), n_samples // 4)
            fade_in = np.linspace(0, 1, fade_len)
            fade_out = np.linspace(1, 0, fade_len)
            audio[:fade_len] *= fade_in
            audio[-fade_len:] *= fade_out

        # Save
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        file_path = self.storage_dir / f"{audio_id}.wav"
        sf.write(str(file_path), audio, sr)

        sha256 = hashlib.sha256(file_path.read_bytes()).hexdigest()

        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=str(file_path),
            parameters={"sample_rate": sr, "seed": seed, "category_profile": category},
            seed=seed,
            sha256=sha256,
            file_format="wav",
        )
