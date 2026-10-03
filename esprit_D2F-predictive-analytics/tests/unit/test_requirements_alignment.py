"""Garde : l'image de production doit pouvoir charger le modele servi.

Constat d'audit (2026-10-01) : apres la bascule vers XGBoost (v1.3.0-xgb),
requirements-prod.txt (Dockerfile.prod) ne contenait pas xgboost et figeait
scikit-learn 1.5.2 alors que l'artefact est pickle en 1.8.0. Une image prod
aurait donc servi le repli heuristique sans que la suite de tests ne le voie.
"""
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]

# Paquets dont la version conditionne le depicklage des artefacts joblib.
RUNTIME_ML = ("scikit-learn", "numpy", "pandas", "joblib", "xgboost")

# Algorithme de la metadata servie -> paquet requis pour charger l'artefact.
ALGO_PACKAGE = {"xgboost": "xgboost", "lightgbm": "lightgbm"}


def _pins(name: str) -> dict:
    pins = {}
    for line in (BASE / name).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*([A-Za-z0-9_.\-\[\]]+)==([^\s#]+)", line)
        if m:
            pins[m.group(1).split("[")[0].lower()] = m.group(2)
    return pins


def test_prod_pins_same_ml_runtime_as_training():
    dev, prod = _pins("requirements.txt"), _pins("requirements-prod.txt")
    for pkg in RUNTIME_ML:
        assert pkg in prod, f"{pkg} absent de requirements-prod.txt"
        assert prod[pkg] == dev[pkg], f"{pkg} : prod {prod[pkg]} != entrainement {dev[pkg]}"


def test_prod_installs_package_of_served_algorithm():
    meta = json.loads((BASE / "data/models/temporal_training_metadata.json").read_text(encoding="utf-8"))
    pkg = ALGO_PACKAGE.get(str(meta.get("algorithm", "")).lower())
    if pkg:
        assert pkg in _pins("requirements-prod.txt"), f"modele servi {meta['algorithm']} : {pkg} manquant en prod"
