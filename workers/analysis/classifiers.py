"""
Classification wrappers for Algophony audio analysis.

Optional integrations with CLAP, PANNs, YAMNet, and AudioSet classifiers.
Classifier outputs are evidence inputs for human and AKOÚŌ listening,
not final truth.

Status: Stub — optional for MVP.
"""


def classify_with_yamnet(audio_path: str) -> list[dict]:
    """Classify audio using YAMNet. Returns tag list with confidence."""
    # TODO: Implement with tensorflow-hub or equivalent
    raise NotImplementedError("YAMNet classifier not yet implemented.")


def classify_with_clap(audio_path: str, text_queries: list[str]) -> list[dict]:
    """Score audio against text queries using CLAP embeddings."""
    # TODO: Implement with laion-clap or equivalent
    raise NotImplementedError("CLAP classifier not yet implemented.")
