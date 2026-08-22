# Issues d'audit — Analyse prédictive & qualité (2026-08-22)

Audit réalisé sur la branche `oussama` (commit `acd3196a`). Les 12 issues ci-dessous
sont créées sur GitHub : https://github.com/oussamakaddech/pfe-d2f-enseignants/issues

| # | Titre | Priorité | Zone | Lien |
|---|-------|----------|------|------|
| 6 | Cible gap_next_3m extrapolée — jamais observée réellement | critical | ml | #6 |
| 7 | Statut NO_OBSERVATION manquant — gap CRITIQUE induit sans observation | high | ml/backend | #7 |
| 8 | Calibration absente des scores (risque et probabilité de réussite) | medium | ml | #8 |
| 9 | Harmoniser scikit-learn entraînement/serving | medium | ml/ops | #9 |
| 10 | Monitoring drift actif — PSI périodique + taux de fallback exposé | medium | ml/ops | #10 |
| 11 | Matrice de traçabilité US↔tests formelle absente | medium | backend/docs | #11 |
| 12 | Exclusion formations suivies/expirées — test dédié absent | medium | ml | #12 |
| 13 | diagram-logique.png absent — placeholder § Architecture logique | low | docs | #13 |
| 14 | Logo_ESPRIT_Ariana.jpg absent — page de garde en repli texte | low | docs | #14 |
| 15 | Fichier parasite « nul » dans figures/ (nom réservé Windows) | low | ops | #15 |
| 16 | Caractères '?' hérités d'un ancien encodage dans des légendes LaTeX | low | docs | #16 |
| 17 | docker compose sensible au répertoire d'exécution (.env écrasé) | medium | ops | #17 |

## Contexte

Les corrections suivantes ont déjà été appliquées et poussées sur `oussama` :
`2adbfc20` (étiquetage honnête des moteurs, tendance réelle V10, filtres, responsive)
et `acd3196a` (réentraînement v1.0.0 sur corpus aligné serving — couverture ML 35/37).

État du serving vérifié : `PRODUCTION_ML`, drift false, fallback motivé pour les
2 enseignants hors plages.
