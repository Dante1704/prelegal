"""Load legal-document templates from `data/templates/`.

Templates are static JSON files; we read them on demand (small, fast).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

def _resolve_templates_dir() -> Path:
    """Find the templates dir in both dev (`<repo>/data/templates`) and
    docker (`/app/data/templates`, next to the module) layouts."""
    here = Path(__file__).parent
    for candidate in (here / "data" / "templates", here.parent / "data" / "templates"):
        if candidate.is_dir():
            return candidate
    raise RuntimeError("Could not locate data/templates directory")


TEMPLATES_DIR = _resolve_templates_dir()


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
