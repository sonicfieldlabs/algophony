"""MOSS-SoundEffect local adapter."""

from __future__ import annotations

import os
import re
from pathlib import Path

from .base import GenerationAdapter, GenerationError


class MOSSSoundEffectLocalAdapter(GenerationAdapter):
    provider_id = "moss_sfx_local"
    provider_name = "MOSS SoundEffect Local"
    provider_type = "ml_model"
    model_version = "OpenMOSS-Team/MOSS-SoundEffect"
    license_status = "OpenMOSS SoundEffect generated output - Apache-2.0 model; verify upstream terms"
    max_duration_seconds = 30
    _COMMIT_REVISION = re.compile(r"[0-9a-fA-F]{40}")

    def __init__(self, model_path: str | None = None, storage_dir: str = "generations/audio", **kwargs):
        super().__init__(storage_dir=storage_dir, **kwargs)
        configured_path = model_path or os.getenv("ALGOPHONY_MOSS_SFX_MODEL_PATH", "").strip()
        if configured_path:
            local_path = Path(configured_path).expanduser()
            if not local_path.exists():
                raise GenerationError("config_error", "The configured local MOSS model path does not exist.")
            self.model_id = str(local_path)
            is_local_model = True
        else:
            self.model_id = os.getenv("ALGOPHONY_MOSS_SFX_MODEL_ID", self.model_version)
            is_local_model = False
        self.device = os.getenv("ALGOPHONY_MOSS_SFX_DEVICE", "auto")
        self.max_duration_seconds = int(os.getenv("ALGOPHONY_MOSS_SFX_MAX_DURATION", str(self.max_duration_seconds)))
        self.revision = None if is_local_model else os.getenv("ALGOPHONY_MOSS_SFX_REVISION", "").strip()
        if not is_local_model and not self._COMMIT_REVISION.fullmatch(self.revision):
            raise GenerationError(
                "config_error",
                "Set ALGOPHONY_MOSS_SFX_REVISION to the 40-character Hugging Face commit SHA before loading remote MOSS custom code.",
            )
        self.model_version = "local-model" if is_local_model else f"{self.model_id}@{self.revision}"
        if os.getenv("ALGOPHONY_MOSS_SFX_TRUST_REMOTE_CODE", "").lower() != "true":
            raise GenerationError("config_error", "Set ALGOPHONY_MOSS_SFX_TRUST_REMOTE_CODE=true before loading MOSS custom code.")
        self._model = None
        self._processor = None

    def _load_model(self):
        if self._model is not None:
            return self._model, self._processor
        try:
            import torch
            from transformers import AutoModel, AutoProcessor
        except ImportError as e:
            raise GenerationError("not_installed", "MOSS local requires torch and transformers. Install requirements-local-audio.txt.") from e
        try:
            self._processor = AutoProcessor.from_pretrained(
                self.model_id,
                revision=self.revision,
                trust_remote_code=True,
            )
            self._model = AutoModel.from_pretrained(
                self.model_id,
                revision=self.revision,
                trust_remote_code=True,
            )
            if self.device != "auto":
                self._model = self._model.to(self.device)
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self._model = self._model.to("mps")
        except Exception as e:
            raise GenerationError("model_access_error", f"Could not load MOSS model {self.model_id}: {e}") from e
        return self._model, self._processor

    def _generate_with_moss(self, prompt: str, duration: float, output_path):
        model, processor = self._load_model()
        candidate_names = ("generate_audio", "generate_sound", "text_to_audio", "generate")
        for name in candidate_names:
            fn = getattr(model, name, None)
            if not callable(fn):
                continue
            try:
                result = fn(prompt=prompt, duration_seconds=duration, processor=processor, output_path=str(output_path))
            except TypeError:
                try:
                    result = fn(prompt, duration)
                except TypeError:
                    continue
            return result
        raise GenerationError(
            "not_implemented",
            "Loaded MOSS model, but no supported generation method was found. Expected generate_audio/generate_sound/text_to_audio/generate.",
        )

    def generate(self, prompt_record: dict, generation_params: dict) -> dict:
        try:
            import soundfile as sf
            import torch
        except ImportError as e:
            raise GenerationError("not_installed", "MOSS output handling requires soundfile and torch.") from e
        prompt_text = prompt_record["prompt_text"]
        variant = self.resolve_variant(generation_params)
        duration = self.resolve_duration(prompt_record, generation_params)
        audio_id = self.build_audio_id(prompt_record["prompt_id"], variant)
        path = self.output_path(audio_id, "wav")
        result = self._generate_with_moss(prompt_text, duration, path)
        if not path.exists():
            if isinstance(result, tuple) and len(result) >= 2:
                audio, sample_rate = result[0], int(result[1])
            else:
                audio = result
                sample_rate = 44100
            if hasattr(audio, "detach"):
                audio = audio.detach().cpu()
            if isinstance(audio, torch.Tensor):
                audio = audio.numpy()
            sf.write(str(path), audio, sample_rate)
        sha256 = self.sha256_file(path)
        return self.build_metadata(
            prompt_record=prompt_record,
            variant=variant,
            duration=duration,
            storage_uri=self.relative_storage_uri(audio_id, "wav"),
            parameters={
                "model_id": self.model_id,
                "model_revision": self.revision,
                "duration_seconds": duration,
                "trust_remote_code": True,
            },
            seed=generation_params.get("seed"),
            sha256=sha256,
            file_format="wav",
        )
