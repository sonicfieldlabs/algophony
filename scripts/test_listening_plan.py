#!/usr/bin/env python3
"""Tests for the deterministic AKOÚŌ v0.9 routing-plan layer.

Covers evidence derivation from artifact availability, claim permissions with
command overrides, claim-permission enforcement, schema conformance of built
plans, and the drift check against the published AKOÚŌ manifest (skipped when
the adjacent akouo checkout is unavailable).
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from workers.listening_plan import (  # noqa: E402
    AKOUO_CONTRACT_VERSION,
    build_routing_plan,
    claim_permissions_for,
    derive_evidence_level,
    drift_errors,
    enforce_claim_permissions,
    load_akouo_manifest,
)
from scripts.generate_reports import build_claims  # noqa: E402

PROMPT = {"prompt_id": "ALG-0001", "category": "forest", "prompt_text": "a forest at dawn"}
GENERATION = {"audio_id": "ALG-0001-SYNTH-A", "prompt_id": "ALG-0001", "model": "synth_baseline"}
ANALYSIS = {"audio_id": "ALG-0001-SYNTH-A", "duration_seconds": 30.0, "features": {"rms": -21.0}}


class EvidenceDerivationTests(unittest.TestCase):
    def test_levels_from_artifacts(self):
        self.assertEqual(derive_evidence_level(None, None, None), "none")
        self.assertEqual(derive_evidence_level(PROMPT, None, None), "prompt_only")
        self.assertEqual(derive_evidence_level(PROMPT, GENERATION, None, audio_available=False), "metadata_only")
        self.assertEqual(derive_evidence_level(PROMPT, GENERATION, None, audio_available=True), "decoded_audio_metadata")
        self.assertEqual(derive_evidence_level(None, None, ANALYSIS), "measured_signal")
        self.assertEqual(derive_evidence_level(PROMPT, GENERATION, ANALYSIS), "mixed")

    def test_permissions_follow_ladder(self):
        prompt_only = claim_permissions_for("prompt_only")
        self.assertFalse(prompt_only["heard_allowed"])
        self.assertFalse(prompt_only["measured_allowed"])
        self.assertTrue(prompt_only["must_include_undetermined"])
        self.assertFalse(claim_permissions_for("transcript_or_caption")["heard_allowed"])
        self.assertFalse(claim_permissions_for("contextual_note")["heard_allowed"])
        self.assertFalse(claim_permissions_for("decoded_audio_metadata")["heard_allowed"])
        self.assertFalse(claim_permissions_for("measured_signal")["heard_allowed"])
        self.assertFalse(claim_permissions_for("mixed")["heard_allowed"])
        none_level = claim_permissions_for("none")
        self.assertFalse(any(none_level[k] for k in ("heard_allowed", "measured_allowed", "inferred_allowed", "interpreted_allowed")))

    def test_command_overrides(self):
        forensic = claim_permissions_for("mixed", "/forensic")
        self.assertFalse(forensic["interpreted_allowed"])
        self.assertFalse(forensic["speculative_allowed"])
        fiction = claim_permissions_for("mixed", "/fiction")
        self.assertTrue(fiction["speculative_allowed"])

    def test_automated_report_never_populates_heard(self):
        analysis = {
            "duration": 30.0,
            "sample_rate": 48000,
            "rms": 0.1,
            "peak_level": 0.5,
            "spectral_centroid_hz": 1200.0,
            "spectral_bandwidth_hz": 800.0,
            "event_density_per_sec": 1.5,
        }
        claims = build_claims(PROMPT, GENERATION, analysis, "agent_draft")
        self.assertEqual(claims["heard"], [])
        self.assertTrue(claims["inferred"])


class RoutingPlanTests(unittest.TestCase):
    def test_plan_shape_validates_against_schema(self):
        try:
            import jsonschema
            from referencing import Registry, Resource
            from referencing.jsonschema import DRAFT202012
        except ModuleNotFoundError:
            self.skipTest("jsonschema/referencing not installed")
        plan = build_routing_plan(PROMPT, GENERATION, ANALYSIS, budget="standard")
        schema = json.loads((REPO_ROOT / "schemas" / "listening-report.schema.json").read_text())
        plan_schema = {"$defs": schema["$defs"], **schema["$defs"]["akouo_routing_plan"]}
        resource = Resource.from_contents({**plan_schema, "$schema": "https://json-schema.org/draft/2020-12/schema"}, default_specification=DRAFT202012)
        jsonschema.Draft202012Validator(plan_schema, registry=Registry().with_resource("local", resource)).validate(plan)

    def test_plan_is_deterministic_and_stopped_without_audio(self):
        plan = build_routing_plan(PROMPT, None, None)
        self.assertEqual(plan["evidence_level"], "prompt_only")
        self.assertFalse(plan["claim_permissions"]["measured_allowed"])
        self.assertTrue(any("Stop before any heard or measured claim" in s for s in plan["stop_conditions"]))
        again = build_routing_plan(PROMPT, None, None)
        self.assertEqual(plan, again)

    def test_mixed_plan_carries_transductive_corrective(self):
        plan = build_routing_plan(PROMPT, GENERATION, ANALYSIS)
        roles = {step["role"]: step["mode"] for step in plan["mode_chain"]}
        self.assertEqual(roles["primary"], "acoulogical-object-listening")
        self.assertEqual(roles["corrective"], "transductive-media-listening")
        self.assertEqual(plan["route_confidence"], "high")

    def test_category_shapes_optional_modes(self):
        fiction_plan = build_routing_plan({**PROMPT, "category": "impossible_ecology"}, GENERATION, ANALYSIS)
        modes = [step["mode"] for step in fiction_plan["mode_chain"]]
        self.assertIn("symbolic-fictional-listening", modes)
        club_plan = build_routing_plan({**PROMPT, "category": "club_exterior"}, GENERATION, ANALYSIS)
        modes = [step["mode"] for step in club_plan["mode_chain"]]
        self.assertIn("musical-aesthetic-listening", modes)

    def test_enforcement_moves_blocked_claims(self):
        claims = {
            "heard": [],
            "measured": [{"statement": "Peak is -1 dBFS.", "confidence": "high", "basis": "meter"}],
            "inferred": [],
            "interpreted": [],
            "speculative": [],
            "undetermined": [],
        }
        permissions = claim_permissions_for("prompt_only")
        enforced = enforce_claim_permissions(claims, permissions)
        self.assertEqual(enforced["measured"], [])
        self.assertEqual(len(enforced["undetermined"]), 1)
        self.assertTrue(enforced["undetermined"][0]["statement"].startswith("Blocked measured claim:"))


class ManifestDriftTests(unittest.TestCase):
    def test_no_drift_against_published_manifest(self):
        errors = drift_errors()
        if errors is None:
            self.skipTest("akouo.manifest.json not available (no adjacent akouo checkout)")
        self.assertEqual(errors, [])

    def test_contract_pin_matches_manifest(self):
        manifest = load_akouo_manifest()
        if manifest is None:
            self.skipTest("akouo.manifest.json not available (no adjacent akouo checkout)")
        self.assertEqual(AKOUO_CONTRACT_VERSION, f"akouo/v{manifest['akouo_version']}")


if __name__ == "__main__":
    unittest.main()
