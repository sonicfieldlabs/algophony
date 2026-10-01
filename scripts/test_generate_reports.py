"""Report publication fixtures never generate audio or call a provider."""
import json
from pathlib import Path
from unittest.mock import patch

import pytest

from scripts import generate_reports as reports


@pytest.fixture
def inputs(tmp_path):
    prompts = [{"prompt_id": value, "category": "interior", "prompt_text": "Synthetic room fixture"} for value in ["ALG-0001", "ALG-0002"]]
    generations = [{"audio_id": f"ALG-{index:04d}-SYNTH-A", "prompt_id": value, "model": "Synthetic Baseline"} for index, value in enumerate(["ALG-0001", "ALG-0002"], 1)]
    analyses = [{"audio_id": value, "duration": 1, "sample_rate": 24000, "rms": 0.1, "peak_level": 0.2, "spectral_centroid_hz": 1000, "spectral_bandwidth_hz": 500, "event_density_per_sec": 1} for value in ["ALG-0001-SYNTH-A", "ALG-0002-SYNTH-A"]]
    paths = []
    for name, data in [("prompts", prompts), ("generations", generations), ("analysis", analyses)]:
        path = tmp_path / f"{name}.jsonl"
        path.write_text("".join(json.dumps(row) + "\n" for row in data))
        paths.append(path)
    return tmp_path, paths


def stub_report(prompt, generation, analysis, report_id):
    return {"report_id": report_id, "prompt_id": prompt["prompt_id"], "audio_id": generation["audio_id"],
            "score_sets": {}, "score_provenance": [], "scores": {}, "listening_date": "2026-01-01"}


def generate(root, paths, **kwargs):
    with patch.object(reports, "build_report", side_effect=stub_report), patch.object(reports, "build_markdown", return_value="fixture"):
        return reports.generate_run(root, *paths, **kwargs)


def test_filtered_limit_run_preserves_prior_reports_and_ledger(inputs):
    root, paths = inputs
    old_report = root / "reports/json/AK-0001.json"
    old_report.parent.mkdir(parents=True)
    old_report.write_bytes(b"previous report")
    ledger = root / "benchmark/scores/scores-v0.1.jsonl"
    ledger.parent.mkdir(parents=True)
    ledger.write_bytes(b"previous ledger\n")
    run = generate(root, paths, prompt_ids={"ALG-0002"}, limit=1)
    score = json.loads((run / "scores.jsonl").read_text())
    assert score["audio_id"] == "ALG-0002-SYNTH-A"
    assert old_report.read_bytes() == b"previous report"
    assert ledger.read_bytes() == b"previous ledger\n"


@pytest.mark.parametrize("kwargs", [{"limit": 0}, {"prompt_ids": set()}, {"prompt_ids": {"missing"}}])
def test_empty_selection_has_no_output_side_effect(inputs, kwargs):
    root, paths = inputs
    before = sorted(path.relative_to(root) for path in root.rglob("*"))
    assert generate(root, paths, **kwargs) is None
    assert sorted(path.relative_to(root) for path in root.rglob("*")) == before


def test_identity_does_not_depend_on_filter_or_order(inputs):
    root, paths = inputs
    full = generate(root, paths)
    subset = generate(root, paths, prompt_ids={"ALG-0002"})
    full_scores = [json.loads(line) for line in (full / "scores.jsonl").read_text().splitlines()]
    subset_score = json.loads((subset / "scores.jsonl").read_text())
    assert subset_score["report_id"] == full_scores[1]["report_id"]


def test_existing_output_rejected_without_deleting_anything(inputs):
    root, paths = inputs
    run = generate(root, paths, output_dir=root / "chosen")
    original = {path.relative_to(run): path.read_bytes() for path in run.rglob("*") if path.is_file()}
    with pytest.raises(FileExistsError):
        generate(root, paths, output_dir=run)
    assert {path.relative_to(run): path.read_bytes() for path in run.rglob("*") if path.is_file()} == original


@pytest.mark.parametrize("failure", [RuntimeError("write failure"), KeyboardInterrupt()])
def test_failed_generation_never_publishes_partial_run(inputs, failure):
    root, paths = inputs
    output = root / "new-run"
    with patch.object(reports, "build_report", side_effect=failure), pytest.raises(type(failure)):
        reports.generate_run(root, *paths, output_dir=output)
    assert not output.exists()
    assert not list(root.glob(".report-stage-*"))


def test_negative_limit_fails_before_any_file_io(inputs):
    root, paths = inputs
    with pytest.raises(ValueError):
        generate(root, paths, limit=-1)


def test_real_report_uses_stable_identity_and_retains_claim_boundaries(inputs):
    root, paths = inputs
    run = reports.generate_run(root, *paths, limit=1)
    value = json.loads(next((run / "json").glob("*.json")).read_text())
    assert value["report_id"].startswith("AK-")
    assert value["review_status"] == "agent_draft"

    from jsonschema import Draft202012Validator
    from referencing import Registry, Resource
    directory = Path(reports.__file__).parents[1] / "schemas"
    documents = [json.loads(path.read_text()) for path in directory.glob("*.schema.json")]
    registry = Registry().with_resources((document["$id"], Resource.from_contents(document)) for document in documents)
    schema = json.loads((directory / "listening-report.schema.json").read_text())
    Draft202012Validator(schema, registry=registry).validate(value)


def test_generation_assigned_identity_and_duplicate_guard(inputs):
    root, paths = inputs
    generations = [json.loads(line) for line in paths[1].read_text().splitlines()]
    generations[1]["akouo_report_id"] = "AK-0123"
    paths[1].write_text("".join(json.dumps(row) + "\n" for row in generations))
    run = generate(root, paths, prompt_ids={"ALG-0002"})
    assert json.loads((run / "scores.jsonl").read_text())["report_id"] == "AK-0123"
    generations[0]["akouo_report_id"] = "AK-0123"
    paths[1].write_text("".join(json.dumps(row) + "\n" for row in generations))
    with pytest.raises(ValueError, match="duplicate"):
        generate(root, paths, output_dir=root / "rejected")
    assert not (root / "rejected").exists()
