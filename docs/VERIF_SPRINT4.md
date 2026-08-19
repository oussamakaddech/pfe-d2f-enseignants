# Vérification Sprint 4 — Analyse prédictive (rapport PFE)

Méthode : lecture directe des sources `esprit_D2F-predictive-analytics/app/` + `pipelines/` + `tests/` contre le texte du chapitre 6 du rapport.

## Confirmé (références exactes)

| Revendication | Code (fichier:ligne) | Remarque |
|---|---|---|
| Architecture en couches (routes, application, domaine, infrastructure, core) | `main.py`, `api/v1/*.py`, `application/use_cases/*.py`, `domain/services/*.py`, `infrastructure/ml/*.py` | Structure conforme |
| Gap : `max(0, ℓrequis − ℓactuel)` normalisé [0,1] par max_level=4 | `domain/services/gap_calculator.py:4-9` | `raw_gap` + `gap_score` |
| Sévérité : seuils configurables (critique/haute/moyenne) | `domain/services/gap_calculator.py:12-19` | Passés via `seuil_gap_*` (`core/config`) |
| Repli heuristique `HEURISTIC_FALLBACK` si ML indisponible | `application/use_cases/compute_gaps.py:20-44` | `mode="HEURISTIC_FALLBACK"` dans réponse |
| Réponse expose `mode`, `model_version` | `core/envelope.py` (via `ok`/`ok_page`) + `api/v1/gaps.py:37-47` | Confirmé dans le payload |
| Risk : 6 facteurs bornés, pondérés externes, ordonnés par contribution | `domain/services/risk_calculator.py:55-68` | `weights` dict passé ; facteurs triés `sorted(..., reverse=True)` |
| Random Forest (`random_forest_classifier`) évalué et compensé par règle métier (`≥3 gaps critiques → CRITICAL`) | `infrastructure/ml/predictor.py:613-680` + `data/models/risk_training_metadata.json:2` | Commentaire détaillé : F1=0 sur CRITICAL (1 échantillon) |
| Pipeline ML : `gap_predictor_temporal` désactivé (audit, corpus 98% synthétique > 50%) | `infrastructure/ml/predictor.py:82-86`, `ML_SYNTHETIC_TOLERANCE_PCT: 50.0` (`:40`) | `_gap_model_enabled = False` ; `return None` → fallback |
| Anti-fuite : `required_level` exclu des features X, lu après prédiction | `infrastructure/ml/predictor.py:8-10`, `_build_feature_matrix` | Features temporelles : `current_level_t3..t` ; `required_by_comp` séparé |
| Intégrité artefact : SHA-256/HMAC (`ArtifactIntegrityError`) | `infrastructure/ml/artifact_integrity.py` + `load_with_integrity_check` (`predictor.py:204`) | Confirmé |
| Endpoints d’analyse / gaps / risque | `api/v1/gaps.py`, `api/v1/risk.py`, `application/use_cases/analyze_teacher.py` | Routes existantes |
| Contrôle périmètre (CUP/chef département/enseignant) | `core/scope.py` (`enforce_teacher_access`), `domain/services/teacher_access.py`, `application/use_cases/compute_gaps.py:52-63` (`scoped_competencies`) | Confirmé |
| Besoin individuel : `gap_score ≥ threshold` | `domain/services/need_detector.py:15-35` (`detect_individual_needs`) | Seuil paramètre |
| Besoin collectif : `count < min_teachers` (paramètre passé, probablement 30%) | `domain/services/need_detector.py:38-75` (`detect_collective_needs`) | `min_teachers` passé au niveau appelant |

## Écart / divergence

| Revendication du rapport | Réalité du code | Verdict |
|---|---|---|
| Recommandation : formule `0,45·couverture + 0,25·sévérité + 0,15·fraîcheur + 0,10·complétion + 0,05·proximité` | `domain/services/ranking_service.py:8-10` : `WEIGHT_CONTENT=0.70`, `WEIGHT_QUALITY=0.20`, `WEIGHT_RECENCY=0.10` (contenu/qualité/fraîcheur) | ❌ formule et poids ne correspondent pas |
| Score de risque : 5 facteurs (`inactivité, stagnation, écarts critiques, déclin évaluations, besoins non traités`) | `risk_calculator.py` : 6 sous-scores (`stagnation`, `decline`, `attendance`, `low_eval`, `repeated_need`, `low_engagement`) | ❌ 6 facteurs, pas 5 |
| Endpoints API nommés `POST /api/v1/predictions/gaps` et `GET /api/v1/risks/{id}` | Routes réelles : `GET /teachers/{teacher_id}/gaps`, `GET /teachers/{teacher_id}/risk` | ❌ noms de routes différents |
| « Un modèle de pertinence a été testé puis rejeté » (`relevance_model`) | `predictor.py:722-767` (`relevance_available`) : le modèle `relevance_model.joblib` est chargé si présent (`load_with_integrity_check`) ; le code ne le rejette pas automatiquement — il retourne `None` si absent, sinon le score ML est appliqué. | ⚠️ le modèle existe dans le registre (`relevance_artifact_path`) et peut être chargé ; le rejet mentionné dans le rapport ne correspond pas au code (le modèle est conservé comme option) |
| 82 tests verts | Impossible de vérifier directement (`pytest` non lancé dans cette session) ; les fichiers `tests/unit/test_use_cases.py`, `tests/unit/test_risk_calculator.py`, etc. existent en grand nombre. | ⏸ non vérifié par exécution |

## Notes méthodologiques
- Le modèle `gap_predictor_temporal` est explicitement désactivé (`_gap_model_enabled = False`) et le service répond `HEURISTIC_FALLBACK`. Le texte du rapport qui décrit son utilisation doit être lu au conditionnel (audit en cours) : le modèle est présent dans le registre (`data/models/`) mais non activé en production (`settings.ml_enabled` + audit synthétique).
- Les réponses API exposent bien `model_mode` (`ML` ou `HEURISTIC_FALLBACK`) et `model_version` via `ok()` / `ok_page()` (`core/envelope.py`).
- Le pipeline de formation (`training_corpus.csv`) et le split temporel sont définis dans `pipelines/generate_training_corpus.py` et `build_features.py` (graine 42, split chronologique) — cohérent avec le texte.
