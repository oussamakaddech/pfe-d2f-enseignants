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

## Issues par microservice (ajout du 2026-08-22)

| # | Service | Titre | Priorité | Lien |
|---|---------|-------|----------|------|
| 18 | analyse | Couverture JaCoCo la plus faible du backend (89,0 %) | medium | #18 |
| 19 | authentification | Mot de passe admin par défaut connu + comptes seed | high | #19 |
| 20 | common-security | Bibliothèque de sécurité quasi non testée (1 classe / 10 tests) | high | #20 |
| 21 | api-gateway | Suite mince sur le point d'entrée unique + mapping de routes non documenté | medium | #21 |
| 22 | notification | Intégration événementielle de l'analyse prédictive non définie | medium | #22 |
| 23 | rice | Dépendances NLP désactivées en test — risque d'écart prod/test | low | #23 |
| 24 | formation | Module le plus volumineux — temps de CI à surveiller | low | #24 |
| 25 | webapp | Aucun test E2E automatisé des parcours critiques | medium | #25 |
| 26 | predictive-analytics | Garde CI anti-dérive de schéma train/serving absente | high | #26 |

## Contexte

Les corrections suivantes ont déjà été appliquées et poussées sur `oussama` :
`2adbfc20` (étiquetage honnête des moteurs, tendance réelle V10, filtres, responsive)
et `acd3196a` (réentraînement v1.0.0 sur corpus aligné serving — couverture ML 35/37).

État du serving vérifié : `PRODUCTION_ML`, drift false, fallback motivé pour les
2 enseignants hors plages.
