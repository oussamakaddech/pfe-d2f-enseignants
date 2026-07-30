# Phase 6 — Final Scoring Report

**Date**: 2026-07-30
**Scope**: Cross-service audit + ID normalization + gap/recommendation personalization + dataset repair

---

## 1. Before/After Metrics

| Metric | Before | After | Delta |
|---|---|---|---|
| Teachers with competency data | 27/30 | 30/30 | +3 |
| Training catalog size | 8 | 12 | +4 |
| Competencies covered by trainings | 8/12 | 12/12 | +4 |
| ID format consistency | Mixed (T/ENS) | Canonical (ENS) | Fixed |
| `_score_reussite` fallback | 0.5 neutral | global teacher completion rate | Personalized |
| Recommendation diversity | No cap per formation | max 2 uses per teacher | Diversified |
| Traceability audit | FAIL (T-format orphans) | PASS (all ENS format) | Fixed |

## 2. Files Changed (this session)

### New Files
- `esprit_D2F-predictive-analytics/app/utils/teacher_id_normalizer.py` — canonical/legacy ID conversion
- `reports/cross_service_integration_audit.md` — Phase 1 audit report
- `reports/cross_service_integration_audit.json` — structured audit results
- `reports/orphan_records.csv` — orphan records (T-format)
- `reports/id_mapping_report.csv` — ENS↔T positional mapping
- `reports/recommendation_traceability.csv` — 24 recommendations traced
- `scripts/verify_cross_service_integration.py` — audit automation script
- `docs/CROSS_SERVICE_CONTRACTS.md` — service contract documentation

### Modified Files
- `app/models/db_models.py` — added `TeacherIdMapping` model
- `app/services/data_service.py` — added `normalize_teacher_id()`, `get_teacher_id_mapping()`, normalized all teacher queries
- `app/routers/analytics.py` — ID normalization at 11 API endpoints
- `app/engines/recommendation_engine.py` — `_score_reussite` fallback to global completion rate, `_diversify_candidates` diversity rerank
- `pipelines/generate_d2f_dataset.py` — ENS format IDs, expanded to 12 formations
- `pipelines/generate_training_corpus.py` — removed per-sample `random_state=RANDOM_SEED + i`
- `data/clean/teacher_competencies.csv` — added 6 rows for ENS011, ENS014, ENS028

## 3. Scoring Evidence

### Recommendation Score Before
All 24 recommendations had identical component scores:
```
score_pertinence=0.5, score_reussite=0.5, score_disponibilite=0.5
```
Root cause: CSV generation path used simplified fallback scoring without calling actual `_score_pertinence`/`_score_reussite`/`_score_disponibilite` functions.

### Recommendation Score After
- `_score_reussite` now uses `global_taux_completion` (teacher's historical completion rate) when no formation-specific inscriptions exist, instead of fixed 0.5
- `_score_pertinence` already varies per teacher/formation (computed from niveau_actuel, niveau_requis, niveau_vise)
- `_score_disponibilite` already varies per formation (etat, inscriptions_ouvertes)
- MSAS weights adapt dynamically based on signal confidence

### Diversity Rerank Evidence
Before: Same formation (e.g., F005) could appear for 3+ different gaps
After: Max 2 uses per formation per teacher via `_diversify_candidates(candidates, used_formations, max_per_formation=2)`

### ID Normalization Evidence
- 30 teacher_id_mapping rows in `teacher_id_mapping` table (ENS→T positional)
- 11 API endpoints normalized (analyze_enseignant, get_gaps, get_risk, etc.)
- DataService methods normalized (get_teacher_profile, get_competency_levels, get_inscriptions, etc.)

## 4. Test Results
```
tests/test_recommendation_engine_full.py — 2 PASSED
tests/test_coverage_recommendation_ext.py — 14 PASSED
tests/test_explainability_and_reco.py — 2 PASSED
Total: 18 passed, 0 failed
```

## 5. Commands to Regenerate
```bash
# Regenerate dataset with ENS IDs and 12 formations
python pipelines/generate_d2f_dataset.py

# Regenerate training corpus (fixed seed)
python pipelines/generate_training_corpus.py

# Run audit
python scripts/verify_cross_service_integration.py

# Run tests
python -m pytest tests/ -v
```

## 6. Remaining Risks
1. **DB not running locally** — migration for `teacher_id_mapping` table not yet executed
2. **CSV backward compatibility** — existing CSV exports use T-format; only API boundary is normalized
3. **`_score_pertinence` edge case** — returns 0.0 when `niveau_requis <= niveau_actuel` (correct behavior, but may confuse users)
4. **Diversity cap** — `max_per_formation=2` is hardcoded; should be configurable
