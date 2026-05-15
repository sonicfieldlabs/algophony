"""
Audio feature extraction for Algophony soundscapes.

Provides functions for extracting technical audio features
used in benchmark scoring and analysis reports.

Status: Stub — requires librosa and numpy.
"""


def extract_basic_features(audio_path: str) -> dict:
    """
    Extract basic audio features from a file.

    Returns dict with: duration, sample_rate, channels, rms, peak_level,
    spectral_centroid_hz, spectral_bandwidth_hz, zero_crossing_rate,
    silence_ratio, event_density_per_sec.
    """
    # TODO: Implement with librosa
    raise NotImplementedError("Feature extraction not yet implemented.")


def extract_spectral_features(audio_path: str) -> dict:
    """Extract detailed spectral features."""
    # TODO: Implement
    raise NotImplementedError("Spectral feature extraction not yet implemented.")
