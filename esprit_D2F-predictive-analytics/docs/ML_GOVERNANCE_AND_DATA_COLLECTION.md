# Gouvernance ML et collecte de données

## Modèle gap_predictor — DÉPRECIÉ

Le modèle `gap_predictor` contient une **fuite de cible** (target leakage).
Les gaps actuels sont calculés de manière déterministe à partir des données
d'affectation et du référentiel.

**Ne pas utiliser** le modèle pour prédire les gaps actuels.

## Utilisation ML autorisée

Le ML peut être utilisé uniquement pour prédire des **événements futurs** à
condition d'avoir des **données longitudinales datées**.

Cibles futures possibles:
- Probabilité de complétion d'une formation
- Probabilité de satisfaction d'un besoin après formation
- Probabilité d'apparition d'un besoin dans les 90 jours
- Probabilité de baisse de couverture d'un savoir stratégique
- Efficacité future d'une formation pour un type de profil
- Risque de non-participation à une session

## Prérequis avant production ML

1. Snapshots historiques datés
2. Labels réellement futurs
3. Séparation temporelle train/validation/test
4. Baseline métier
5. Audit de fuite de cible
6. Contrôle de variance
7. Version du dataset
8. Version du modèle
9. Version scikit-learn compatible
10. Métriques documentées
11. Explicabilité
12. Monitoring de dérive

## Si les prérequis ne sont pas satisfaits

Retourner:
```json
{
  "ml_status": "DATA_COLLECTION_REQUIRED",
  "message": "Les données longitudinales sont insuffisantes pour produire une prévision ML fiable."
}
```