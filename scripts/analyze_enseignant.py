#!/usr/bin/env python3
"""
Analyse détaillée d'un enseignant : compétences, gaps, recommandations.
Usage : python scripts/analyze_enseignant.py E00003
        python scripts/analyze_enseignant.py --db postgresql://... E00001
"""

import sys
import json
from datetime import date, timedelta
from typing import Any

def mock_data_enseignant(enseignant_id: str) -> dict[str, Any]:
    """Données mockées pour un enseignant type (E00003 = Khaled, réseau/sécurité)."""
    return {
        "enseignant_id": "E00003",
        "nom": "Bouaziz",
        "prenom": "Khaled",
        "email": "khaled.bouaziz@esprit.tn",
        "dept_id": "D2",
        "up_id": "UP03",
        "derniere_formation_date": date.today() - timedelta(days=400),
        "nombre_mois_depuis_derniere_formation": 13,
        "competences": [
            {"competence_id": 6, "competence_nom": "Cybersecurite", "domaine_id": 3, "niveau_actuel": 5, "niveau_requis": 4},
            {"competence_id": 7, "competence_nom": "Reseaux TCP/IP", "domaine_id": 3, "niveau_actuel": 5, "niveau_requis": 4},
            {"competence_id": 2, "competence_nom": "Programmation Java", "domaine_id": 1, "niveau_actuel": 3, "niveau_requis": 4},
            {"competence_id": 21, "competence_nom": "Z-Transform", "domaine_id": 7, "niveau_actuel": 4, "niveau_requis": 4},
            {"competence_id": 22, "competence_nom": "FFT Implementation", "domaine_id": 6, "niveau_actuel": 3, "niveau_requis": 4},
        ],
        "skill_gaps": [
            {"competence_id": 2, "competence_nom": "Programmation Java", "domaine_nom": "Informatique",
             "niveau_actuel": 3, "niveau_requis": 4, "gap_score": 0.25, "impact_score": 0.30, "urgence_score": 0.20,
             "niveau_urgence": "FAIBLE", "mois_stagnation": 8, "en_regression": False},
            {"competence_id": 22, "competence_nom": "FFT Implementation", "domaine_nom": "Electronique",
             "niveau_actuel": 3, "niveau_requis": 4, "gap_score": 0.20, "impact_score": 0.25, "urgence_score": 0.15,
             "niveau_urgence": "FAIBLE", "mois_stagnation": 10, "en_regression": False},
        ],
        "recommendations": [
            {"formation_id": 1, "titre": "Atelier Spring Boot 3 & JPA Avancé",
             "competence_id": 2, "score_global": 0.84, "statut": "PROPOSEE"},
            {"formation_id": 3, "titre": "Introduction au Machine Learning avec Python",
             "competence_id": 8, "score_global": 0.75, "statut": "PROPOSEE"},
        ],
        "formations_recentes": [
            {"titre": "Securite Informatique Avancee", "date_fin": "2025-11-30", "etat": "PLANIFIE"},
            {"titre": "Reseaux Avances & Securite", "date_fin": "2025-11-15", "etat": "PLANIFIE"},
        ],
        "besoins_exprimes": [
            {"theme": "Cloud Computing", "priorite": "HAUTE", "approuve": False},
            {"theme": "Automatisation", "priorite": "MOYENNE", "approuve": True},
        ],
    }


def analyse_enseignant(ens: dict[str, Any]) -> dict[str, Any]:
    """Retourne l'analyse structurée d'un enseignant."""
    mois_inactif = ens["nombre_mois_depuis_derniere_formation"] or 0
    return {
        "profil": {
            "enseignant_id": ens["enseignant_id"],
            "nom_complet": f"{ens['prenom']} {ens['nom']}",
            "email": ens["email"],
            "departement_id": ens["dept_id"],
            "up_id": ens["up_id"],
        },
        "activite_formation": {
            "derniere_formation": str(ens["derniere_formation_date"]) if ens["derniere_formation_date"] else None,
            "mois_sans_formation": mois_inactif,
            "niveau_risque": "CRITIQUE" if mois_inactif > 12 else ("ELEVE" if mois_inactif >= 6 else ("MODERE" if mois_inactif >= 3 else "FAIBLE")),
        },
        "competences": {
            "total": len(ens["competences"]),
            "par_domaine": {},
        },
        "skill_gaps": {
            "total": len(ens["skill_gaps"]),
            "critiques": [g for g in ens["skill_gaps"] if g["niveau_urgence"] == "CRITIQUE"],
            "en_attente": [g for g in ens["skill_gaps"] if g["niveau_urgence"] in ("FAIBLE", "MODERE")],
        },
        "recommendations": {
            "total": len(ens["recommendations"]),
            "par_competence": {},
            "priorites": sorted(ens["recommendations"], key=lambda r: r["score_global"], reverse=True)[:3],
        },
        "besoins_non_couvrirs": [b for b in ens["besoins_exprimes"] if not b["approuve"]],
    }


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/analyze_enseignant.py <enseignant_id>")
        print("       python scripts/analyze_enseignant.py --mock E00003")
        sys.exit(1)
    
    if "--mock" in args:
        eid = args[args.index("--mock") + 1] if args.index("--mock") + 1 < len(args) else "E00003"
    else:
        eid = args[0]
    
    ens = mock_data_enseignant(eid)
    analysis = analyse_enseignant(ens)
    
    print(json.dumps(analysis, indent=2, default=str))


if __name__ == "__main__":
    main()