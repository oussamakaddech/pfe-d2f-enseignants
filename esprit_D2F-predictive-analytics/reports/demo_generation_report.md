# Rapport de génération — dataset synthétique démo

- **Lignes** : 1000
- **Enseignants synthétiques** : 100
- **Compétences** : 13
- **Périodes** : 18 mois
- **Seed** : 42
- **Hash canonique** : `f56dd8c49005734a7df33b66a4777528164ede06759745c34b7fe64a30d0e4ec`
- **Origine** : SYNTHETIC (is_synthetic=true, institutional_verified=false)

## Nettoyage

- Avant : 1013 → après : 1000
- Corrigées : 25 ; imputées : 12
- Supprimées : 8 ; quarantaine : 5
- Raisons : {"date_invalide": 2, "valeur_non_numerique": 3, "conversion_types": 0, "hors_plage_gap_next_3m": 4, "hors_plage_attendance_rate": 9, "hors_plage_evaluation_score": 12, "manquant_evaluation_score": 12, "doublon_exact": 8}

Voir `reports/demo_generation_spec.md` pour la formule complète.
