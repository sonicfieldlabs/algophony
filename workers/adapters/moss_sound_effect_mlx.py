"""MOSS-SoundEffect MLX adapter for Apple Silicon."""

from __future__ import annotations

import os
from pathlib import Path
import platform
import subprocess
import sys

from .base import GenerationAdapter, GenerationError


class MOSSSoundEffectMLXAdapter(GenerationAdapter):
    provider_id = "moss_sfx_mlx"
    provider_name = "MOSS SoundEffect MLX"
    provider_type = "ml_model"
    model_version = "appautomaton/openmoss-sound-effect-mlx"
    license_status = "OpenMOSS SoundEffect MLX generated output - Apache-2.0 model; verify upstream terms"
    max_duration_seconds = 30

    def __init__(self, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.model_path = Path(os.getenv("ALGOPHONY_MOSS_SFX_MLX_MODEL_PATH", "")).expanduser()
        self.script_path = Path(os.getenv("ALGOPHONY_MOSS_SFX_MLX_SCRIPT", "")).expanduser()
        self.max_duration_seconds = int(os.getenv("ALGOPHONY_MOSS_SFX_MLX_MAX_DURATION", str(self.max_duration_seconds)))
        if platform.system() != "Darwin" or platform.machine() != "arm64":
            raise GenerationError("not_installed", "MOSS MLX requires macOS arm64.")
        if not self.model_path.exists():
            raise GenerationError("config_error", "ALGOPHONY_MOSS_SFX_MLX_MODEL_PATH must point to an existing model path.")
        if not self.script_path.exists():
            raise GenerationError("config_error", "ALGOPHONY_MOSS_SFX_MLX_SCRIPT must point to an existing inference script.")

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        path = self.output_path(audio_id, "wav")
        cmd = [
            sys.executable,
            str(self.script_path),
            "--ambient-sound",
            prompt_text,
            "--duration-seconds",
            str(duration),
            "--output",
            str(path),
        ]
        env = dict(os.environ)
        env["ALGOPHONY_MOSS_SFX_MLX_MODEL_PATH"] = str(self.model_path)
        try:
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=float(generation_params.get("timeout_seconds", 900)))
        except subprocess.TimeoutExpired as e:
            raise GenerationError("timeout", f"MOSS MLX timed out: {e}") from e
        if result.returncode != 0:
            raise GenerationError("api_error", f"MOSS MLX failed: {result.stderr[-1000:] or result.stdout[-1000:]}")
        if not path.exists():
            raise GenerationError("empty_response", "MOSS MLX script completed but did not write output audio.")
        sha256 = self.sha256_file(path)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=self.relative_storage_uri(audio_id, "wav"),
            parameters={"model_path": str(self.model_path), "script": str(self.script_path), "duration_seconds": duration},
            seed=generation_params.get("seed"),
            sha256=sha256,
            file_format="wav",
        )
