"""
Spectral FM baseline adapter.

A second procedural baseline using FM synthesis and granular techniques
instead of the additive/noise approach of the Synthetic Baseline.

This gives the benchmark a 3-way comparison:
  1. Synthetic Baseline (additive, noise-based)
  2. Spectral FM (FM synthesis, granular)
  3. ElevenLabs SFX (ML model — when API available)

Each uses fundamentally different synthesis strategies, making the
comparison methodologically meaningful even without ML models.
"""

import hashlib
from pathlib import Path

import numpy as np
import soundfile as sf

from .base import GenerationAdapter


class SpectralFMAdapter(GenerationAdapter):
    provider_id = "spectral_fm"
    provider_name = "Spectral FM Baseline"
    provider_type = "procedural_control"
    model_version = "spectral-fm-v0.1.1"
    license_status = "MIT procedural generation / no external samples"

    def __init__(self, storage_dir: str = "generations/audio", sample_rate: int = 44100):
        self.storage_dir = Path(storage_dir)
        self.sample_rate = sample_rate

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        """Generate using FM synthesis and granular techniques."""
        duration = generation_params.get("duration_seconds", prompt_record.get("duration_target", 30))
        variant = generation_params.get("variant", "A")
        seed = generation_params.get("seed", hash(prompt_record["prompt_id"] + variant + "fm") % (2**31))

        rng = np.random.RandomState(seed)
        sr = self.sample_rate
        n_samples = int(duration * sr)
        t = np.linspace(0, duration, n_samples, endpoint=False)

        category = prompt_record.get("category", "forest")
        audio = np.zeros(n_samples, dtype=np.float64)

        # FM synthesis base — carrier + modulator
        carrier_freq = rng.uniform(80, 400)
        mod_freq = rng.uniform(0.5, 8)
        mod_depth = rng.uniform(20, 200)

        if category in ("forest", "coast", "impossible_ecology"):
            # Complex organic FM texture
            carrier_freq = rng.uniform(100, 300)
            mod_depth = rng.uniform(50, 300)
            fm = np.sin(2 * np.pi * (carrier_freq + mod_depth * np.sin(2 * np.pi * mod_freq * t)) * t / sr * 2 * np.pi)
            # Avoid the cumulative phase issue — use instantaneous frequency
            phase = np.cumsum(2 * np.pi * (carrier_freq + mod_depth * np.sin(2 * np.pi * mod_freq * t)) / sr)
            fm = np.sin(phase) * 0.15
            # Second FM layer
            c2 = rng.uniform(200, 800)
            m2 = rng.uniform(1, 5)
            d2 = rng.uniform(30, 150)
            phase2 = np.cumsum(2 * np.pi * (c2 + d2 * np.sin(2 * np.pi * m2 * t)) / sr)
            fm2 = np.sin(phase2) * 0.08
            audio += fm + fm2

        elif category in ("city", "machine", "club_exterior"):
            # Harsh industrial FM
            carrier_freq = rng.uniform(60, 200)
            mod_depth = rng.uniform(100, 500)
            mod_freq = rng.uniform(2, 20)
            phase = np.cumsum(2 * np.pi * (carrier_freq + mod_depth * np.sin(2 * np.pi * mod_freq * t)) / sr)
            audio += np.sin(phase) * 0.12
            # Metallic ring modulation
            ring_freq = rng.uniform(300, 2000)
            audio += audio * np.sin(2 * np.pi * ring_freq * t) * 0.5

        elif category in ("interior", "ritual", "archive"):
            # Gentle resonant FM
            carrier_freq = rng.uniform(200, 600)
            mod_depth = rng.uniform(10, 80)
            mod_freq = rng.uniform(0.2, 2)
            phase = np.cumsum(2 * np.pi * (carrier_freq + mod_depth * np.sin(2 * np.pi * mod_freq * t)) / sr)
            audio += np.sin(phase) * 0.08
            # Reverb-like comb filter
            delay_samples = int(rng.uniform(0.02, 0.08) * sr)
            if delay_samples < n_samples:
                delayed = np.zeros(n_samples)
                delayed[delay_samples:] = audio[:-delay_samples] * 0.6
                audio += delayed

        elif category == "ruin":
            # Decayed FM with noise bursts
            carrier_freq = rng.uniform(80, 250)
            mod_depth = rng.uniform(40, 200)
            phase = np.cumsum(2 * np.pi * (carrier_freq + mod_depth * np.sin(2 * np.pi * 0.3 * t)) / sr)
            audio += np.sin(phase) * 0.1
            # Granular noise bursts
            n_grains = rng.randint(10, 40)
            for _ in range(n_grains):
                pos = rng.randint(0, n_samples - sr//5)
                grain_len = rng.randint(sr//100, sr//10)
                grain = rng.randn(grain_len) * np.hanning(grain_len) * 0.06
                audio[pos:pos+grain_len] += grain

        else:
            # Default complex FM
            phase = np.cumsum(2 * np.pi * (carrier_freq + mod_depth * np.sin(2 * np.pi * mod_freq * t)) / sr)
            audio += np.sin(phase) * 0.1

        # Granular texture overlay for all categories
        n_micro = rng.randint(20, 80)
        for _ in range(n_micro):
            pos = rng.randint(0, max(1, n_samples - sr//10))
            grain_len = rng.randint(sr//200, sr//20)
            grain_len = min(grain_len, n_samples - pos)
            freq = rng.uniform(200, 6000)
            grain = np.sin(2 * np.pi * freq * np.arange(grain_len) / sr)
            grain *= np.hanning(grain_len) * rng.uniform(0.01, 0.06)
            audio[pos:pos+grain_len] += grain

        # Slow spectral sweep
        sweep_start = rng.uniform(100, 500)
        sweep_end = rng.uniform(500, 3000)
        sweep_freq = np.linspace(sweep_start, sweep_end, n_samples)
        sweep_phase = np.cumsum(2 * np.pi * sweep_freq / sr)
        audio += np.sin(sweep_phase) * 0.03

        # Normalize
        peak = np.max(np.abs(audio))
        if peak > 0:
            audio = audio / peak * 0.8

        # Loop crossfade
        if prompt_record.get("loop_required", False):
            fade_len = min(int(0.1 * sr), n_samples // 4)
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
            storage_uri=f"generations/audio/{audio_id}.wav",
            parameters={"sample_rate": sr, "seed": seed, "synthesis": "fm_granular", "category_profile": category},
            seed=seed,
            sha256=sha256,
            file_format="wav",
        )
