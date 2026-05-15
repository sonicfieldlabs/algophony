"""TangoFlux local adapter."""

from __future__ import annotations

import os

from .base import GenerationAdapter, GenerationError


class TangoFluxLocalAdapter(GenerationAdapter):
    provider_id = "tangoflux_local"
    provider_name = "TangoFlux Local"
    provider_type = "ml_model"
    model_version = "declare-lab/TangoFlux"
    license_status = "TangoFlux generated output - check repository and Stability AI Community License files before publication"
    max_duration_seconds = 30

    def __init__(self, model_path: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.model_id = model_path or os.getenv("ALGOPHONY_TANGOFLUX_MODEL_PATH") or os.getenv("ALGOPHONY_TANGOFLUX_MODEL_ID", self.model_version)
        self.device = os.getenv("ALGOPHONY_TANGOFLUX_DEVICE", "auto")
        self.steps = int(os.getenv("ALGOPHONY_TANGOFLUX_STEPS", "25"))
        self.max_duration_seconds = int(os.getenv("ALGOPHONY_TANGOFLUX_MAX_DURATION", str(self.max_duration_seconds)))
        self.model_version = self.model_id
        self._model = None

    def _load_model(self):
        if self._model is not None:
            return self._model
        try:
            from tangoflux import TangoFluxInference
        except ImportError as e:
            raise GenerationError("not_installed", "TangoFlux requires the tangoflux package. Install requirements-local-audio.txt.") from e
        try:
            self._model = TangoFluxInference(name=self.model_id)
        except Exception as e:
            raise GenerationError("model_access_error", f"Could not load TangoFlux model {self.model_id}: {e}") from e
        return self._model

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        try:
            import torch
            import torchaudio
        except ImportError as e:
            raise GenerationError("not_installed", "TangoFlux output handling requires torch and torchaudio.") from e
        model = self._load_model()
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        steps = int(generation_params.get("steps", self.steps))
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        try:
            audio = model.generate(prompt_text, steps=steps, duration=duration)
        except RuntimeError as e:
            raise GenerationError("resource_error", f"TangoFlux generation failed: {e}") from e
        except Exception as e:
            raise GenerationError("api_error", f"TangoFlux generation failed: {e}") from e
        if hasattr(audio, "detach"):
            audio = audio.detach().cpu()
        elif not isinstance(audio, torch.Tensor):
            audio = torch.tensor(audio)
        if audio.ndim == 1:
            audio = audio.unsqueeze(0)
        path = self.output_path(audio_id, "wav")
        torchaudio.save(str(path), audio, 44100)
        sha256 = self.sha256_file(path)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=self.relative_storage_uri(audio_id, "wav"),
            parameters={"model_id": self.model_id, "duration_seconds": duration, "steps": steps, "sample_rate": 44100},
            seed=generation_params.get("seed"),
            sha256=sha256,
            file_format="wav",
        )
