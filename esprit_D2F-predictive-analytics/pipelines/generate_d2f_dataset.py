"""Generation du dataset maître D2F pour l'analyse prédictive.

Ce script genere un dataset synthétique cohérent avec:
- 30 enseignants uniques
- 6 départements / UPs
- 12 compétences
- 12 formations
- 10 alertes
- Historique sur 3 mois

Toutes les données sont generees avec une seed fixe pour la reproductibilite.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
CLEAN_DIR = DATA_DIR / "clean"
EXPORTS_DIR = DATA_DIR / "exports"

RAW_DIR.mkdir(parents=True, exist_ok=True)
CLEAN_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

DEPARTEMENTS = [
    {"code": "GL", "nom": "Genie Logiciel", "up_code": "UP-GL"},
    {"code": "INFO", "nom": "Informatique", "up_code": "UP-INFO"},
    {"code": "RT", "nom": "Reseaux & Cybersecurite", "up_code": "UP-RT"},
    {"code": "GC", "nom": "Genie Civil", "up_code": "UP-GC"},
    {"code": "WEB", "nom": "Technologies du Web", "up_code": "UP-WEB"},
    {"code": "SUP", "nom": "Support Pedagogique", "up_code": "UP-SUP"},
]

COMPETENCES = [
    {"code": "ALG", "nom": "Algorithmique", "domaine": "GL"},
    {"code": "PROG", "nom": "Programmation", "domaine": "GL"},
    {"code": "BD", "nom": "Bases de Donnees", "domaine": "INFO"},
    {"code": "RESEAU", "nom": "Reseaux", "domaine": "RT"},
    {"code": "SEC", "nom": "Securite Informatique", "domaine": "RT"},
    {"code": "WEB_F", "nom": "Developpement Web Front", "domaine": "WEB"},
    {"code": "WEB_B", "nom": "Developpement Web Back", "domaine": "WEB"},
    {"code": "GC_STRU", "nom": "Structure Batiment", "domaine": "GC"},
    {"code": "GC_MAT", "nom": "Matériaux", "domaine": "GC"},
    {"code": "PED", "nom": "Pedagogie", "domaine": "SUP"},
    {"code": "GESTION", "nom": "Gestion de Projet", "domaine": "SUP"},
    {"code": "ANG", "nom": "Anglais Technique", "domaine": "SUP"},
]

FORMATIONS = [
    {"code": "F001", "titre": "Maîtrise des algorithmes avancés", "competences": ["ALG"], "niveau_cible": 4},
    {"code": "F002", "titre": "Architecture logicielle orientée services", "competences": ["PROG"], "niveau_cible": 4},
    {"code": "F003", "titre": "Data Engineering et pipelines", "competences": ["BD"], "niveau_cible": 3},
    {"code": "F004", "titre": "Cybersécurité appliquée", "competences": ["SEC"], "niveau_cible": 3},
    {"code": "F005", "titre": "Développement full-stack React", "competences": ["WEB_F", "WEB_B"], "niveau_cible": 3},
    {"code": "F006", "titre": "BIM et modélisation 3D", "competences": ["GC_STRU"], "niveau_cible": 3},
    {"code": "F007", "titre": "Pédagogie active par compétences", "competences": ["PED"], "niveau_cible": 3},
    {"code": "F008", "titre": "Management de projet agile", "competences": ["GESTION"], "niveau_cible": 3},
    {"code": "F009", "titre": "Architecture réseau et sécurité TCP/IP", "competences": ["RESEAU", "SEC"], "niveau_cible": 3},
    {"code": "F010", "titre": "Matériaux de construction et durabilité", "competences": ["GC_MAT"], "niveau_cible": 3},
    {"code": "F011", "titre": "Anglais technique et communication", "competences": ["ANG"], "niveau_cible": 3},
    {"code": "F012", "titre": "Introduction à la cybersécurité réseau", "competences": ["RESEAU"], "niveau_cible": 4},
]

PRENOMS = ["Ahmed", "Sofia", "Mohamed", "Yassine", "Chaima", "Omar", "Nour", "Youssef", "Salah", "Meriem",
           "Imane", "Karim", "Dounia", "Yassin", "Layla", "Hassan", "Amira", "Rayan", "Fatima", "Younes",
           "Zineb", "Tarik", "Salima", "Walid", "Noura", "Adel", "Ranim", "Sami", "Hiba", "Karim"]
NOMS = ["Benali", "Haddad", "El Fassi", "Bouaziz", "Tahar", "Meziane", "Cherif", "Rachedi", "Mansouri", "Fertahi",
        "Draoui", "Khalfi", "Boukerra", "Habbal", "Tazi", "Ouhoud", "Soudani", "Bouya", "Lakhdar", "Mekki",
        "Benbouzid", "Amrani", "Errached", "Haddi", "Bouzit", "Tahiri", "Benjelloun", "Boufadly", "Benkhalfa", "Benyoucef"]

STATUS_METIER = ["Enseignant", "Maître de Conférences", "Attaché d'Enseignement et de Recherche"]
NIVEAU_LEVELS = [1, 2, 3, 4, 5]
NIVEAU_NOMS = {1: "N1 Débutant", 2: "N2 Elementaire", 3: "N3 Intermediaire", 4: "N4 Avance", 5: "N5 Expert"}


def generate_teachers(n: int = 30) -> list[dict[str, Any]]:
    """Genere les enseignants uniques avec leurs attributs de base."""
    teachers = []
    for i in range(n):
        dept = DEPARTEMENTS[i % len(DEPARTEMENTS)]
        teachers.append({
            "teacher_id": f"ENS{str(i+1).zfill(3)}",
            "full_name": f"{random.choice(PRENOMS)} {random.choice(NOMS)}",
            "department_code": dept["code"],
            "department_nom": dept["nom"],
            "up_code": dept["up_code"],
            "status_metier": random.choice(STATUS_METIER),
            "date_embauche": (datetime.now() - timedelta(days=random.randint(365, 1825))).strftime("%Y-%m-%d"),
        })
    return teachers


def generate_teacher_competencies(teachers: list[dict], competences: list[dict]) -> list[dict]:
    """Genere les competences actuelles et requises pour chaque enseignant.
    
    Distribution realisee:
    - Enseignants critiques (T1-T3): au moins 3 gaps critiques chacun
    - Enseignants a risque (T4-T8): 1-2 gaps critiques
    - Enseignants moderes (T9-T20): gaps faibles
    - Enseignants stables (T21-T30): gaps nuls ou tres faibles
    """
    rows = []
    critical_teachers = {t["teacher_id"] for t in teachers[:3]}
    at_risk_teachers = {t["teacher_id"] for t in teachers[:8]}
    
    for t in teachers:
        dept_competences = [c for c in competences if c["domaine"] == t["department_code"]]
        if not dept_competences:
            dept_competences = competences
        
        for c in dept_competences:
            if random.random() < 0.8:
                if t["teacher_id"] in critical_teachers:
                    current = random.choices(NIVEAU_LEVELS, weights=[35, 30, 20, 10, 5])[0]
                    required = random.choices(NIVEAU_LEVELS, weights=[0, 0, 0, 20, 80])[0]
                elif t["teacher_id"] in at_risk_teachers:
                    current = random.choices(NIVEAU_LEVELS, weights=[15, 25, 30, 20, 10])[0]
                    required = random.choices(NIVEAU_LEVELS, weights=[0, 0, 5, 30, 65])[0]
                elif t["teacher_id"] in {teachers[i]["teacher_id"] for i in range(8, 20)}:
                    current = random.choices(NIVEAU_LEVELS, weights=[10, 20, 35, 25, 10])[0]
                    required = random.choices(NIVEAU_LEVELS, weights=[0, 5, 20, 40, 35])[0]
                else:
                    current = random.choices(NIVEAU_LEVELS, weights=[5, 15, 30, 35, 15])[0]
                    required = random.choices(NIVEAU_LEVELS, weights=[0, 5, 15, 35, 45])[0]
                
                gap = max(0, required - current)
                is_critical = gap >= 3
                
                rows.append({
                    "teacher_id": t["teacher_id"],
                    "competence_code": c["code"],
                    "competence_nom": c["nom"],
                    "domaine": c["domaine"],
                    "current_level": current,
                    "required_level": required,
                    "gap_value": gap,
                    "is_critical_gap": is_critical,
                })
    return rows


def generate_training_history(teachers: list[dict], formateurs: list[dict]) -> list[dict]:
    """Genere l'historique des formations suivies."""
    rows = []
    now = datetime.now()
    for t in teachers:
        n_formations = random.randint(0, 5)
        formateurs_choisis = random.sample(formations_codes := [f["code"] for f in FORMATIONS], min(n_formations, len(formations_codes)))
        for f_code in formateurs_choisis:
            dt = now - timedelta(days=random.randint(30, 365))
            rows.append({
                "teacher_id": t["teacher_id"],
                "formation_code": f_code,
                "date_completion": dt.strftime("%Y-%m-%d"),
                "status": "APPROVED",
            })
    return rows


def generate_alerts(teachers: list[dict], gaps: list[dict]) -> list[dict]:
    """Genere les alertes pour les enseignants a risque.
    
    Les enseignants T1-T3 (critiques) ont 4 alertes chacuns:
    2 gap_critique + 2 stagnation, ce qui les pousse au-dessus de 0.75.
    Les enseignants T4-T8 ont 1-2 alertes (a risque).
    """
    rows = []
    alert_id = 1
    
    critical_teachers = {t["teacher_id"] for t in teachers[:3]}
    
    for t in teachers:
        t_gaps = [g for g in gaps if g["teacher_id"] == t["teacher_id"]]
        critical_gaps = [g for g in t_gaps if g["is_critical_gap"]]
        
        if t["teacher_id"] in critical_teachers:
            rows.append({
                "alert_id": f"A{str(alert_id).zfill(3)}",
                "teacher_id": t["teacher_id"],
                "type": "gap_critique",
                "severity": "CRITIQUE",
                "competence_code": random.choice(critical_gaps)["competence_code"] if critical_gaps else None,
                "message": f"Gap critique detecte sur {random.choice(critical_gaps)['competence_nom'] if critical_gaps else 'competence inconnue'}",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
                "status": "NOUVELLE",
            })
            alert_id += 1
            
            rows.append({
                "alert_id": f"A{str(alert_id).zfill(3)}",
                "teacher_id": t["teacher_id"],
                "type": "gap_critique",
                "severity": "CRITIQUE",
                "competence_code": random.choice(critical_gaps)["competence_code"] if critical_gaps else None,
                "message": "Un autre gap critique a ete detecte",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
                "status": "NOUVELLE",
            })
            alert_id += 1
            
            rows.append({
                "alert_id": f"A{str(alert_id).zfill(3)}",
                "teacher_id": t["teacher_id"],
                "type": "stagnation",
                "severity": "HAUTE",
                "competence_code": None,
                "message": "Enseignant en stagnation depuis plus de 90 jours",
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
                "status": "NOUVELLE",
            })
            alert_id += 1
            
            rows.append({
                "alert_id": f"A{str(alert_id).zfill(3)}",
                "teacher_id": t["teacher_id"],
                "type": "stagnation",
                "severity": "HAUTE",
                "competence_code": None,
                "message": "Regression des competencies observée",
                "created_at": (datetime.now() - timedelta(days=random.randint(60, 120))).strftime("%Y-%m-%d"),
                "status": "NOUVELLE",
            })
            alert_id += 1
        elif critical_gaps:
            rows.append({
                "alert_id": f"A{str(alert_id).zfill(3)}",
                "teacher_id": t["teacher_id"],
                "type": "gap_critique",
                "severity": "CRITIQUE",
                "competence_code": random.choice(critical_gaps)["competence_code"],
                "message": f"Gap critique detecte sur {random.choice(critical_gaps)['competence_nom']}",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
                "status": "NOUVELLE",
            })
            alert_id += 1
        
        if len(t_gaps) >= 3:
            rows.append({
                "alert_id": f"A{str(alert_id).zfill(3)}",
                "teacher_id": t["teacher_id"],
                "type": "stagnation",
                "severity": "HAUTE",
                "competence_code": None,
                "message": "Enseignant en stagnation depuis plus de 90 jours",
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
                "status": "NOUVELLE",
            })
            alert_id += 1
    
    return rows[:16]


def compute_risk_scores(teachers: list[dict], gaps: list[dict], alerts: list[dict]) -> list[dict]:
    """Calcule le score de risque pour chaque enseignant.
    
    Formule unique: risk = 0.40 * critical_gap_factor + 0.25 * coverage_factor
                   + 0.20 * stagnation_factor + 0.15 * regression_factor
    
    - critical_gap_factor: ratio de gaps critiques (0-1, multiplie par 2 pour amplif)
    - coverage_factor: 1 - gap_moyen/5, penalise les gaps eleves
    - stagnation_factor: nombre d'alertes actives pondéré (0.5 par alerte)
    - regression_factor: 0 si pas de régression historique
    
    Plafonné à [0, 1].
    Niveaux: CRITIQUE >= 0.75, ELEVE >= 0.50, MODERE >= 0.25, FAIBLE < 0.25
    """
    results = []
    for t in teachers:
        t_gaps = [g for g in gaps if g["teacher_id"] == t["teacher_id"]]
        t_alerts = [a for a in alerts if a["teacher_id"] == t["teacher_id"]]
        
        avg_gap = sum(g["gap_value"] for g in t_gaps) / len(t_gaps) if t_gaps else 0
        critical_count = len([g for g in t_gaps if g["is_critical_gap"]])
        critical_ratio = critical_count / len(t_gaps) if t_gaps else 0
        n_alerts = len([a for a in t_alerts if a["severity"] in ["CRITIQUE", "HAUTE"]])
        n_critical_alerts = len([a for a in t_alerts if a["type"] == "gap_critique"])
        n_stagnation_alerts = len([a for a in t_alerts if a["type"] == "stagnation"])
        
        critical_gap_factor = min(critical_ratio * 2.5 + (n_critical_alerts * 0.15), 1.0)
        coverage_factor = 1.0 - min(avg_gap / 5.0, 1.0)
        stagnation_factor = min(n_alerts * 0.5, 1.0)
        regression_factor = min(n_stagnation_alerts * 0.2, 0.5)
        
        risk = (0.40 * critical_gap_factor +
                0.25 * coverage_factor +
                0.20 * stagnation_factor +
                0.15 * regression_factor)
        
        if risk >= 0.75:
            level = "CRITIQUE"
        elif risk >= 0.50:
            level = "ELEVE"
        elif risk >= 0.25:
            level = "MODERE"
        else:
            level = "FAIBLE"
        
        results.append({
            "teacher_id": t["teacher_id"],
            "risk_score": round(risk, 4),
            "risk_level": level,
            "avg_gap": round(avg_gap, 2),
            "n_critical_gaps": critical_count,
            "n_active_alerts": n_alerts,
        })
    return results


def derive_recommendations(teachers: list[dict], gaps: list[dict], risk_scores: list[dict]) -> list[dict]:
    """Derive les recommandations de formation pour chaque enseignant."""
    recommendations = []
    for t in teachers:
        t_gaps = [g for g in gaps if g["teacher_id"] == t["teacher_id"] and g["gap_value"] > 0]
        if not t_gaps:
            continue
        
        for gap in sorted(t_gaps, key=lambda x: x["gap_value"], reverse=True)[:2]:
            matching_formations = [f for f in FORMATIONS if gap["competence_code"] in f["competences"]]
            if matching_formations:
                f = random.choice(matching_formations)
                recommendations.append({
                    "recommendation_id": f"R-{gap['competence_code']}-{t['teacher_id']}",
                    "teacher_id": t["teacher_id"],
                    "training_code": f["code"],
                    "training_title": f["titre"],
                    "target_competency_code": gap["competence_code"],
                    "relevance_score": round(gap["gap_value"] * 0.25 + random.uniform(0.1, 0.3), 4),
                    "expected_risk_reduction": round(gap["gap_value"] * 0.15, 4),
                    "explanation_fr": f"Recommande car gap {gap['gap_value']} sur {gap['competence_nom']} et stagnation >= 90 jours",
                    "priority": "HAUTE" if gap["gap_value"] >= 3 else "MODEREE",
                })
    return recommendations


def aggregate_kpis(teachers: list[dict], risk_scores: list[dict], alerts: list[dict], gaps: list[dict], recommendations: list[dict]) -> dict:
    """Calcule les KPI du dashboard depuis les donnees."""
    risk_df = pd.DataFrame(risk_scores)
    n_teachers = len(teachers)
    n_at_risk = len(risk_df[risk_df["risk_score"] >= 0.5])
    n_critical = len(risk_df[risk_df["risk_score"] >= 0.75])
    avg_risk = round(risk_df["risk_score"].mean(), 4)
    coverage = round(len([g for g in gaps if g["gap_value"] == 0]) / len(gaps) * 100, 2) if gaps else 100
    
    return {
        "total_teachers": n_teachers,
        "enseignants_a_risque": n_at_risk,
        "enseignants_critiques": n_critical,
        "score_risque_moyen": avg_risk,
        "taux_couverture_global": coverage,
        "nb_gaps_critiques": len([g for g in gaps if g["is_critical_gap"]]),
        "nb_alertes_nouvelles": len([a for a in alerts if a["status"] == "NOUVELLE"]),
        "nb_recommandations": len(recommendations),
        "generated_at": datetime.now().isoformat(),
    }


def main():
    print("[1] Generation du dataset maître D2F...")
    
    teachers = generate_teachers(30)
    print(f"  [OK] {len(teachers)} enseignants genere")
    
    gaps = generate_teacher_competencies(teachers, COMPETENCES)
    print(f"  [OK] {len(gaps)} compétences enseignees")
    
    alerts = generate_alerts(teachers, gaps)
    print(f"  [OK] {len(alerts)} alertes generees")
    
    risk_scores = compute_risk_scores(teachers, gaps, alerts)
    print(f"  [OK] Scores de risque calcules")
    
    recommendations = derive_recommendations(teachers, gaps, risk_scores)
    print(f"  [OK] {len(recommendations)} recommandations derivees")
    
    kpis = aggregate_kpis(teachers, risk_scores, alerts, gaps, recommendations)
    print(f"  [OK] KPI dashboard calcules")
    
    pd.DataFrame(teachers).to_csv(CLEAN_DIR / "teachers.csv", index=False)
    pd.DataFrame(gaps).to_csv(CLEAN_DIR / "teacher_competencies.csv", index=False)
    pd.DataFrame(alerts).to_csv(CLEAN_DIR / "alerts.csv", index=False)
    pd.DataFrame(risk_scores).to_csv(CLEAN_DIR / "risk_scores.csv", index=False)
    pd.DataFrame(recommendations).to_csv(CLEAN_DIR / "recommendations.csv", index=False)
    
    with open(EXPORTS_DIR / "dashboard_kpis.json", "w") as f:
        json.dump(kpis, f, indent=2)
    
    pd.DataFrame(DEPARTEMENTS).to_csv(RAW_DIR / "departments.csv", index=False)
    pd.DataFrame(COMPETENCES).to_csv(RAW_DIR / "competences.csv", index=False)
    pd.DataFrame(FORMATIONS).to_csv(RAW_DIR / "formations.csv", index=False)
    
    print("\n[OK] Dataset maître genere avec succes!")
    print(f"   Fichiers crees dans {CLEAN_DIR} et {EXPORTS_DIR}")
    return teachers, gaps, alerts, risk_scores, recommendations, kpis


if __name__ == "__main__":
    main()