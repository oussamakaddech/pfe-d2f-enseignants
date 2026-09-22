# Décision finale — validation ML du service

**Décision finale : VALIDÉ**

| Composant | Statut |
|---|---|
| GAP_production | ACTIVE / PRODUCTION_ML |
| GAP_v110 | NOT_PROMOTED |
| BEST_DEMO_MODEL | mlp |
| RISQUE_ML | NOT_AVAILABLE |
| RISQUE_heuristique | KEEP_AS_BASELINE |
| RANKING | KEEP_AS_BASELINE |
| DASHBOARD_scope_GLOBAL | FIXED (200, tests OK) |
| PIPELINE | VALIDATED |
| SERVING | PRODUCTION_ML |
| DOCKER | L'image Docker se construit, démarre, expose le modèle ML en PRODUCTION_ML et protège ses routes par JWT. |
| TESTS | 315 passed / 0 failed |
| DATASET_PRODUCTION | VALIDÉ |
| DATASET_DEMO | VALIDÉ |
| FEATURES | VALIDÉ (29, anti-fuite, source_time<=ref_month) |

## Réserves
- Enrichir le corpus production (107/172 lignes → IC95 larges).
- Réaliser la validation QA DSI en environnement dédié (recette, runbook).
- Ne jamais présenter les métriques du pipeline démo comme des performances ESPRIT (DEMO_ML).