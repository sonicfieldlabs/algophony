#!/usr/bin/env python3
"""Akousmata source adapter tests against an isolated temp store.

Skips cleanly when the optional ``akousma`` package is unavailable (public clones
without the earworm checkout); in the Sonic Field monorepo layout the sibling
``earworm/packages/py-akousma`` path is picked up automatically.
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

_SIBLING_PKG = REPO_ROOT.parent / "earworm" / "packages" / "py-akousma"
if _SIBLING_PKG.exists():
    sys.path.insert(0, str(_SIBLING_PKG))

try:
    import akousma
    HAVE_AKOUSMA = True
except ModuleNotFoundError:
    HAVE_AKOUSMA = False

from workers import akousmata_source


@unittest.skipUnless(HAVE_AKOUSMA, "akousma package not available")
class AkousmataSourceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = akousma.AkousmataStore(self.tmp.name)
        parent = akousma.new_akousma(
            audio={"asset_id": "cap_1", "uri": "akousmata://objects/x.wav", "duration_seconds": 8.0},
            originating_app="oida",
            source_type="recorded",
            origin="live-input",
            listening={"akouo.describe": {"summary": "gravel underfoot, distant traffic"}},
            tags=["field"],
        )
        self.store.put(parent)
        child = akousma.new_akousma(
            audio={"asset_id": "gen_1"},
            originating_app="germ",
            source_type="generated",
            origin="generated",
            parent_akousma_ids=[parent["akousma_id"]],
            operation="transform",
            prompt="make it metallic",
            model="stable-audio-3",
        )
        self.store.put(child)
        self.parent, self.child = parent, child

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_load_filters_by_app(self):
        oida = akousmata_source.load_akousmata(originating_app="oida", store=self.store)
        germ = akousmata_source.load_akousmata(originating_app="germ", store=self.store)
        self.assertEqual([r["akousma_id"] for r in oida], [self.parent["akousma_id"]])
        self.assertEqual([r["akousma_id"] for r in germ], [self.child["akousma_id"]])

    def test_prompt_record_shape_and_trace(self):
        rec = akousmata_source.akousma_to_prompt_record(self.parent)
        self.assertEqual(rec["prompt_id"], self.parent["akousma_id"])
        self.assertEqual(rec["prompt_text"], "gravel underfoot, distant traffic")
        self.assertEqual(rec["originating_app"], "oida")

        trace = rec["earworm_trace"]
        required = [
            "trace_status", "session_id", "akousmata_operations", "event_chain",
            "asset_refs", "provenance_refs", "signal_packets", "context_bundle_refs",
            "retention_policy",
        ]
        for key in required:
            self.assertIn(key, trace)
        self.assertEqual(trace["trace_status"], "active")
        self.assertEqual(trace["asset_refs"], ["cap_1"])
        policy = trace["retention_policy"]
        for key in ("retention_class", "consent_status", "local_only", "deletion_supported"):
            self.assertIn(key, policy)
        self.assertTrue(policy["local_only"])

    def test_prompt_record_falls_back_to_generation_prompt(self):
        rec = akousmata_source.akousma_to_prompt_record(self.child)
        self.assertEqual(rec["prompt_text"], "make it metallic")
        self.assertEqual(rec["parent_akousma_ids"], [self.parent["akousma_id"]])
        self.assertEqual(rec["generation_model"], "stable-audio-3")

    def test_ancestry(self):
        self.assertEqual(
            akousmata_source.ancestry(self.child["akousma_id"], store=self.store),
            [self.parent["akousma_id"]],
        )

    def test_write_eval_stamps_extension(self):
        updated = akousmata_source.write_eval(
            self.child["akousma_id"],
            {"suite": "disclosure_integrity", "score": 0.82},
            store=self.store,
        )
        stamped = updated["extensions"]["algophony.eval"]
        self.assertEqual(stamped["suite"], "disclosure_integrity")
        self.assertEqual(stamped["score"], 0.82)
        self.assertIn("evaluated_at", stamped)
        # persisted, not just in-memory
        self.assertIn("algophony.eval", self.store.get(self.child["akousma_id"])["extensions"])

    def test_write_eval_unknown_id(self):
        with self.assertRaises(KeyError):
            akousmata_source.write_eval("akm_missing", {"score": 0}, store=self.store)

    def test_reads_v11_enveloped_listening_and_summary(self):
        record = akousma.new_akousma(
            audio={"asset_id": "cap_2"},
            originating_app="oida",
            summary="harbor at dusk, machinery keynote",
            listening={
                "oida.signal": {
                    "contract": None,
                    "created_at": "2026-07-10T00:00:00Z",
                    "payload": {"caption": "low machinery tone with sparse calls"},
                }
            },
        )
        # top-level summary wins
        rec = akousmata_source.akousma_to_prompt_record(record)
        self.assertEqual(rec["prompt_text"], "harbor at dusk, machinery keynote")
        self.assertEqual(rec["summary"], "harbor at dusk, machinery keynote")
        # without the summary, the enveloped payload caption is unwrapped
        record.pop("summary")
        record["listening"]["oida.signal"].pop("contract")
        rec = akousmata_source.akousma_to_prompt_record(record)
        self.assertEqual(rec["prompt_text"], "low machinery tone with sparse calls")

    def test_relations_surface(self):
        sibling = akousma.new_akousma(
            audio={"asset_id": "cap_3", "content_hash": "sha256:samehash"},
            originating_app="oida",
            relations=[akousma.relation("series_with", self.parent["akousma_id"], "later take")],
        )
        self.store.put(sibling)
        rec = akousmata_source.akousma_to_prompt_record(sibling)
        self.assertEqual(rec["relations"], [
            {"type": "series_with", "target_akousma_id": self.parent["akousma_id"], "note": "later take"}
        ])
        incoming = akousmata_source.related(self.parent["akousma_id"], store=self.store)
        self.assertEqual(incoming, [
            {"type": "series_with", "akousma_id": sibling["akousma_id"], "direction": "incoming"}
        ])

    def test_add_relation_compares_with(self):
        akousmata_source.add_relation(
            self.child["akousma_id"], "compares_with", self.parent["akousma_id"],
            note="evaluation batch pairing", store=self.store,
        )
        stored = self.store.get(self.child["akousma_id"])
        relations = stored["lineage"]["relations"]
        self.assertEqual(relations[0]["type"], "compares_with")
        # idempotent: adding the same link twice keeps one edge
        akousmata_source.add_relation(
            self.child["akousma_id"], "compares_with", self.parent["akousma_id"], store=self.store,
        )
        self.assertEqual(len(self.store.get(self.child["akousma_id"])["lineage"]["relations"]), 1)

    def test_find_by_hash_and_verify(self):
        first = akousma.new_akousma(
            audio={"asset_id": "h1", "content_hash": "sha256:dupe"}, originating_app="oida",
        )
        second = akousma.new_akousma(
            audio={"asset_id": "h2", "content_hash": "sha256:dupe"}, originating_app="germ",
        )
        self.store.put(first)
        self.store.put(second)
        found = akousmata_source.find_by_hash("sha256:dupe", store=self.store)
        self.assertEqual({r["akousma_id"] for r in found}, {first["akousma_id"], second["akousma_id"]})
        report = akousmata_source.verify_store(store=self.store)
        self.assertIn("dangling_parents", report)

    def test_query_filters_v02(self):
        tagged = akousma.new_akousma(
            audio={"asset_id": "t1"}, originating_app="algophony", tags=["eval-batch"],
        )
        self.store.put(tagged)
        found = akousmata_source.load_akousmata(tag="eval-batch", store=self.store)
        self.assertEqual([r["akousma_id"] for r in found], [tagged["akousma_id"]])


if __name__ == "__main__":
    unittest.main()
