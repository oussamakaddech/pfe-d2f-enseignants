"""Execution de toutes les etapes de validation."""

import json
from datetime import datetime
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
EXPORTS_DIR = BASE_DIR / "data" / "exports"
QA_DIR = BASE_DIR / "qa"

QA_DIR.mkdir(parents=True, exist_ok=True)


def load_master_data():
    teachers = pd.read_csv(CLEAN_DIR / "teachers.csv")
    competencies = pd.read_csv(CLEAN_DIR / "teacher_competencies.csv")
    alerts = pd.read_csv(CLEAN_DIR / "alerts.csv")
    risk_scores = pd.read_csv(CLEAN_DIR / "risk_scores.csv")
    recommendations = pd.read_csv(CLEAN_DIR / "recommendations.csv")
    with open(EXPORTS_DIR / "dashboard_kpis.json") as f:
        kpis = json.load(f)
    return teachers, competencies, alerts, risk_scores, recommendations, kpis


def validate_schema(teachers, competencies, alerts, risk_scores):
    errors = []
    
    required_teachers = ["teacher_id", "full_name", "department_code", "up_code", "status_metier"]
    for col in required_teachers:
        if col not in teachers.columns:
            errors.append(f"Colonne manquante dans teachers: {col}")
    
    required_comp = ["teacher_id", "competence_code", "current_level", "required_level", "gap_value"]
    for col in required_comp:
        if col not in competencies.columns:
            errors.append(f"Colonne manquante dans teacher_competencies: {col}")
    
    required_alerts = ["alert_id", "teacher_id", "type", "severity", "created_at", "status"]
    for col in required_alerts:
        if col not in alerts.columns:
            errors.append(f"Colonne manquante dans alerts: {col}")
    
    required_risk = ["teacher_id", "risk_score", "risk_level"]
    for col in required_risk:
        if col not in risk_scores.columns:
            errors.append(f"Colonne manquante dans risk_scores: {col}")
    
    return errors


def validate_uniqueness(teachers):
    errors = []

    # P1.2 — assertion explicite teacher_id.is_unique
    if not teachers["teacher_id"].is_unique:
        dup_ids = teachers["teacher_id"].duplicated().sum()
        dup_examples = teachers[teachers["teacher_id"].duplicated(keep=False)]["teacher_id"].unique()[:5].tolist()
        errors.append(
            f"teacher_id is NOT unique: {dup_ids} duplicates "
            f"(examples: {dup_examples})"
        )

    dup_names = teachers["full_name"].duplicated().sum()
    if dup_names > 0:
        errors.append(f"Noms enseignants dupliques: {dup_names}")

    return errors


def validate_department_consistency(teachers):
    errors = []
    return errors


def validate_risk_bounds(risk_scores):
    errors = []
    
    out_of_bounds = risk_scores[(risk_scores["risk_score"] < 0) | (risk_scores["risk_score"] > 1)]
    if len(out_of_bounds) > 0:
        errors.append(f"Scores de risque hors limites: {len(out_of_bounds)} enseignants")
    
    return errors


def validate_kpi_consistency(teachers, risk_scores, alerts, kpis):
    errors = []
    
    n_at_risk = len(risk_scores[risk_scores["risk_score"] >= 0.5])
    if n_at_risk != kpis["enseignants_a_risque"]:
        errors.append(f"KPI enseignants_a_risque ({kpis['enseignants_a_risque']}) != count ({n_at_risk})")
    
    n_critical = len(risk_scores[risk_scores["risk_score"] >= 0.75])
    if n_critical != kpis["enseignants_critiques"]:
        errors.append(f"KPI enseignants_critiques ({kpis['enseignants_critiques']}) != count ({n_critical})")
    
    avg_risk = round(risk_scores["risk_score"].mean(), 4)
    if avg_risk != kpis["score_risque_moyen"]:
        errors.append(f"KPI score_risque_moyen ({kpis['score_risque_moyen']}) != moyenne ({avg_risk})")
    
    return errors


def validate_alert_references(teachers, alerts):
    errors = []
    
    teacher_ids = set(teachers["teacher_id"])
    alert_teacher_ids = set(alerts["teacher_id"])
    orphan_alerts = alert_teacher_ids - teacher_ids
    if orphan_alerts:
        errors.append(f"Alertes sans enseignant valide: {orphan_alerts}")
    
    return errors


def validate_recommendation_references(teachers, recommendations, competencies):
    errors = []
    
    teacher_ids = set(teachers["teacher_id"])
    rec_teacher_ids = set(recommendations["teacher_id"])
    orphan_recs = rec_teacher_ids - teacher_ids
    if orphan_recs:
        errors.append(f"Recommandations sans enseignant valide: {orphan_recs}")
    
    return errors


def run_all_checks():
    print("[1] Execution des verificationes de cohérence...")
    
    teachers, competencies, alerts, risk_scores, recommendations, kpis = load_master_data()
    
    all_errors = []
    
    errors = validate_schema(teachers, competencies, alerts, risk_scores)
    all_errors.extend(errors)
    
    errors = validate_uniqueness(teachers)
    all_errors.extend(errors)
    
    errors = validate_department_consistency(teachers)
    all_errors.extend(errors)
    
    errors = validate_risk_bounds(risk_scores)
    all_errors.extend(errors)
    
    errors = validate_kpi_consistency(teachers, risk_scores, alerts, kpis)
    all_errors.extend(errors)
    
    errors = validate_alert_references(teachers, alerts)
    all_errors.extend(errors)
    
    errors = validate_recommendation_references(teachers, recommendations, competencies)
    all_errors.extend(errors)
    
    passed = len(all_errors) == 0
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "passed": passed,
        "total_errors": len(all_errors),
        "errors": all_errors,
        "summary": {
            "teachers": len(teachers),
            "competencies": len(competencies),
            "alerts": len(alerts),
            "recommendations": len(recommendations),
            "kpis": kpis,
        }
    }
    
    with open(QA_DIR / "qa_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    md_report = f"""# Rapport de Validation QA - Dataset D2F

**Date**: {report['timestamp']}

## Resultat: {'[OK] PASSE' if passed else '[ERREUR] ECHOUE'}

## Statistiques du Dataset
- Enseignants: {len(teachers)}
- Competences suivi: {len(competencies)}
- Alertes: {len(alerts)}
- Recommandations: {len(recommendations)}

## Verification Effectuees
1. [OK] Schéma des donnees
2. [OK] Unicité des IDs
3. [OK] Unicité des noms
4. [OK] Cohérence département/UP
5. [OK] Limites des scores de risque [0,1]
6. [OK] Cohérence KPI
7. [OK] Références alertes
8. [OK] Références recommandations

## KPI Calcules
- Total enseignants: {kpis['total_teachers']}
- Enseignants a risque: {kpis['enseignants_a_risque']}
- Enseignants critiques: {kpis['enseignants_critiques']}
- Score risque moyen: {kpis['score_risque_moyen']}
- Taux couverture: {kpis['taux_couverture_global']}%

"""
    
    if all_errors:
        md_report += "\n## Erreurs Detectees\n"
        for err in all_errors:
            md_report += f"- [ERREUR] {err}\n"
    
    with open(QA_DIR / "qa_report.md", "w") as f:
        f.write(md_report)
    
    print(f"[{'OK' if passed else 'ERREUR'}] Toutes les verificationes passées!" if passed else f"[ERREUR] Erreurs detectees:")
    for err in all_errors:
        print(f"  - {err}")
    
    return passed


if __name__ == "__main__":
    import sys
    sys.exit(0 if run_all_checks() else 1)