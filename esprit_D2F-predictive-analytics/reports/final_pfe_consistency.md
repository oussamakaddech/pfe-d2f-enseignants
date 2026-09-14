# Cohérence finale PFE — décisions

## Matrice de décision

| Composant | Statut | Justification |
|---|---|---|
| GAP v1.0.0 (actif) | ACTIVE | Serving PRODUCTION_ML vérifié en réel ; metrics reproduites ; dataset réel 107 lignes (100% réel) |
| GAP v1.1.0 (candidat) | NOT_PROMOTED | Données en nombre insuffisant ; comparaison commune sur 34 lignes de test non concluante (IC95 chevauchant) |
| RISQUE — ML | NOT_AVAILABLE | `risk_classifier.joblib` absent ; métadonnées RF 45 échantillons / macro_f1 0.2847 → non déployable |
| RISQUE — heuristique | KEEP_AS_BASELINE | Formule à base de règles, poids {0.50,0.12,0.40}, caps documentés |
| RANKING | KEEP_AS_BASELINE | 0.70/0.20/0.10 ; aucun label réel de pertinence → Precision@K/NDCG N/A |
| PIPELINE | VALIDATED | 80/20 + 3-way temporels, anti-fuite, seed 42, sidecar SHA-256, régénération reproductible |
| SERVING | PRODUCTION_ML | endpoints gaps/risk/alerts OK en réel (JWT HS512 via gateway) ; health/ready 200 |
| DASHBOARD | DEFECT | `/dashboard?scope=GLOBAL` → 500 (`AttributeError: 'list' object has no attribute 'competence_id'`, `build_dashboards.py:83`) — bug de câblage, hors périmètre ML |
| GLOBAL | **VALIDÉ SOUS RÉSERVES** | Réserves : échantillon 107/172 lignes, IC95 larges, dashboard en défaut, `dataset_hash` v1.0.0 à compléter, écart de hash CRLF/LF à documenter, validation QA DSI non réalisée |

## Limites assumées

- Taille du corpus : 107 (v1.0.0) / 172 (v1.1.0) lignes — pouvoir statistique faible.
- Les 122 lignes datées du 2026-07-22 rendent la garantie temporelle intra-jour faible (tri de fichier).
- Le hash de dataset est dépendant de la plateforme (CRLF vs LF) : même contenu → hash différent Windows/Linux.
- `dataset_hash` de l'entrée ACTIVE vide dans le registre (valeur recomputée disponible).
- Aucune donnée synthétique, aucune duplication, aucune ligne supprimée (nettoyage : 172 → 172).
- Aucun label réel pour le ranking ; le risque ML n'a pas d'artefact.

## Recommandation

Ne PAS promouvoir v1.1.0. Conserver v1.0.0 comme modèle ACTIVE. Compléter le registre (`dataset_hash`), corriger le dashboard, et revalider après QA DSI.

