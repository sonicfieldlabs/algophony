"""Akousmata source: batch access to the shared Sonic Field sonic-memory store.

The Listening Stack's shared store (the *akousmata*; see the earworm repo's
``akousma_spec_v1.md``) holds one memory record per sound across oída (listening),
germ (generation), and Algophony (evaluation). This module is Algophony's batch
surface over that store:

- ``load_akousmata(...)``            — query records for evaluation/organization runs
  (spec v1.1 stores add tag/text/since/until filters)
- ``akousma_to_prompt_record(...)``  — convert a record into an Algophony prompt/eval
  input, carrying summary, relations, consent, pipeline effects, spec v1.2
  ``location`` (where the sound was heard) and ``capture`` (past/future
  direction + window seconds), and a schema-conformant ``earworm_trace``
  bridge; reads both raw (v1.0) and enveloped (v1.1
  ``{contract, created_at, summary, payload}``) listening entries
- ``write_eval(...)``                — stamp results back as ``extensions["algophony.eval"]``
- ``ancestry(...)``                  — what's behind a sound (causal lineage ids)
- ``related(...)`` / ``add_relation(...)`` — typed kinship links (variants,
  recurrences, series, ``compares_with`` across an evaluation batch)
- ``find_by_hash(...)``              — recurrence/dedupe lookup by audio content hash
- ``verify_store(...)``              — integrity report; absence is information

The ``akousma`` reference package lives in the earworm repo
(``earworm/packages/py-akousma``); install with::

    pip install -e <sonic-field>/earworm/packages/py-akousma

The dependency is optional: without it, calls raise ``AkousmataUnavailable`` and the
rest of Algophony is unaffected. The store location defaults to
``~/workspace/akousmata`` and honors ``$AKOUSMATA_PATH``.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any


class AkousmataUnavailable(RuntimeError):
    """The optional ``akousma`` reference package is not installed."""


def _akousma():
    try:
        import akousma
    except ModuleNotFoundError as exc:  # pragma: no cover - environment-dependent
        raise AkousmataUnavailable(
            "the 'akousma' package is not installed; "
            "pip install -e <sonic-field>/earworm/packages/py-akousma"
        ) from exc
    return akousma


def open_store(root: str | None = None):
    """Open the shared akousmata store (defaults to $AKOUSMATA_PATH)."""
    return _akousma().AkousmataStore(root) if root else _akousma().AkousmataStore()


def load_akousmata(
    *,
    originating_app: str | None = None,
    source_type: str | None = None,
    origin: str | None = None,
    tag: str | None = None,
    text: str | None = None,
    since: str | None = None,
    until: str | None = None,
    limit: int = 500,
    store=None,
) -> list[dict[str, Any]]:
    """Query records from the shared store for a batch run. The tag/text/
    since/until filters require py-akousma >= 0.2 and are ignored (with the
    base filters still applied) on older stores."""
    owns = store is None
    store = store or open_store()
    try:
        try:
            return store.query(
                originating_app=originating_app,
                source_type=source_type,
                origin=origin,
                tag=tag,
                text=text,
                since=since,
                until=until,
                limit=limit,
            )
        except TypeError:
            # pre-v0.2 store: fall back to the base filters
            return store.query(
                originating_app=originating_app,
                source_type=source_type,
                origin=origin,
                limit=limit,
            )
    finally:
        if owns:
            store.close()


def _entry_payload(block: dict[str, Any]) -> dict[str, Any]:
    """Unwrap the akousma spec v1.1 listening envelope
    (``{contract?, created_at, summary?, payload}``); raw pre-v1.1 entries
    pass through unchanged."""
    payload = block.get("payload")
    if isinstance(payload, dict) and ("created_at" in block or "contract" in block):
        return payload
    return block


def _listening_text(record: dict[str, Any]) -> str:
    summary = record.get("summary")
    if isinstance(summary, str) and summary.strip():
        return summary.strip()
    listening = record.get("listening") or {}
    for namespace in ("akouo.describe", "oida.moss", "oida.signal"):
        block = listening.get(namespace)
        if isinstance(block, dict):
            envelope_summary = block.get("summary")
            if isinstance(envelope_summary, str) and envelope_summary.strip() and "payload" in block:
                return envelope_summary.strip()
            payload = _entry_payload(block)
            for key in ("summary", "caption", "description", "text"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
    prompt = (record.get("lineage") or {}).get("prompt")
    if isinstance(prompt, str) and prompt.strip():
        return prompt.strip()
    return ", ".join(str(t) for t in record.get("tags") or [])


def build_earworm_trace(record: dict[str, Any]) -> dict[str, Any]:
    """A compact, schema-conformant ``earworm_trace`` bridge for one akousma."""
    provenance = record.get("provenance") or {}
    audio = record.get("audio") or {}
    lineage = record.get("lineage") or {}
    consent = provenance.get("consent_status") or "unknown"
    return {
        "trace_status": "active",
        "session_id": record.get("session_id"),
        "app_id": f"{provenance.get('originating_app', 'unknown')}.akousmata",
        "akousmata_operations": ["remember"],
        "event_chain": list(lineage.get("event_ids") or []),
        "asset_refs": [audio.get("asset_id")] if audio.get("asset_id") else [],
        "provenance_refs": (
            [provenance.get("provenance_id")] if provenance.get("provenance_id") else []
        ),
        "signal_packets": [],
        "context_bundle_refs": [],
        "retention_policy": {
            "retention_class": "project",
            "consent_status": consent if consent != "not_applicable" else "unknown",
            "local_only": True,
            "deletion_supported": True,
        },
        "notes": f"bridged from akousma {record.get('akousma_id', '?')}",
    }


def akousma_to_prompt_record(record: dict[str, Any]) -> dict[str, Any]:
    """Convert one akousma into an Algophony prompt/eval input record.

    Raises ``KeyError`` on a record without ``akousma_id`` — such a record is
    not an akousma at all, and skipping it silently would hide store damage.
    """
    if "akousma_id" not in record:
        raise KeyError("record has no akousma_id — not an akousma record")
    audio = record.get("audio") or {}
    provenance = record.get("provenance") or {}
    lineage = record.get("lineage") or {}
    location = record.get("location") if isinstance(record.get("location"), dict) else None
    capture = record.get("capture") if isinstance(record.get("capture"), dict) else None
    out = {
        "prompt_id": record["akousma_id"],
        "prompt_text": _listening_text(record),
        "summary": record.get("summary"),
        "category": (record.get("tags") or ["uncategorized"])[0],
        "duration_target": audio.get("duration_seconds"),
        "audio_uri": audio.get("uri"),
        "content_hash": audio.get("content_hash"),
        "originating_app": provenance.get("originating_app"),
        "origin": provenance.get("origin"),
        "consent_status": provenance.get("consent_status"),
        "pipeline_effects": list(provenance.get("pipeline_effects") or []),
        "parent_akousma_ids": list(lineage.get("parent_akousma_ids") or []),
        "relations": [dict(rel) for rel in lineage.get("relations") or []],
        "generation_model": lineage.get("model"),
        "earworm_trace": build_earworm_trace(record),
    }
    # Spec v1.2 optional blocks, carried when present. location is
    # consent-scoped — it feeds local organization/evaluation only and is
    # stripped by the navigator's open-research exports, never shipped.
    if location is not None:
        out["location"] = dict(location)
    if capture is not None:
        out["capture"] = dict(capture)
        if capture.get("direction"):
            out["capture_direction"] = capture.get("direction")
    # Spec v1.3: under which ethics the record was listened. Identity and
    # attributed absence only — evaluation must never reconstruct or score
    # what a covenant withheld.
    covenant = record.get("covenant") if isinstance(record.get("covenant"), dict) else None
    if covenant is not None:
        out["covenant"] = dict(covenant)
        if covenant.get("id"):
            out["covenant_id"] = covenant.get("id")
    return out


def ancestry(akousma_id: str, *, store=None) -> list[str]:
    """Everything behind a sound: ancestor akousma ids, nearest first."""
    owns = store is None
    store = store or open_store()
    try:
        return store.ancestors(akousma_id)
    finally:
        if owns:
            store.close()


def write_eval(akousma_id: str, payload: dict[str, Any], *, store=None) -> dict[str, Any]:
    """Stamp evaluation results onto the shared record as ``extensions["algophony.eval"]``."""
    owns = store is None
    store = store or open_store()
    try:
        record = store.get(akousma_id)
        if record is None:
            raise KeyError(f"akousma not found: {akousma_id}")
        record.setdefault("extensions", {})["algophony.eval"] = {
            **payload,
            "evaluated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        store.put(record)
        return record
    finally:
        if owns:
            store.close()


def related(akousma_id: str, rel_type: str | None = None, *, store=None) -> list[dict[str, str]]:
    """Typed kinship links (spec v1.1 relations) around a record, both
    directions. Empty on pre-v0.2 stores."""
    owns = store is None
    store = store or open_store()
    try:
        if not hasattr(store, "related"):
            return []
        return store.related(akousma_id, rel_type)
    finally:
        if owns:
            store.close()


def add_relation(akousma_id: str, rel_type: str, target_akousma_id: str, note: str | None = None, *, store=None) -> dict[str, Any]:
    """Add a typed kinship link to a record (e.g. ``compares_with`` between the
    members of an evaluation batch). Requires py-akousma >= 0.2."""
    lib = _akousma()
    if not hasattr(lib, "relation"):
        raise AkousmataUnavailable("py-akousma >= 0.2 is required for typed relations")
    owns = store is None
    store = store or open_store()
    try:
        record = store.get(akousma_id)
        if record is None:
            raise KeyError(f"akousma not found: {akousma_id}")
        relations = record.setdefault("lineage", {}).setdefault("relations", [])
        if not any(rel.get("target_akousma_id") == target_akousma_id and rel.get("type") == rel_type for rel in relations):
            relations.append(lib.relation(rel_type, target_akousma_id, note))
            store.put(record)
        return record
    finally:
        if owns:
            store.close()


def find_by_hash(content_hash: str, *, store=None) -> list[dict[str, Any]]:
    """All records carrying this audio content hash (dedupe / recurrence
    lookup before evaluating the 'same' sound twice)."""
    owns = store is None
    store = store or open_store()
    try:
        if hasattr(store, "find_by_hash"):
            return store.find_by_hash(content_hash)
        return [r for r in store.query(limit=1000) if (r.get("audio") or {}).get("content_hash") == content_hash]
    finally:
        if owns:
            store.close()


def verify_store(*, store=None) -> dict[str, list[str]]:
    """Integrity report over the shared store (dangling parents/relations,
    missing audio, invalid records). Absence is information: run before batch
    evaluation so dead records are named, not silently skipped."""
    owns = store is None
    store = store or open_store()
    try:
        if not hasattr(store, "verify"):
            return {"unsupported": ["py-akousma >= 0.2 is required for verify()"]}
        return store.verify()
    finally:
        if owns:
            store.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Batch access to the shared akousmata store.")
    parser.add_argument("--app", help="filter by originating app (oida|germ|algophony)")
    parser.add_argument("--origin", help="filter by capture origin")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--show", metavar="AKOUSMA_ID", help="print one full record")
    parser.add_argument(
        "--prompt-records", action="store_true",
        help="emit Algophony prompt records instead of raw akousmata",
    )
    parser.add_argument("--related", metavar="AKOUSMA_ID", help="print typed kinship links around one record")
    parser.add_argument("--verify", action="store_true", help="print a store integrity report")
    args = parser.parse_args(argv)

    try:
        if args.verify:
            print(json.dumps(verify_store(), indent=2, ensure_ascii=False))
            return 0

        if args.related:
            print(json.dumps(related(args.related), indent=2, ensure_ascii=False))
            return 0

        if args.show:
            with open_store() as store:
                record = store.get(args.show)
            if record is None:
                print(f"not found: {args.show}", file=sys.stderr)
                return 1
            print(json.dumps(record, indent=2, ensure_ascii=False))
            return 0

        records = load_akousmata(originating_app=args.app, origin=args.origin, limit=args.limit)
        if args.prompt_records:
            records = [akousma_to_prompt_record(r) for r in records]
        print(json.dumps(records, indent=2, ensure_ascii=False))
        return 0
    except AkousmataUnavailable as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
