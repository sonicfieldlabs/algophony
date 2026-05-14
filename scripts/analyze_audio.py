#!/usr/bin/env python3
"""
Extract technical audio features from generated soundscapes.

Minimum analysis:
  - Duration, sample rate, channel count
  - RMS / loudness proxy, peak level
  - Basic spectral centroid, spectral bandwidth
  - Zero crossing rate
  - Silence ratio
  - Basic onset/event density proxy
  - Loop boundary discontinuity proxy

Usage:
    python scripts/analyze_audio.py \\
        --metadata generations/metadata/generations-v0.1.jsonl \\
        --out generations/metadata/audio-analysis-v0.1.jsonl

Status: Stub — requires librosa or equivalent audio analysis library.
"""

import argparse
import json
import sys
from pathlib import Path


def analyze_file(audio_path: Path) -> dict | None:
    """
    Analyze a single audio file and return feature dict.

    Requires librosa. Returns None if file not found or analysis fails.
    """
    if not audio_path.exists():
        return None

    try:
        import librosa
        import numpy as np
    except ImportError:
        print("Error: librosa and numpy required. Install with: pip install librosa numpy")
        sys.exit(1)

    y, sr = librosa.load(str(audio_path), sr=None, mono=False)

    # Handle mono/stereo
    if y.ndim == 1:
        channels = 1
        y_mono = y
    else:
        channels = y.shape[0]
        y_mono = librosa.to_mono(y)

    duration = librosa.get_duration(y=y_mono, sr=sr)
    rms = float(np.sqrt(np.mean(y_mono ** 2)))
    peak = float(np.max(np.abs(y_mono)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y_mono)))

    # Spectral features
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y_mono, sr=sr)))
    bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y_mono, sr=sr)))

    # Silence ratio (frames below -40dB)
    frame_rms = librosa.feature.rms(y=y_mono)[0]
    silence_threshold = 10 ** (-40 / 20)
    silence_ratio = float(np.sum(frame_rms < silence_threshold) / len(frame_rms))

    # Event density proxy (onset count / duration)
    onsets = librosa.onset.onset_detect(y=y_mono, sr=sr)
    event_density = len(onsets) / duration if duration > 0 else 0

    # Loop boundary discontinuity proxy
    # Compare first and last 50ms of audio
    boundary_samples = int(0.05 * sr)
    if len(y_mono) > boundary_samples * 2:
        start_rms = float(np.sqrt(np.mean(y_mono[:boundary_samples] ** 2)))
        end_rms = float(np.sqrt(np.mean(y_mono[-boundary_samples:] ** 2)))
        loop_discontinuity = abs(start_rms - end_rms) / max(rms, 1e-10)
    else:
        loop_discontinuity = None

    return {
        "duration": round(duration, 3),
        "sample_rate": sr,
        "channels": channels,
        "rms": round(rms, 6),
        "peak_level": round(peak, 6),
        "spectral_centroid_hz": round(centroid, 2),
        "spectral_bandwidth_hz": round(bandwidth, 2),
        "zero_crossing_rate": round(zcr, 6),
        "silence_ratio": round(silence_ratio, 4),
        "event_density_per_sec": round(event_density, 3),
        "loop_boundary_discontinuity": round(loop_discontinuity, 6) if loop_discontinuity is not None else None,
    }


def main():
    parser = argparse.ArgumentParser(description="Analyze Algophony audio files.")
    parser.add_argument("--metadata", required=True,
                        help="Path to generation metadata JSONL.")
    parser.add_argument("--out", required=True,
                        help="Output path for analysis JSONL.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Maximum number of files to analyze.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    metadata_path = Path(args.metadata)
    if not metadata_path.is_absolute():
        metadata_path = project_root / metadata_path

    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = project_root / out_path

    if not metadata_path.exists():
        print(f"Error: Metadata file not found: {metadata_path}")
        sys.exit(1)

    records = []
    with open(metadata_path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))

    if not records:
        print("No generation records found. Nothing to analyze.")
        sys.exit(0)

    if args.limit:
        records = records[:args.limit]

    print(f"Analyzing {len(records)} audio file(s)...\n")

    results = []
    for record in records:
        audio_id = record.get("audio_id", "unknown")
        storage_uri = record.get("storage_uri", "")
        audio_path = project_root / storage_uri

        features = analyze_file(audio_path)
        if features:
            features["audio_id"] = audio_id
            features["prompt_id"] = record.get("prompt_id", "")
            results.append(features)
            print(f"  ✓ {audio_id}")
        else:
            print(f"  ✗ {audio_id}: file not found at {audio_path}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        for result in results:
            f.write(json.dumps(result) + "\n")

    print(f"\nAnalyzed {len(results)} file(s). Output: {out_path}")


if __name__ == "__main__":
    main()
