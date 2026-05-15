"""Stable Audio Open 1.0 local adapter."""

from __future__ import annotations

import os

from .base import GenerationAdapter, GenerationError


class StableAudioOpenAdapter(GenerationAdapter):
    provider_id = "stable_audio_open_local"
    provider_name = "Stable Audio Open 1.0 Local"
    provider_type = "ml_model"
    model_version = "stabilityai/stable-audio-open-1.0"
    license_status = "Stable Audio Open 1.0 generated output - Stability AI Community License; commercial use requires separate license"
    max_duration_seconds = 47

    def __init__(self, model_path: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.model_id = model_path or os.getenv("ALGOPHONY_STABLE_AUDIO_OPEN_MODEL_PATH") or os.getenv("ALGOPHONY_STABLE_AUDIO_OPEN_MODEL_ID", self.model_version)
        self.device = os.getenv("ALGOPHONY_STABLE_AUDIO_OPEN_DEVICE", "auto")
        self.max_duration_seconds = int(os.getenv("ALGOPHONY_STABLE_AUDIO_OPEN_MAX_DURATION", str(self.max_duration_seconds)))
        self.model_version = self.model_id
        self._model = None
        self._model_config = None

    def _resolve_device(self, torch):
        if self.device != "auto":
            return self.device
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self):
        if self._model is not None:
            return self._model, self._model_config
        try:
            import torch
            from stable_audio_tools import get_pretrained_model
        except ImportError as e:
            raise GenerationError("not_installed", "Stable Audio Open requires stable-audio-tools and torch.") from e
        try:
            model, model_config = get_pretrained_model(self.model_id)
            device = self._resolve_device(torch)
            self._model = model.to(device)
            self._model_config = model_config
            self.device = device
        except Exception as e:
            raise GenerationError("model_access_error", f"Could not load Stable Audio Open model {self.model_id}: {e}") from e
        return self._model, self._model_config

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        try:
            import torch
            import torchaudio
            from stable_audio_tools.inference.generation import generate_diffusion_cond
        except ImportError as e:
            raise GenerationError("not_installed", "Stable Audio Open generation requires stable-audio-tools, torch, and torchaudio.") from e
        model, model_config = self._load_model()
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        sample_rate = int(model_config.get("sample_rate", 44100))
        sample_size = int(sample_rate * duration)
        conditioning = [{"prompt": prompt_text, "seconds_start": 0, "seconds_total": duration}]
        try:
            with torch.no_grad():
                audio = generate_diffusion_cond(
                    model,
                    steps=int(generation_params.get("steps", 100)),
                    cfg_scale=float(generation_params.get("cfg_scale", 7)),
                    conditioning=conditioning,
                    sample_size=sample_size,
                    sigma_min=float(generation_params.get("sigma_min", 0.3)),
                    sigma_max=float(generation_params.get("sigma_max", 500)),
                    device=self.device,
                )
        except RuntimeError as e:
            raise GenerationError("resource_error", f"Stable Audio Open generation failed: {e}") from e
        except Exception as e:
            raise GenerationError("api_error", f"Stable Audio Open generation failed: {e}") from e
        audio = audio.detach().cpu().clamp(-1, 1)
        path = self.output_path(audio_id, "wav")
        torchaudio.save(str(path), audio, sample_rate)
        sha256 = self.sha256_file(path)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=self.relative_storage_uri(audio_id, "wav"),
            parameters={"model_id": self.model_id, "duration_seconds": duration, "sample_rate": sample_rate, "device": self.device},
            seed=generation_params.get("seed"),
            sha256=sha256,
            file_format="wav",
        )
