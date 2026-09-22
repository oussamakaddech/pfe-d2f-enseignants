# Rapport d'audit — Écran « Analyse prédictive — Enseignant » (Karim Bougherara, ENS014)

Date : 2026-08-19 · Branche : `oussama` · Périmètre : facteur « Gaps critiques », DTO des facteurs,
libellés, badge du modèle.

## 1. Contexte de l'audit

L'écran « Analyse prédictive — Enseignant » pour **Karim Bougherara (ENS014, Département Génie
Civil — DEPT_GC / UP_GC)** affichait un facteur « Gaps critiques » à **valeur brute 5** alors que
l'onglet Gaps et le scope-analysis ne montrent que **3 gaps** (GC.MATERIAUX, GC.STRUCT, GC.TOPO,
tous CRITIQUE gap 1.0). Le badge du modèle affichait « ML actif » sans provenance vérifiable
(mode/version en réalité codés en dur par le backend).

## 2. Signification confirmée de la valeur brute 5 (racine)

La valeur 5 n'était **ni** le périmètre enseignant (3 gaps), **ni** le périmètre départemental
(3 gaps). C'était un **artefact hors périmètre** :

- `_predict_risk` → `_predict_gaps` (modèle ML des gaps) prédit sur **toutes les compétences où
  l'enseignant a des niveaux déclarés**, sans filtre de périmètre.
- ENS014 déclare 14 savoirs sur **6 compétences hors GC** (AI.ML ×1, DEV.BACK ×5, DEV.FRONT ×3,
  DEV.QA ×2, RES.INFRA ×1, RES.SEC ×2 ; `max_niveau` = 0 partout) → le modèle ML produit
  **5 gaps CRITIQUE + 1 HAUTE, moyenne 0.788**.
- Le snapshot persisté (`analyse.skill_gaps`) contient exactement les **3 gaps GC** ; le département
  GC compte exactement **3 compétences** et ENS014 n'a aucun savoir déclaré sur elles.

Le score 93.52 (CRITICAL) mélangeait donc des gaps de compétences hors de son périmètre
(Génie Logiciel / Réseaux / IA) avec la moyenne de profondeur du périmètre — score incohérent
avec l'onglet Gaps.

### JSON backend avant correction (ENS014, API réelle)

```json
{
  "risk_score": 93.52,
  "risk_level": "CRITICAL",
  "factors": [
    { "feature": "critical_gaps", "label": "Gaps critiques", "raw_value": 5.0,  "contribution_percent": 50.0 },
    { "feature": "high_gaps",     "label": "Gaps haute priorité", "raw_value": 1.0,  "contribution_percent": 12.0 },
    { "feature": "avg_gap_score", "label": "Profondeur moyenne des gaps", "raw_value": 0.788, "contribution_percent": 31.52 }
  ],
  "meta": { "model_mode": "ML", "model_version": "2026-08-19T04:59:51.787114" }
}
```

Le `model_version` était en réalité le `trained_at` (timestamp) et `model_mode` était la chaîne
« ML » codée en dur dans `compute_risk.execute` — d'où un badge vague et non vérifiable.

## 3. Correction backend

`esprit_D2F-predictive-analytics/app/infrastructure/ml/predictor.py` :

- **Scoping du risque au périmètre** : `_predict_risk` et `_predict_risk_ml` filtrent maintenant
  les gaps sur le périmètre de l'enseignant via `_scoped_competence_ids` (département / UP /
  spécialité, requêtes `formation.enseignants` + `competence.competences` JOIN `domaines`).
  Convention identique à `compute_gaps` : **périmètre global uniquement si aucun domaine ne
  correspond ou pas de rattachement**. Si aucune prédiction ML ne tombe dans le périmètre, on
  retombe sur le **snapshot persisté** (déjà scopé) pour ne pas afficher un faux zéro.
- `rule_risk_from_gaps(teacher_id, gaps, scope="TEACHER")` : périmètre documenté sur chaque
  facteur ; libellés alignés sur les enums backend (`Severity.HIGH = "HAUTE"`) :
  - `critical_gaps` → « Gaps critiques » (TEACHER) / **« Gaps critiques du périmètre »** (DEPARTMENT) ;
  - `high_gaps` → **« Gaps de haute urgence »** ;
  - `avg_gap_score` → « Profondeur moyenne des gaps » (inchangé).
- `RiskFactor` (domaine) + `RiskFactorOut` (schéma Pydantic) : **champ `scope`** (`TEACHER` /
  `DEPARTMENT`), exposé dans le DTO.
- **Méta du modèle réelle** : `compute_risk.execute` renvoie désormais 4 valeurs depuis
  `status()` — `model_mode` réel (`PRODUCTION_ML`), `model_version` du registre (`v1.0.0`),
  et `model_name` = **`artifact_name`** (nouvelle clé de `status()` = `gap_predictor_temporal`,
  sans changer la sémantique existante de `model_name`). `risk.py` / `analysis.py` exposent
  `model_name` dans la méta. Plus aucun mode ni version codé en dur.
- **Correctif de cohérence `compute_gaps`** : quand le serving ML échoue (features invalides)
  ou que le modèle est indisponible, les gaps renvoyés sont heuristiques — le use case exposait
  encore `model_mode` du statut (PRODUCTION_ML) avec une version `None`. Il expose désormais
  **`HEURISTIC_FALLBACK`** (jamais un mode ML mensonger), même si le modèle est chargé.
  Vérifié sur API réelle : `/analysis` ENS014/ENS024/ENS036/ENS007 = `HEURISTIC_FALLBACK`
  (gaps réellement heuristiques scopés), tandis que `/risk` documente le statut du modèle
  (`PRODUCTION_ML · v1.0.0 · gap_predictor_temporal`) et `/gaps` sa provenance
  (107 lignes, 100 % réelles).

### JSON backend après correction (ENS014, API réelle)

```json
{
  "risk_score": 90.0,
  "risk_level": "CRITICAL",
  "factors": [
    { "feature": "critical_gaps", "label": "Gaps critiques du périmètre", "raw_value": 3.0, "contribution_percent": 50.0, "scope": "DEPARTMENT" },
    { "feature": "high_gaps",     "label": "Gaps de haute urgence",       "raw_value": 0.0, "contribution_percent": 0.0,  "scope": "DEPARTMENT" },
    { "feature": "avg_gap_score", "label": "Profondeur moyenne des gaps", "raw_value": 1.0, "contribution_percent": 40.0, "scope": "DEPARTMENT" }
  ],
  "meta": { "model_mode": "PRODUCTION_ML", "model_version": "v1.0.0", "model_name": "gap_predictor_temporal" }
}
```

Score = `0.5 + 0 + 0.4 = 0.90` → **90.00 CRITICAL**, strictement cohérent avec les 3 gaps
CRITIQUE affichés dans l'onglet Gaps. **Périmètre confirmé du facteur : `DEPARTMENT`
(« Département Génie Civil »)** — corroboré par le scope-analysis (3/15 compétences,
GC.STRUCT / GC.MATERIAUX / GC.TOPO).

## 4. Corrections frontend

`esprit_D2F-webapp` :

- `analyticsFeature.ts` : `RiskScore.model_name`, `RiskFactor.scope` (types DTO).
- `analyticsApi.ts` : `BackendRiskFactor.scope`, propagation de `meta.model_name`, `scope` des
  facteurs ; fallback `high_gaps` → « Gaps de haute urgence » (le libellé backend reste prioritaire).
- `ModelBadge.tsx` : props `modelName` ; badge « ML actif » + **artefact + version affichés depuis
  l'API** (jamais codés en dur), tooltip avec le mode réel (`Mode : PRODUCTION_ML`, artefact, version).
- `AnalyticsTeacherPage.tsx` : `modelName` passé au badge du hero et au panneau « Modèles » ;
  lignes « Artefact du modèle » et « Version de l'artefact » alimentées par l'API.
- `RiskFactorRow.tsx` : badge « périmètre : département / enseignant » sur chaque facteur.
- Confirmation : la colonne GapsTable n'affiche **aucun** niveau actuel/requis (non-régression
  vérifiée par test) ; les recommandations affichent « Pertinence : X/100 » (pas « réussite »).

## 5. Non-régression (API réelle après redéploiement)

| Enseignant | Avant | Après | Gaps critiques (scope) | Statut |
|---|---|---|---|---|
| ENS014 Karim Bougherara | 93.52 | **90.00** | 3 (DEPARTMENT) | corrigé, cohérent gaps |
| ENS024 Karim2 | 95.33 | **95.33** | 2 (DEPARTMENT) | inchangé |
| ENS036 Marwa | 96.11 | **96.11** | 12 (TEACHER) | inchangé |
| ENS007 | 97.06 | **97.06** | 14 (TEACHER) | inchangé |

## 6. Tests exécutés

Backend (`python -m pytest tests -q`) : **258 passed** (252 existants + 6 nouveaux) :

- `test_risk_normalization.py` : labels par périmètre (TEACHER/DEPARTMENT), `scope` dans le DTO,
  valeur brute 5 conservée à 5 pour un scénario départemental (aucune correction arbitraire),
  contributions bornées ≤ 100 %, somme des contributions = score.
- `test_ml_predictor_paths.py` : **régression ENS014** — savoirs hors périmètre GC → gaps filtrés
  à vide → snapshot persisté (3 gaps CRITIQUE) → facteur = **3, jamais 5**, score 90.0 ; périmètre
  TEACHER sans rattachement ; filtrage partiel quand des prédictions tombent dans le périmètre.
- `test_use_cases.py` / `fakes.py` : 4-tuple `(profile, mode, version, name)` ; `compute_gaps`
  n'expose jamais un mode ML quand le serving échoue.

Frontend (`npx vitest run`) : **1421 passed** (193 fichiers ; 6 skipped préexistants) —
`analyticsApi.test.ts` (model_name + scope + libellés backend prioritaires), `modelBadge.test.tsx`
(artefact + version depuis les props, jamais codés en dur), `analyticsTeacherPage.test.tsx`
(badge hero + panneau Modèles, lignes artefact/version), `riskFactorRow.test.tsx` (badge
périmètre), `gapsTable.test.tsx` (absence de niveaux). `npx tsc --noEmit` OK ; `eslint` OK ;
`ruff` ramené au baseline préexistant (16 erreurs F401 historiques, aucune nouvelle).

## 7. Fichiers modifiés

Backend (esprit_D2F-predictive-analytics) :

- `app/infrastructure/ml/predictor.py` (scoping risque, `_scoped_competence_ids`,
  `rule_risk_from_gaps(scope)`, labels, `scope` des facteurs, `artifact_name` dans `status()`)
- `app/application/use_cases/compute_risk.py` (4-tuple mode/version/nom réels)
- `app/application/use_cases/compute_gaps.py` (mode honnête HEURISTIC_FALLBACK quand le serving échoue)
- `app/api/v1/risk.py`, `app/api/v1/analysis.py` (méta `model_name`)
- `app/domain/entities/risk_profile.py` (RiskFactor.scope + to_dict)
- `app/domain/services/risk_calculator.py` (scope TEACHER par défaut)
- `app/schemas/analytics.py` (RiskFactorOut.scope)
- Tests : `tests/unit/test_risk_normalization.py`, `tests/unit/test_ml_predictor_paths.py`,
  `tests/unit/test_ml_predictor_core.py` (`scalar_one_or_none` du helper scripté),
  `tests/unit/test_use_cases.py`, `tests/fakes.py`

Frontend (esprit_D2F-webapp) :

- `src/models/analyse/analyticsFeature.ts`, `src/services/analyse/analyticsApi.ts`
- `src/components/analytics/ModelBadge.tsx`, `src/components/analytics/RiskFactorRow.tsx`
- `src/pages/analyse/AnalyticsTeacherPage.tsx`
- Tests : `src/services/analyse/analyticsApi.test.ts`, `src/components/analytics/__tests__/modelBadge.test.tsx`,
  `src/components/analytics/__tests__/riskFactorRow.test.tsx`, `src/pages/analyse/__tests__/analyticsTeacherPage.test.tsx`

## 8. Conclusion

La valeur brute 5 était un artefact du calcul ML non scopé (compétences GL/Réseaux/IA hors du
périmètre GC). Le score est désormais calculé sur le périmètre réel (3 gaps, « Département Génie
Civil »), le DTO expose le périmètre de chaque facteur, les libellés sont alignés sur les enums
backend, et le badge du modèle affiche le mode, l'artefact et la version réels issus du registre —
sans aucune valeur codée en dur, sans aucune correction arbitraire côté frontend.