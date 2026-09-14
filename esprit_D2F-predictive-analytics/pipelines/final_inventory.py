"""Inventaire final du service ML — séparé PRODUCTION / DEMO / SYNTHETIC / UNKNOWN.

Sorties :
- reports/final_inventory.json
- reports/final_inventory.md
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
REPORTS = BASE_DIR / "reports"
DATA = BASE_DIR / "data"
MODELS = DATA / "models"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _git(*args: str) -> str:
    try:
        out = subprocess.run(["git", *args], capture_output=True, text=True, cwd=BASE_DIR)
        return out.stdout.strip() or out.stderr.strip()
    except Exception as exc:
        return f"ERR:{exc}"


def _csv_origin(path: Path) -> dict:
    """Détermine la classe de provenance d'un CSV par ses colonnes."""
    import pandas as pd

    try:
        df = pd.read_csv(path, nrows=5)
    except Exception as exc:
        return {"class": "UNKNOWN", "reason": str(exc)}
    cols = set(df.columns)
    origin = "UNKNOWN"
    is_synth = False
    inst_verified = False
    if "is_synthetic" in cols:
        vals = set(df["is_synthetic"].dropna().astype(str).str.lower().str.strip())
        is_synth = vals <= {"true", "1", "yes"}
        if vals:
            inst_verified = vals <= {"false", "0", "no"}
    if "data_origin" in cols:
        origins = set(df["data_origin"].dropna().astype(str).str.upper())
        if origins == {"SYNTHETIC"}:
            origin = "SYNTHETIC"
        elif origins and origins <= {"REAL", "DATABASE", "DB"}:
            origin = "PRODUCTION"
        elif origins:
            origin = "UNKNOWN"
    if "source_type" in cols:
        st = set(df["source_type"].dropna().astype(str).str.lower())
        if st and st <= {"db", "database"}:
            origin = "PRODUCTION" if origin != "SYNTHETIC" else origin
        if st and st <= {"synthetic_generator"}:
            origin = "SYNTHETIC"
    return {
        "class": origin,
        "is_synthetic": is_synth if "is_synthetic" in cols else None,
        "institutional_verified": inst_verified if "institutional_verified" in cols else None,
    }


def _load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def build() -> dict:
    commit = _git("rev-parse", "HEAD")
    branch = _git("rev-parse", "--abbrev-ref", "HEAD")
    describe = _git("describe", "--tags", "--always")

    prod_registry = _load(MODELS / "model_registry.json") or []
    demo_registry = _load(MODELS / "demo" / "model_registry_demo.json") or []

    prod_artifacts = []
    for p in sorted(MODELS.glob("*.joblib")):
        sidecar = Path(f"{p}.sha256")
        prod_artifacts.append({
            "name": p.name,
            "sha256": _sha256(p),
            "sidecar": sidecar.exists(),
            "sidecar_sha256": sidecar.read_text().strip() if sidecar.exists() else None,
            "class": "PRODUCTION",
        })
    demo_artifacts = []
    for p in sorted((MODELS / "demo").glob("*.joblib")):
        sidecar = Path(f"{p}.sha256")
        demo_artifacts.append({
            "name": p.name,
            "sha256": _sha256(p),
            "sidecar": sidecar.exists(),
            "sidecar_sha256": sidecar.read_text().strip() if sidecar.exists() else None,
            "class": "DEMO",
        })

    datasets = []
    for pattern in ("clean/*.csv", "synthetic/*.csv", "raw/*.csv", "catalogue/*.csv"):
        for p in sorted(DATA.glob(pattern)):
            origin = _csv_origin(p)
            datasets.append({
                "path": str(p.relative_to(BASE_DIR)),
                "rows": _count_rows(p),
                **origin,
            })

    routes = []
    for f in sorted((BASE_DIR / "app" / "api" / "v1").glob("*.py")):
        for line in f.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s.startswith("@router."):
                verb = s[8:].split("(")[0].upper()
                route = line.split("(", 1)[1].rsplit(",", 1)[0] if "," in line else line.split("(", 1)[1]
                routes.append({"file": f.name, "verb": verb, "decorator": s})

    env = []
    env_example = BASE_DIR / ".env.example"
    if env_example.exists():
        for line in env_example.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            key = s.split("=", 1)[0].strip()
            env.append({"key": key, "has_default": not any(x in s for x in ("CHANGE_ME", "do_not_use_default"))})

    tests = []
    for p in sorted((BASE_DIR / "tests").rglob("test_*.py")):
        tests.append(str(p.relative_to(BASE_DIR)))

    reports = sorted(str(p.relative_to(BASE_DIR)) for p in REPORTS.glob("*"))

    docker = []
    for name in ("Dockerfile", "Dockerfile.prod", ".dockerignore"):
        p = BASE_DIR / name
        if p.exists():
            docker.append({"file": name, "exists": True, "lines": len(p.read_text(encoding="utf-8").splitlines())})

    inventory = {
        "code": {
            "commit": commit,
            "branch": branch,
            "describe": describe,
            "class": "PRODUCTION",
        },
        "production_models": prod_registry,
        "demo_models": demo_registry,
        "artifacts": {
            "PRODUCTION": prod_artifacts,
            "DEMO": demo_artifacts,
        },
        "datasets": datasets,
        "registries": {
            "model_registry.json": str(MODELS / "model_registry.json"),
            "model_registry_demo.json": str(MODELS / "demo" / "model_registry_demo.json"),
        },
        "routes": routes,
        "environment_variables": env,
        "tests": {"files": tests, "count": len(tests)},
        "docker": docker,
        "reports": reports,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "final_inventory.json").write_text(
        json.dumps(inventory, indent=2, ensure_ascii=False), encoding="utf-8")
    write_md(inventory)
    return inventory


def _count_rows(path: Path) -> int:
    try:
        return sum(1 for _ in open(path, encoding="utf-8", errors="ignore")) - 1
    except Exception:
        return -1


def write_md(inv: dict) -> None:
    lines = [
        "# Inventaire final — service ML prédictif",
        "",
        f"- **commit** : `{inv['code']['commit']}`",
        f"- **branche** : `{inv['code']['branch']}`",
        f"- **describe** : `{inv['code']['describe']}`",
        "",
        "## Classification",
        "",
        "| Classe | Définition |",
        "|---|---|",
        "| PRODUCTION | code, modèle v1.0.0/v1.1.0, corpus application, registre principal |",
        "| DEMO | modèle démo + registre dédié (data/models/demo) |",
        "| SYNTHETIC | dataset 1 000 lignes (data/synthetic), modèle entraîné dessus |",
        "| UNKNOWN | fichiers sans provenance déclarée ou non lus |",
        "",
        "## Modèles production (registre)",
        "",
        "| version | statut | dataset_hash | artefact_sha256 | approbation |",
        "|---|---|---|---|---|",
    ]
    for m in inv["production_models"]:
        lines.append(
            f"| {m.get('model_version')} | {m.get('status')} | "
            f"`{(m.get('dataset_hash') or '')[:16]}` | `{(m.get('artifact_sha256') or '')[:16]}` | "
            f"{m.get('approval_status')} |"
        )
    lines += ["", "## Modèles démo (registre dédié)", "", "| version | statut | data_origin | institutionnel | artefact |", "|---|---|---|---|---|"]
    for m in inv["demo_models"]:
        lines.append(
            f"| {m.get('model_version')} | {m.get('status')} | {m.get('data_origin')} | "
            f"{m.get('institutional_verified')} | `{(m.get('artifact_sha256') or '')[:16]}` |"
        )
    lines += ["", "## Datasets", "", "| chemin | lignes | classe | is_synthetic | inst_verified |", "|---|---:|---|---|---|"]
    for d in sorted(inv["datasets"], key=lambda x: (x["class"], x["path"])):
        lines.append(
            f"| `{d['path']}` | {d['rows']} | {d['class']} | "
            f"{d['is_synthetic']} | {d['institutional_verified']} |"
        )
    lines += ["", "## Routes API", "", "| fichier | verbe |", "|---|---|"]
    seen = set()
    for r in inv["routes"]:
        key = (r["file"], r["verb"], r["decorator"])
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"| `{r['file']}` | `{r['verb']} {r['decorator']}` |")
    lines += ["", "## Variables d'environnement (documentées)", "", "| clé | défaut sécurisé |", "|---|---|"]
    for e in inv["environment_variables"]:
        lines.append(f"| `{e['key']}` | {e['has_default']} |")
    lines += [
        "",
        "## Tests",
        "",
        f"- Fichiers de test : {inv['tests']['count']}",
        "",
        "## Docker",
        "",
        "| fichier | lignes |",
        "|---|---:|",
        *[f"| `{d['file']}` | {d['lines']} |" for d in inv["docker"]],
        "",
        f"## Rapports existants ({len(inv['reports'])})",
        "",
        *[f"- `{r}`" for r in inv["reports"]],
        "",
    ]
    (REPORTS / "final_inventory.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    inv = build()
    print(f"[OK] final_inventory.json ({len(inv['datasets'])} datasets, "
          f"{len(inv['routes'])} routes, {inv['tests']['count']} fichiers de test)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())