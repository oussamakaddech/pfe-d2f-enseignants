"""Génère le data dictionary (JSON + Markdown) depuis les contrats.

Usage: python scripts/build_data_dictionary.py [out_dir]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from app.ml.cleaning.contracts import DATASETS, data_dictionary


def build_markdown() -> str:
    lines = [
        "# Data Dictionary — D2F Predictive Analytics",
        "",
        "ID policy: `ENSxxx` uniquement. Les IDs `Txxx` sont rejetés sauf table d'alias.",
        "",
    ]
    for name, spec in DATASETS.items():
        lines.append(f"## {name}")
        lines.append("")
        lines.append(f"**Fichier:** `{spec['file']}`")
        lines.append(f"**Source:** {spec['source_system']}")
        lines.append(f"**Description:** {spec['description']}")
        lines.append(f"**Clé primaire:** {', '.join(spec['primary_key'])}")
        fks = spec.get("foreign_keys") or {}
        if fks:
            lines.append(f"**Clés étrangères:** {', '.join(f'{k} -> {v}' for k, v in fks.items())}")
        lines.append("")
        lines.append("| Colonne | Type | Requise | Description |")
        lines.append("|---|---|---|---|")
        for c in spec["columns"]:
            req = "oui" if c["required"] else "non"
            desc = c["description"]
            if c.get("calculated"):
                desc += " *(calculée: " + (c.get("computed_from") or "") + ")*"
            lines.append(f"| `{c['name']}` | {c['type']} | {req} | {desc} |")
        lines.append("")
        lines.append("**Règles de validation:**")
        for r in spec.get("validation_rules", []):
            lines.append(f"- {r}")
        lines.append("**Règles de nettoyage:**")
        for r in spec.get("cleaning_rules", []):
            lines.append(f"- {r}")
        lines.append("**Règles de rejet:**")
        for r in spec.get("rejection_rules", []):
            lines.append(f"- {r}")
        lines.append(f"**Déduplication:** {spec['deduplication']}")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/contracts")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "data_dictionary.json").write_text(
        json.dumps(data_dictionary(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "data_dictionary.md").write_text(build_markdown(), encoding="utf-8")
    print(f"Data dictionary généré dans {out_dir}")


if __name__ == "__main__":
    main()
