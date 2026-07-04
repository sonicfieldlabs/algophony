"""Akousmata source: batch access to the shared Sonic Field sonic-memory store.

The Listening Stack's shared store (the *akousmata*; see the earworm repo's
``akousma_spec_v1.md``) holds one memory record per sound across oída (listening),
germ (generation), and Algophony (evaluation). This module is Algophony's batch
surface over that store:

- ``load_akousmata(...)``            — query records for evaluation/organization runs
- ``akousma_to_prompt_record(...)``  — convert a record into an Algophony prompt/eval
  input, carrying a schema-conformant ``earworm_trace`` bridge
- ``write_eval(...)``                — stamp results back as ``extensions["algophony.eval"]``
- ``ancestry(...)``                  — what's behind a sound (lineage ids)

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
    limit: int = 500,
    store=None,
) -> list[dict[str, Any]]:
    """Query records from the shared store for a batch run."""
    owns = store is None
    store = store or open_store()
    try:
        return store.query(
            originating_app=originating_app,
            source_type=source_type,
            origin=origin,
            limit=limit,
        )
    finally:
        if owns:
            store.close()


def _listening_text(record: dict[str, Any]) -> str:
    listening = record.get("listening") or {}
    for namespace in ("akouo.describe", "oida.moss", "oida.signal"):
        block = listening.get(namespace)
        if isinstance(block, dict):
            for key in ("summary", "caption", "description", "text"):
                value = block.get(key)
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
    """Convert one akousma into an Algophony prompt/eval input record."""
    audio = record.get("audio") or {}
    provenance = record.get("provenance") or {}
    lineage = record.get("lineage") or {}
    return {
        "prompt_id": record["akousma_id"],
        "prompt_text": _listening_text(record),
        "category": (record.get("tags") or ["uncategorized"])[0],
        "duration_target": audio.get("duration_seconds"),
        "audio_uri": audio.get("uri"),
        "content_hash": audio.get("content_hash"),
        "originating_app": provenance.get("originating_app"),
        "origin": provenance.get("origin"),
        "parent_akousma_ids": list(lineage.get("parent_akousma_ids") or []),
        "generation_model": lineage.get("model"),
        "earworm_trace": build_earworm_trace(record),
    }


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
    args = parser.parse_args(argv)

    try:
        if args.show:
            with open_store() as store:
                record = store.get(args.show)
            if record is None:
                print(f"not found: {args.show}")
                return 1
            print(json.dumps(record, indent=2, ensure_ascii=False))
            return 0

        records = load_akousmata(originating_app=args.app, origin=args.origin, limit=args.limit)
        if args.prompt_records:
            records = [akousma_to_prompt_record(r) for r in records]
        print(json.dumps(records, indent=2, ensure_ascii=False))
        return 0
    except AkousmataUnavailable as exc:
        print(f"error: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
