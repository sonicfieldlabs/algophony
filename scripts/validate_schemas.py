#!/usr/bin/env python3
"""
Validate all JSON Schema files in schemas/ directory.

Confirms every *.schema.json is valid JSON Schema (draft 2020-12).
Exit code 0 if all valid, 1 if any invalid.

Usage:
    python scripts/validate_schemas.py
"""

import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("Error: jsonschema package required. Install with: pip install jsonschema")
    sys.exit(1)


def validate_schemas(schema_dir: Path) -> list[dict]:
    """Validate all .schema.json files in the given directory."""
    errors = []
    schema_files = sorted(schema_dir.glob("*.schema.json"))

    if not schema_files:
        print(f"Warning: No schema files found in {schema_dir}")
        return errors

    for schema_path in schema_files:
        try:
            with open(schema_path) as f:
                schema = json.load(f)
        except json.JSONDecodeError as e:
            errors.append({
                "file": schema_path.name,
                "error": f"Invalid JSON: {e}",
            })
            continue

        try:
            Draft202012Validator.check_schema(schema)
            print(f"  ✓ {schema_path.name}")
        except Exception as e:
            errors.append({
                "file": schema_path.name,
                "error": str(e),
            })
            print(f"  ✗ {schema_path.name}: {e}")

    return errors


def main():
    project_root = Path(__file__).resolve().parent.parent
    schema_dir = project_root / "schemas"

    print(f"Validating schemas in {schema_dir}\n")

    errors = validate_schemas(schema_dir)

    print()
    if errors:
        print(f"FAILED: {len(errors)} schema(s) invalid.")
        for err in errors:
            print(f"  - {err['file']}: {err['error']}")
        sys.exit(1)
    else:
        print("PASSED: All schemas are valid JSON Schema (draft 2020-12).")
        sys.exit(0)


if __name__ == "__main__":
    main()
