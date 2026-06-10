#!/usr/bin/env python3
"""
Extract technical audio features from generated soundscapes.

Analyzes: duration, sample rate, channels, RMS, peak, spectral centroid,
spectral bandwidth, zero crossing rate, silence ratio, event density,
loop boundary discontinuity.

Usage:
    python scripts/analyze_audio.py
    python scripts/analyze_audio.py --limit 10
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


def analyze_file(audio_path: Path) -> dict | None:
    """Analyze a single audio file and return feature dict."""
    if not audio_path.exists():
        return None

    try:
        info = sf.info(str(audio_path))
        y, sr = librosa.load(str(audio_path), sr=None, mono=True)
    except Exception as e:
        print(f"    ⚠ Read error: {e}")
        return None

    duration = librosa.get_duration(y=y, sr=sr)
    rms_val = float(np.sqrt(np.mean(y ** 2)))
    peak = float(np.max(np.abs(y)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

    # Spectral features
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))

    # Silence ratio (frames below -40dB)
    frame_rms = librosa.feature.rms(y=y)[0]
    silence_threshold = 10 ** (-40 / 20)
    silence_ratio = float(np.sum(frame_rms < silence_threshold) / max(len(frame_rms), 1))

    # Event density (onsets / duration)
    try:
        onsets = librosa.onset.onset_detect(y=y, sr=sr)
        event_density = len(onsets) / duration if duration > 0 else 0
    except Exception:
        onsets = []
        event_density = 0

    # Loop boundary discontinuity
    boundary_samples = int(0.05 * sr)
    if len(y) > boundary_samples * 2:
        start_rms = float(np.sqrt(np.mean(y[:boundary_samples] ** 2)))
        end_rms = float(np.sqrt(np.mean(y[-boundary_samples:] ** 2)))
        loop_disc = abs(start_rms - end_rms) / max(rms_val, 1e-10)
    else:
        loop_disc = None

    # Spectral flatness (tonal vs noise)
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))

    return {
        "duration": round(duration, 3),
        "sample_rate": sr,
        "channels": info.channels,
        "rms": round(rms_val, 6),
        "peak_level": round(peak, 6),
        "spectral_centroid_hz": round(centroid, 2),
        "spectral_bandwidth_hz": round(bandwidth, 2),
        "spectral_flatness": round(flatness, 6),
        "zero_crossing_rate": round(zcr, 6),
        "silence_ratio": round(silence_ratio, 4),
        "onset_count": len(onsets),
        "event_density_per_sec": round(event_density, 3),
        "loop_boundary_discontinuity": round(loop_disc, 6) if loop_disc is not None else None,
    }


def main():
    parser = argparse.ArgumentParser(description="Analyze Algophony audio files.")
    parser.add_argument("--metadata", default="generations/metadata/generations-v0.1.jsonl")
    parser.add_argument("--out", default="generations/metadata/audio-analysis-v0.1.jsonl")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    metadata_path = project_root / args.metadata
    out_path = project_root / args.out

    if not metadata_path.exists():
        print(f"Error: {metadata_path} not found")
        sys.exit(1)

    records = []
    with open(metadata_path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))

    if args.limit:
        records = records[:args.limit]

    if not records:
        print("No records. Nothing to analyze.")
        sys.exit(0)

    print(f"Analyzing {len(records)} audio file(s)...\n")
    results = []
    for record in records:
        audio_id = record.get("audio_id", "unknown")
        storage_uri = record.get("storage_uri", "")
        audio_path = Path(storage_uri)
        if not audio_path.is_absolute():
            audio_path = project_root / storage_uri

        features = analyze_file(audio_path)
        if features:
            features["audio_id"] = audio_id
            features["prompt_id"] = record.get("prompt_id", "")
            features["model"] = record.get("model", "")
            results.append(features)
            print(f"  ✓ {audio_id}")
        else:
            print(f"  ✗ {audio_id}: not found at {audio_path}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        for r in results:
            f.write(json.dumps(r) + "\n")

    print(f"\nAnalyzed {len(results)}/{len(records)} files → {out_path}")


if __name__ == "__main__":
    main()
