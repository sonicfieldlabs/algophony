"""Project environment loading helpers."""

from __future__ import annotations

import os
from pathlib import Path


_LOADED = False


def load_project_env() -> None:
    """Load ignored local env files for Python CLI and subprocess entrypoints."""
    global _LOADED
    if _LOADED:
        return
    _LOADED = True

    try:
        from dotenv import load_dotenv
    except ImportError:
        return

    project_root = Path(__file__).resolve().parent.parent
    explicit = os.getenv("ALGOPHONY_ENV_FILE")
    candidates = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    candidates.extend(
        [
            project_root / ".env.local",
            project_root / ".env",
            project_root / "apps" / "web" / ".env.local",
        ]
    )
    for path in candidates:
        if path.exists():
            load_dotenv(path, override=False)
