"""AudioGen local adapter via AudioCraft."""

from __future__ import annotations

import os

from .base import GenerationAdapter, GenerationError


class AudioGenLocalAdapter(GenerationAdapter):
    provider_id = "audiogen_local"
    provider_name = "AudioGen Local"
    provider_type = "ml_model"
    model_version = "facebook/audiogen-medium"
    license_status = "facebook/audiogen-medium generated output - model weights CC-BY-NC-4.0; non-commercial unless separately licensed"
    max_duration_seconds = 30

    def __init__(self, model_path: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        self.model_id = model_path or os.getenv("ALGOPHONY_AUDIOGEN_MODEL_PATH") or os.getenv("ALGOPHONY_AUDIOGEN_MODEL_ID", self.model_version)
        self.device = os.getenv("ALGOPHONY_AUDIOGEN_DEVICE", "auto")
        self.max_duration_seconds = int(os.getenv("ALGOPHONY_AUDIOGEN_MAX_DURATION", str(self.max_duration_seconds)))
        self._model = None
        self.model_version = self.model_id

    def _load_model(self):
        if self._model is not None:
            return self._model
        try:
            from audiocraft.models import AudioGen
        except ImportError as e:
            raise GenerationError("not_installed", "AudioGen requires AudioCraft. Install requirements-local-audio.txt.") from e
        try:
            self._model = AudioGen.get_pretrained(self.model_id)
        except Exception as e:
            raise GenerationError("model_access_error", f"Could not load AudioGen model {self.model_id}: {e}") from e
        return self._model

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        try:
            import torchaudio
        except ImportError as e:
            raise GenerationError("not_installed", "AudioGen local output requires torchaudio.") from e
        model = self._load_model()
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        try:
            model.set_generation_params(duration=duration)
            wav = model.generate([prompt_text])[0].detach().cpu()
        except RuntimeError as e:
            raise GenerationError("resource_error", f"AudioGen generation failed: {e}") from e
        except Exception as e:
            raise GenerationError("api_error", f"AudioGen generation failed: {e}") from e
        sample_rate = getattr(model, "sample_rate", 32000)
        path = self.output_path(audio_id, "wav")
        torchaudio.save(str(path), wav, sample_rate)
        sha256 = self.sha256_file(path)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=self.relative_storage_uri(audio_id, "wav"),
            parameters={"model_id": self.model_id, "duration_seconds": duration, "sample_rate": sample_rate},
            seed=generation_params.get("seed"),
            sha256=sha256,
            file_format="wav",
        )
