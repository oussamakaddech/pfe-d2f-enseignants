"""Mesure live du serving, sans rien persister, DANS le conteneur predictive-analytics.

Pour chaque enseignant actif : même décision que ComputeGaps.execute (prédiction
ML puis filtre au périmètre), mais sans save_skill_gaps. Sortie JSON sur stdout.
Argument : fichier des ids d'enseignants (un par ligne).
"""
import json
import sys
from collections import Counter

from app.core.config import get_settings
from app.infrastructure.container import Container

c = Container(get_settings())
c.database.connect()
port = c.model_port
cg = c.compute_gaps
ids = [l.strip() for l in open(sys.argv[1], encoding="utf-8") if l.strip()]

par_enseignant = {}
for tid in ids:
    try:
        scoped = cg._scoped_competencies(tid)
        ml = port.predict_gaps(tid)
        if ml is None:
            mode, raison = "HEURISTIC_FALLBACK", port._fallback_reason
        elif not ml:
            mode, raison = "HEURISTIC_FALLBACK", "aucune feature (aucun niveau sur le perimetre)"
        elif cg._filter_to_scope_ids(scoped, ml):
            mode, raison = "PRODUCTION_ML", None
        else:
            mode, raison = "HEURISTIC_FALLBACK", "ML hors perimetre"
    except Exception as exc:  # noqa: BLE001
        mode, raison = "ERREUR", f"{type(exc).__name__}: {exc}"[:160]
    par_enseignant[tid] = {"mode": mode, "fallback_reason": raison}

health = port.model_health()
raisons = Counter((v["fallback_reason"] or "")[:90] for v in par_enseignant.values() if v["mode"] != "PRODUCTION_ML")
print(json.dumps({
    "model_health": {k: health.get(k) for k in (
        "mode", "model_version", "algorithm", "n_features", "rmse", "r2", "integrity_verified",
        "inert_features", "skew_checked", "skew_detected", "target_validity", "fallback_reason")},
    "enseignants": len(ids),
    "modes": Counter(v["mode"] for v in par_enseignant.values()),
    "raisons_de_repli": raisons,
    "par_enseignant": par_enseignant,
}, ensure_ascii=False, default=str))
