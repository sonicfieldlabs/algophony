#!/usr/bin/env python3
"""Contract tests for Algophony's Oída v0.2 gateway adapter."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from workers.oida_gateway import algophony_patch  # noqa: E402


def fixture() -> dict:
    event_id = "evt_algophony"
    session_id = "earworm_session_algophony"
    provenance_id = "prov_algophony"
    return {
        "contract": "oida/gateway/v0.2",
        "perception_path": "oida_owned",
        "listening_event": {
            "id": event_id,
            "created_at": "2026-07-10T12:00:00Z",
            "aggregate": {"title": "Generated harbor", "short_summary": "A synthetic harbor texture."},
            "routes": [{"route_id": "basic-listener", "structured": {"route_preset": "deep"}}],
            "raw_audio_policy": "external_ref",
        },
        "perception_report": {"apparatus": {"substrate": "hybrid_agent_stack", "known_blind_spots": []}},
        "command_output": {
            "akouo_version": "0.6",
            "claim_summary": {
                "heard": [{"statement": "A low hum is audible.", "confidence": "medium", "basis": "model", "source": "model"}],
                "measured": [],
                "inferred": [],
                "interpreted": [],
                "speculative": [],
                "undetermined": [],
            },
            "routing_plan": None,
            "outputs": [{"apparatus": {"substrate": "hybrid_agent_stack", "known_blind_spots": []}}],
        },
        "earworm": {
            "protocol": "earworm",
            "version": "0.2.2",
            "persistence": "session_only",
            "session": {
                "session_id": session_id,
                "policy": {"mode": "ephemeral", "local_only": True, "redaction": {"sensitive_fields": [], "agent_safe_omissions": []}},
                "assets": [{"asset_id": "asset_algophony", "type": "audio", "uri": "/private/generated.wav", "duration_seconds": 3.0, "sample_rate": 48000, "channels": 2, "provenance_id": provenance_id}],
                "provenance": [{"provenance_id": provenance_id, "source_type": "generated", "provider": "oida", "consent_status": "owned", "usage_constraints": ["local_only"]}],
                "events": [
                    {
                        "event_id": "packet_algophony",
                        "type": "signal.packet.ingested",
                        "time": {"wall_clock": "2026-07-10T12:00:00Z"},
                        "source": {"actor": "system"},
                        "payload": {
                            "packet_id": "packet_algophony",
                            "signal_type": "audio",
                            "asset_ref": "asset_algophony",
                            "time_range": {"start": 0, "end": 3, "unit": "seconds"},
                            "context_refs": [event_id],
                            "provenance_id": provenance_id,
                            "tags": ["algophony"],
                        },
                        "parent_event_ids": [],
                        "provenance_id": provenance_id,
                        "event_hash": "abc",
                    }
                ],
            },
        },
        "trace": None,
    }


class OidaGatewayTests(unittest.TestCase):
    def test_patch_is_schema_valid_and_omits_private_paths(self):
        try:
            import jsonschema
            from referencing import Registry, Resource
            from referencing.jsonschema import DRAFT202012
        except ModuleNotFoundError:
            self.skipTest("jsonschema/referencing not installed")
        patch = algophony_patch(fixture())
        resources = []
        schemas = {}
        for path in (REPO_ROOT / "schemas").glob("*.schema.json"):
            schema = json.loads(path.read_text(encoding="utf-8"))
            schemas[path.name] = schema
            resource = Resource.from_contents(schema, default_specification=DRAFT202012)
            resources.append((path.name, resource))
            if schema.get("$id"):
                resources.append((schema["$id"], resource))
        registry = Registry().with_resources(resources)
        jsonschema.Draft202012Validator(schemas["oida-gateway.schema.json"], registry=registry).validate(patch["oida_gateway"])
        jsonschema.Draft202012Validator(schemas["earworm-trace.schema.json"], registry=registry).validate(patch["earworm_trace"])
        self.assertNotIn("/private/generated.wav", json.dumps(patch))
        self.assertEqual(patch["oida_gateway"]["memory_persistence"], "session_only")
        self.assertEqual(patch["earworm_trace"]["retention_policy"]["retention_class"], "session")

    def test_remembered_result_carries_trace_id(self):
        result = fixture()
        result["trace"] = {"id": "trace_algophony"}
        patch = algophony_patch(result)
        self.assertEqual(patch["oida_gateway"]["akousmata_trace_id"], "trace_algophony")
        self.assertEqual(patch["oida_gateway"]["memory_persistence"], "remembered")
        self.assertEqual(patch["earworm_trace"]["retention_policy"]["retention_class"], "project")

    def test_wrong_contract_is_rejected(self):
        result = fixture()
        result["contract"] = "oida/gateway/v0.1"
        with self.assertRaises(ValueError):
            algophony_patch(result)


if __name__ == "__main__":
    unittest.main()
