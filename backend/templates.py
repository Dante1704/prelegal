"""Load legal-document templates from `data/templates/`.

Templates are static JSON files; we read them on demand (small, fast).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent.parent / "data" / "templates"


@lru_cache(maxsize=1)
def load_index() -> dict:
    """Return the raw `index.json` catalogue."""
    return json.loads((TEMPLATES_DIR / "index.json").read_text())


def list_summaries() -> list[dict]:
    """Return one entry per template: id, name, category, description."""
    return [
        {"id": t["id"], "name": t["name"], "category": t["category"], "description": t["description"]}
        for t in load_index()["templates"]
    ]


def load_template(template_id: str) -> dict:
    """Return the full template (id, name, fields, content). Raises KeyError if unknown."""
    entry = next((t for t in load_index()["templates"] if t["id"] == template_id), None)
    if entry is None:
        raise KeyError(template_id)
    return json.loads((TEMPLATES_DIR / entry["file"]).read_text())
