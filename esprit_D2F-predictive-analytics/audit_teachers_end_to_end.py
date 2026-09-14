"""Audit Volet 4 — cohérence bout en bout par enseignant (dans le conteneur).

Pour chaque enseignant ACTIF (etat='A') :
1. mode expose (PRODUCTION_ML / HEURISTIC_FALLBACK) correspond au moteur
   reellement utilise (pas de mode ML mensonger) + fallback_reason ;
2. couverture : features du serveur dans les plages du modele servi
   (rapport exact des colonnes hors plage) ;
3. score de risque recalcule manuellement (0.50/0.12/0.40 sur les gaps)
   vs score expose par l'API — egalite exacte requise ;
4. justification de chaque recommandation par les savoirs manquants reels
   (matched_savoirs) et liens formation-savoir en base.

Sortie : /tmp/audit_teachers_results.json + resume console.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import date

from sqlalchemy import text

from app.core.config import get_settings
from app.infrastructure.container import Container
from app.infrastructure.ml.predictor import TEMPORAL_FEATURE_COLS
from app.domain.value_objects.enums import Severity

OUT = "/tmp/audit_teachers_results.json"

settings = get_settings()
container = Container(settings)
container.database.connect()

port = container.model_port
status = port.status()
model_mode_global = status.get("model_mode")
model_version = status.get("model_version")
feature_ranges = (port._metadata or {}).get("feature_ranges") or {}

# Enseignants actifs
with container.database.read_connection() as conn:
    rows = conn.execute(
        text("SELECT id FROM formation.enseignants WHERE etat = 'A' ORDER BY id")
    ).mappings().all()
active_ids = [r["id"] for r in rows]
print(f"Enseignants actifs : {len(active_ids)}")
print(f"Mode global : {model_mode_global} | version : {model_version}")

results = []
in_range_count = 0
fallback_cases = []
mode_mismatches = []
risk_mismatches = []
reco_issues = []

for tid in active_ids:
    teacher = container.teacher_source.get_teacher(tid)
    if teacher is None:
        continue
    entry: dict = {"teacher_id": tid, "dept": teacher.dept_id, "up": teacher.up_id}

    # 1. Gaps + mode expose
    gaps, model_mode, _version = container.compute_gaps.execute(tid)
    entry["mode_exposed"] = model_mode
    entry["n_gaps"] = len(gaps)

    # Moteur reellement utilise : predict_gaps retourne None => heuristique.
    ml_gaps = port.predict_gaps(tid)
    entry["ml_served"] = ml_gaps is not None and len(ml_gaps) > 0
    ml_nonempty_scope = False
    if ml_gaps:
        scoped = container.compute_gaps._scoped_competencies(tid)
        allowed = {c.id for c in scoped}
        ml_nonempty_scope = any(g.competence_id in allowed for g in ml_gaps)
    entry["ml_covered_scope"] = ml_nonempty_scope
    # Coherence : mode PRODUCTION_ML exige que le ML ait servi ET couvert le scope.
    coherent = (model_mode == "PRODUCTION_ML") == (ml_gaps is not None and ml_nonempty_scope)
    entry["mode_coherent"] = coherent
    if not coherent:
        mode_mismatches.append({
            "teacher_id": tid,
            "mode_exposed": model_mode,
            "ml_served": entry["ml_served"],
            "ml_covered_scope": ml_nonempty_scope,
        })

    # 2. Couverture des features dans les plages du modele servi
    bundle = dict(port._teacher_feature_bundle(tid))
    bundle["stagnation_months"] = port._stagnation_months(bundle)
    X, _comp_ids, _req = port._build_feature_matrix(bundle)
    if X.shape[0] == 0:
        entry["coverage"] = "NO_FEATURES"
        fallback_cases.append({"teacher_id": tid, "reason": "aucune feature (aucun savoir evaluable)"})
    else:
        out_cols = []
        for i, col in enumerate(TEMPORAL_FEATURE_COLS):
            bounds = feature_ranges.get(col)
            if not bounds:
                continue
            lo, hi = float(bounds.get("min", -1e9)), float(bounds.get("max", 1e9))
            col_lo, col_hi = float(X[:, i].min()), float(X[:, i].max())
            if col_lo < lo - 1e-6 or col_hi > hi + 1e-6:
                out_cols.append({
                    "col": col, "observed": [round(col_lo, 3), round(col_hi, 3)],
                    "range": [round(lo, 3), round(hi, 3)],
                })
        if not out_cols:
            entry["coverage"] = "IN_RANGE"
            in_range_count += 1
        else:
            entry["coverage"] = "OUT_OF_RANGE"
            entry["out_of_range"] = out_cols
            fallback_cases.append({
                "teacher_id": tid,
                "reason": "features hors plage du modele servi : " + ", ".join(c["col"] for c in out_cols),
            })

    # 3. Recalcul manuel du score de risque (0.50/0.12/0.40)
    risk, mode_r, _v, reason_r, _payload = container.compute_risk.execute_serving(tid)
    crit = sum(1 for g in gaps if g.severity == Severity.CRITICAL)
    high = sum(1 for g in gaps if g.severity == Severity.HIGH)
    avg_gap = (sum(g.gap_score for g in gaps) / len(gaps)) if gaps else 0.0
    manual = 100.0 * min(1.0, max(0.0, 0.5 * min(1.0, crit / 2.0) + 0.12 * min(1.0, high / 1.0) + 0.40 * min(1.0, max(0.0, avg_gap))))
    manual = round(manual, 2)
    entry["risk_score"] = risk.risk_score
    entry["risk_level"] = risk.risk_level.value if hasattr(risk.risk_level, "value") else str(risk.risk_level)
    entry["risk_mode"] = mode_r
    entry["risk_manual"] = manual
    entry["risk_match"] = abs(manual - float(risk.risk_score)) < 0.01
    if not entry["risk_match"]:
        risk_mismatches.append({
            "teacher_id": tid, "manual": manual, "api": float(risk.risk_score),
            "mode": mode_r, "reason": reason_r,
        })

    # 4. Justification des recommandations par les savoirs manquants reels
    analysis = container.analyze_teacher_scope.execute(teacher)
    savoir_levels = container.competency_source.get_teacher_savoir_levels(tid)
    gap_comps = {g.competence_id for g in gaps if g.gap_score > 0}
    recs_checked = []
    for rec in analysis.recommendations:
        d = rec.to_dict()
        comp_id = rec.competence_id
        issue = None
        if comp_id not in gap_comps:
            issue = "competence sans gap>0 pour cet enseignant"
        matched = d.get("matched_savoirs") or []
        reason_txt = d.get("reason") or ""
        if "Couvre" in reason_txt and not matched:
            issue = "raison 'Couvre' sans matched_savoirs"
        if matched:
            # Verifier que chaque savoir cite est reellement manquant
            with container.database.read_connection() as conn:
                rows2 = conn.execute(
                    text("""
                        SELECT s.id, s.nom, COALESCE(
                            (SELECT MAX(CASE nsr.niveau
                                WHEN 'N1_DEBUTANT' THEN 1 WHEN 'N2_ELEMENTAIRE' THEN 2
                                WHEN 'N3_INTERMEDIAIRE' THEN 3 WHEN 'N4_AVANCE' THEN 4
                                WHEN 'N5_EXPERT' THEN 5 ELSE 0 END)
                             FROM competence.niveau_savoir_requis nsr
                             WHERE nsr.savoir_id = s.id), 0) AS required
                        FROM competence.savoirs s WHERE s.nom = ANY(:names)
                    """),
                    {"names": list(matched)},
                ).mappings().all()
            for r2 in rows2:
                if savoir_levels.get(r2["id"], 0) >= r2["required"]:
                    issue = f"savoir cite non manquant : {r2['nom']}"
                    break
        recs_checked.append({
            "formation_id": rec.formation_id,
            "competence_id": comp_id,
            "score": rec.rank_score,
            "reason": reason_txt,
            "matched_savoirs": list(matched),
            "issue": issue,
        })
        if issue:
            reco_issues.append({"teacher_id": tid, **recs_checked[-1]})
    entry["recommendations"] = recs_checked
    entry["scope_fallback"] = analysis.scope.fallback
    results.append(entry)

# Resume
modes = Counter(r["mode_exposed"] for r in results)
summary = {
    "model_mode_global": model_mode_global,
    "model_version": model_version,
    "n_teachers_active": len(results),
    "modes_exposed": dict(modes),
    "mode_mismatches": mode_mismatches,
    "coverage": {
        "in_range": in_range_count,
        "no_features": sum(1 for r in results if r["coverage"] == "NO_FEATURES"),
        "out_of_range": sum(1 for r in results if r["coverage"] == "OUT_OF_RANGE"),
        "fallback_cases": fallback_cases,
    },
    "risk_manual_recompute": {
        "checked": len(results),
        "mismatches": risk_mismatches,
        "all_match": not risk_mismatches,
    },
    "recommendation_justifications": {
        "checked": sum(len(r["recommendations"]) for r in results),
        "issues": reco_issues,
        "all_justified": not reco_issues,
    },
    "teachers": results,
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2, ensure_ascii=False, default=str)

print(json.dumps({k: v for k, v in summary.items() if k != "teachers"}, indent=2, ensure_ascii=False, default=str))
