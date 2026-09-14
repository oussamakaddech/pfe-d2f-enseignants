# Rapport — Normalisation du score de risque et périmètre explicite

Date : 2026-08-19 — Branche `oussama` — Suite à l'audit du score de risque.

## 1. Constat de l'audit

La formule de contribution était **non bornée** :

```
contribution_i = poids_i × valeur brute_i
score_brut      = min(1.0, Σ_i contribution_i)
```

Le nombre de gaps critiques entrait **brut** (non normalisé) dans le calcul.
Exemple réel ENS036 (Marwa BEN ROMDHANE, Technologie Web) :

| Facteur | poids | valeur brute | contribution (avant) |
|---|---|---|---|
| Gaps critiques | 0.50 | 12 | **3.0 → 300 %** |
| Gaps haute priorité | 0.12 | 2 | 0.6 → 60 % |
| Profondeur moyenne des gaps | 0.40 | 0.8528 | 0.36 → 36 % |

Somme 3.96, écrasée à 1.0 par le `min()` → score 100, mais l'UI affichait
des contributions « 300 % » et « 3.000 » (incohérent et non expliquable).

Second constat : le panneau « Analyse contextuelle » **retombait
silencieusement sur le périmètre global** quand aucun domaine ne correspondait
au rattachement de l'enseignant (cas ENS036 : Technologie Web → aucune
compétence), réintroduisant des compétences Génie Civil hors de son périmètre.

## 2. Formule après correction

```
norm_i       = min(1.0, valeur brute_i / cap_i)        # cap: 2 (critiques), 1 (hautes), 1 (profondeur)
contribution_i = poids_i × norm_i                       # ∈ [0, poids_i] ⊆ [0, 1]
score_brut    = Σ_i contribution_i                      # ∈ [0, 1] — jamais > 1
score         = min(1.0, score_brut)                    # is_capped = (score_brut > 1)
```

Poids : `critical_gaps 0.50`, `high_gaps 0.12`, `avg_gap_score 0.40`
(Σ = 1.02 → le cap 1.0 reste atteignable et est exposé via `is_capped` /
`uncapped_score`).

Le score interne reste en **0..100** (snapshots, alertes, dashboard
inchangés) ; le DTO expose `score` (0..1), `score_percent` (0..100),
`level`, `level_label` (FAIBLE/MODÉRÉ/ÉLEVÉ/CRITIQUE), `is_capped`,
`uncapped_score`, et conserve les clés de compatibilité `risk_score` /
`risk_level`.

## 3. Avant / après (API réelle)

### ENS036 (Marwa) — avant

```json
{ "risk_score": 100.0, "risk_level": "CRITICAL",
  "factors": [
    { "feature": "critical_gaps", "value": 12.0, "contribution": 3.0 },
    { "feature": "high_gaps", "value": 2.0, "contribution": 0.6 },
    { "feature": "avg_gap_score", "value": 0.8528, "contribution": 0.36 }
  ] }
```

### ENS036 (Marwa) — après (extrait `GET /api/v1/analytics/teachers/ENS036/risk`)

```json
{
  "teacher_id": "ENS036",
  "score": 0.9611, "score_percent": 96.11,
  "level": "CRITICAL", "level_label": "CRITIQUE",
  "is_capped": false, "uncapped_score": 0.9611,
  "factors": [
    { "feature": "critical_gaps", "code": "critical_gaps", "label": "Gaps critiques",
      "raw_value": 12.0, "normalized_value": 1.0, "weight": 0.5,
      "contribution": 0.5, "contribution_percent": 50.0 },
    { "feature": "high_gaps", "code": "high_gaps", "label": "Gaps haute priorité",
      "raw_value": 2.0, "normalized_value": 1.0, "weight": 0.12,
      "contribution": 0.12, "contribution_percent": 12.0 },
    { "feature": "avg_gap_score", "code": "avg_gap_score", "label": "Profondeur moyenne des gaps",
      "raw_value": 0.8528, "normalized_value": 0.8528, "weight": 0.4,
      "contribution": 0.3411, "contribution_percent": 34.11 }
  ],
  "computed_at": "2026-08-19T20:55:28.920498Z",
  "risk_score": 96.11, "risk_level": "CRITICAL"
}
```

### ENS024 (Karim) — avant / après (non-régression)

| | avant | après |
|---|---|---|
| Score | 100.0 (Σ brute 1.4533 écrasé) | **95.33** (= 0.5 + 0.12 + 0.3333, non écrasé) |
| Contributions | non bornées (2×0.5 …) | 50 % / 12 % / 33.33 % |

`score 0.9533`, `level_label "CRITIQUE"`, `is_capped false`, `uncapped_score 0.9533`.

## 4. Contributions finales (bornées, Σ ≤ 1)

| Enseignant | Critiques (50 %) | Hautes (12 %) | Profondeur (40 %) | Total | Niveau |
|---|---|---|---|---|---|
| ENS024 Karim | 1.0 → 50 % | 1.0 → 12 % | 0.8333 → 33.33 % | **0.9533 → 95.33** | CRITIQUE |
| ENS036 Marwa | 1.0 → 50 % | 1.0 → 12 % | 0.8528 → 34.11 % | **0.9611 → 96.11** | CRITIQUE |

Aucune contribution n'excède 100 % ; `contribution_percent` est borné à 100
côté UI (barre de progression incluse).

## 5. Périmètre explicite (scope)

- `ScopeInfo { type: GLOBAL | DEPARTMENT | UP, is_global, label }`.
- GLOBAL **uniquement** si l'enseignant n'a ni département ni UP ;
- aucun fallback silencieux : scope déclaré sans correspondance → liste vide.
- Filtrage vérifié sur l'API réelle :

| Enseignant | scope | label | compétences filtrées |
|---|---|---|---|
| ENS024 | DEPARTMENT | Departement Intelligence Artificielle & Data | 3/15 — AI.ML, AI.DL, DATA.ENG (3 gaps, CRITIQUE/HAUTE) |
| ENS036 | DEPARTMENT | Département Technologie Web | **0/15** — aucun gap, **aucune compétence Génie Civil** |

Les libellés DB contenant déjà le préfixe (« Département … » / « UP … ») ne
sont pas re-préfixés (« Département Département … » corrigé).

## 6. Résultats des tests

| Suite | Résultat |
|---|---|
| Backend `python -m pytest tests` | **252 passed** (dont nouveaux `test_risk_normalization.py` : non-régression 95.33, bornage 12 crit → 50 %, cap 1.02 → 100, contributions ∈ [0,1], cohérence gaps ; `test_scope_semantics.py` : GLOBAL/DEPARTMENT/UP, aucun GC pour TW) |
| Frontend `npx vitest run` | **193 fichiers / 1415 tests passed** (dont `riskFactorRow.test.tsx` : « valeur 12 · contribution 50% », jamais 300 %/3.000, barre ≤ 100 %) |
| `npm run typecheck` + `eslint` (fichiers modifiés) | 0 erreur |

## 7. Fichiers modifiés

Backend (`esprit_D2F-predictive-analytics`) :
- `app/domain/entities/risk_profile.py` — RiskFactor enrichi (normalized_value,
  weight, label) + `to_dict()` (code, label, raw_value, contribution_percent) ;
  RiskProfile (is_capped, uncapped_score, score 0..1, clés compat).
- `app/domain/services/risk_calculator.py` — contributions normalisées, labels FR.
- `app/infrastructure/ml/predictor.py` — caps (2/1), poids (0.50/0.12/0.40),
  `rule_risk_from_gaps` pure, `_predict_risk_ml` normalisé.
- `app/schemas/analytics.py` — RiskFactorOut/RiskOut/ScopeOut.
- `app/api/v1/analysis.py`, `app/api/v1/teacher_scope.py` — DTO.
- `app/application/use_cases/analyze_teacher_scope.py` — ScopeInfo, labels sans double préfixe.
- `app/infrastructure/repositories/source/competency_source.py` — plus de fallback global.
- Tests : `tests/unit/test_risk_normalization.py`, `tests/unit/test_scope_semantics.py`
  (nouveaux) ; `tests/fakes.py`, `tests/unit/test_ml_predictor_paths.py`,
  `tests/integration/test_api_teacher_scope.py` (mis à jour).

Frontend (`esprit_D2F-webapp`) :
- `src/models/analyse/analyticsFeature.ts`, `src/services/analyse/analyticsApi.ts`
  (types + mapper rétro-compatible).
- `src/components/analytics/RiskFactorRow.tsx` (nouveau), `FactorsExplanationPanel.tsx`,
  `TeacherScopePanel.tsx`, `src/pages/analyse/AnalyticsTeacherPage.tsx`.
- Tests : `analyticsApi.test.ts`, `teacherScopePanel.test.tsx`,
  `factorsExplanationPanel.test.tsx`, `riskFactorRow.test.tsx` (nouveau).

## 8. Redéploiement

Images `predictive-analytics-service` + `webapp` rebuildées et redéployées
(`docker compose build/up`), conteneurs healthy ; valeurs ci-dessus relevées
sur l'API réelle du conteneur redéployé.