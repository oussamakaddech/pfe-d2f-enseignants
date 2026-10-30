"""
eval_referentiel_fr.py
──────────────────────
Banc d'évaluation du rapprochement « acquis d'apprentissage → savoir du
référentiel » (outil manuel, non collecté par pytest).

Jeu : ``eval_set_fr.py`` — 70 acquis rédigés comme dans une fiche ESPRIT
(paraphrasés, sans recopier le libellé du savoir) + 2 × 10 phrases hors sujet
(réglage du seuil / validation). Les codes attendus sont ceux du référentiel
officiel en base (schéma ``competence``).

Mesures : top-1 / top-3 (le bon savoir est-il le premier / dans les trois
premiers proposés ?) et nombre de phrases hors sujet pour lesquelles un savoir
est proposé à tort.

Exécution (dans le conteneur, qui a le modèle et l'accès base) :
    docker cp tests/manual d2f-rice:/tmp/eval
    docker exec d2f-rice python /tmp/eval/eval_referentiel_fr.py
Balayage de seuils : ajouter par exemple ``0.35,0.40,0.45``.

Référence (2026-09-23, 101 savoirs) : avant correctif 12,9 % top-1 (référentiel
JSON aux codes absents de la base) ; après, avec
paraphrase-multilingual-MiniLM-L12-v2 au seuil 0,40 et classement centré,
~69 % top-1 / ~84 % top-3, 1/10 et 0/10 faux positifs.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path

logging.disable(logging.WARNING)
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, os.getenv("RICE_APP_DIR", "/app"))

from eval_set_fr import NEGATIVES, NEGATIVES_VALIDATION, POSITIVES  # noqa: E402

import rice.referential as ref  # noqa: E402


def _mesurer() -> dict:
    top1 = top3 = 0
    ratés = []
    for dept, texte, attendus in POSITIVES:
        codes = ref._match_gc_savoir(texte, departement=dept)
        ok1 = bool(codes) and codes[0] in attendus
        top1 += ok1
        top3 += bool(set(codes[:3]) & attendus)
        if not ok1:
            ratés.append({"dept": dept, "texte": texte, "attendus": sorted(attendus), "obtenus": codes[:3]})
    n = len(POSITIVES)
    fp = sum(bool(ref._match_gc_savoir(t, departement=d)) for d, t in NEGATIVES)
    fv = sum(bool(ref._match_gc_savoir(t, departement=d)) for d, t in NEGATIVES_VALIDATION)
    return {
        "seuil": ref._SEMANTIC_THRESHOLD,
        "top1": round(top1 / n, 3),
        "top3": round(top3 / n, 3),
        "faux_positifs_reglage": f"{fp}/{len(NEGATIVES)}",
        "faux_positifs_validation": f"{fv}/{len(NEGATIVES_VALIDATION)}",
        "ratés": ratés,
    }


def main() -> None:
    t0 = time.time()
    for dept in ("gc", "info", "telecom"):
        ref._build_semantic_corpus(dept)
    entete = {
        "modele": ref._SEMANTIC_MODEL_REF or None,
        "semantique": ref._SEMANTIC_MODEL is not None,
        "referentiel": {d: ref._get_effective_referential(d).get("source", "secours")
                        for d in ("gc", "info", "telecom")},
        "chauffe_s": round(time.time() - t0, 1),
    }
    print(json.dumps(entete, ensure_ascii=False))
    seuils = [float(x) for x in sys.argv[1].split(",")] if len(sys.argv) > 1 else [ref._SEMANTIC_THRESHOLD]
    for seuil in seuils:
        ref._SEMANTIC_THRESHOLD = seuil
        res = _mesurer()
        ratés = res.pop("ratés")
        print(json.dumps(res, ensure_ascii=False))
    if len(seuils) == 1:
        for r in ratés:
            print("  raté :", json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main()
