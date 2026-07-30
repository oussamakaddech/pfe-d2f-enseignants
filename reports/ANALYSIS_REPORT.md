# Predictive Analytics Service — Root Cause Analysis & Fixes Applied

## Executive Summary

The `esprit_D2F-predictive-analytics` service was returning **identical results** for different teachers (e.g., ENS002 and ENS003 showed the same risk score and gaps). Root cause analysis identified **three interacting defects**:

| # | Defect | Impact | Severity |
|---|--------|--------|----------|
| P0-1 | Legacy T-format ID silently mapped to ENS via `normalize_teacher_id()` | T001 and ENS001 treated as same teacher → wrong data | **Critical** |
| P0-2 | CSV fallback returns zeroed/generic profiles with no provenance indicator | ENS002 & ENS003 get identical generic data → "identical results" | **Critical** |
| P0-3 | No `analysis_status`/`data_source` in responses | Frontend cannot distinguish real vs fallback data | High |

## Root Causes

### P0-1: Legacy ID Leakage (Phase 2)
`DataService.normalize_teacher_id()` silently maps `T001` → `ENS001`, making legacy IDs indistinguishable from canonical ones. On new v1 endpoints, this caused T-format IDs to resolve to wrong teacher records.

### P0-2: Generic CSV Fallback (Phase 3)
When the DB has no `TeacherRiskProfile` or `SkillGap` for a teacher, the endpoints fell back to `_load_csv_teacher_profile()` / `_load_csv_risk_score()` which return **generic zeroed profiles**. Since ENS002 and ENS003 both have no DB records, they both got the same generic CSV fallback data → **identical results**.

### P0-3: Missing Response Envelope (Phase 3)
Responses contained no `analysis_status` or `data_source` fields, so the frontend couldn't tell whether data was from the DB, CSV fallback, or stale.

## Fixes Applied

### Phase 2: Canonical ID Policy Enforcement
- **Created** `app/core/id_policy.py` — `validate_canonical_id()` rejects T-format IDs with `400 LEGACY_ID_NOT_ALLOWED`
- **Applied** `validate_canonical_id()` to all 9 teacher-specific endpoints in `analytics.py`
- **Created** `app/routers/d2f_compat.py` — compatibility adapter maps T→ENS via `teacher_id_mapping` table, delegates to canonical v1 endpoints
- **Registered** compat router in `app/routers/all.py`

### Phase 3: Response Envelope + CSV Fallback Transparency
- **Created** `app/core/response_envelope.py` — `READY`, `DATA_INCOMPLETE`, `NOT_FOUND`, `MODEL_FALLBACK` statuses + `SRC_DB`, `SRC_CSV`, `SRC_HEURISTIC`, `SRC_ML` data sources
- **Updated** `get_risk()` to return `analysis_status: DATA_INCOMPLETE`, `data_source: csv_fallback`, and `warnings` when falling back to CSV
- **Added** envelope imports to `analytics.py`

### Phase 5: Frontend Envelope Support
- **Updated** `RiskScore` interface in `analyticsFeature.ts` with `analysis_status?`, `data_source?`, `warnings?`
- **Fixed** `RawAlertEvent.competence_id` type and `severite`/`statut` casts in `analyticsApi.ts`
- **Added** `getRiskEnvelope()` method for diagnostics

### Phase 7: Duplicate Imports Cleanup
- **Fixed** `gap_predictor.py` — removed duplicate `import` statements

## Files Changed

| File | Change |
|------|--------|
| `app/core/id_policy.py` | **NEW** — canonical ID validation |
| `app/core/response_envelope.py` | **NEW** — response envelope helpers |
| `app/routers/d2f_compat.py` | **NEW** — legacy T→ENS adapter |
| `app/routers/analytics.py` | 9 endpoints: `normalize_teacher_id`→`validate_canonical_id`; `get_risk` CSV fallback now returns `DATA_INCOMPLETE` envelope |
| `app/routers/all.py` | Registered compat router |
| `app/ml/gap_predictor.py` | Removed duplicate imports |
| `webapp/src/models/analyse/analyticsFeature.ts` | `RiskScore` + `RawAlertEvent` types updated |
| `webapp/src/services/analyse/analyticsApi.ts` | `getRiskEnvelope()` added; TS type fixes |
| `tests/test_teacher_personalization.py` | **NEW** — 11 tests covering ID policy, teacher differentiation, envelope, cache isolation, compat adapter |

## Verification

All Python files pass `py_compile`:
```
OK: id_policy.py
OK: response_envelope.py
OK: d2f_compat.py
OK: gap_predictor.py
OK: analytics.py
OK: all.py
```

Test suite covers:
1. T-format IDs rejected with 400 `LEGACY_ID_NOT_ALLOWED`
2. ENS format IDs accepted
3. ENS002 vs ENS003 return different risk scores (when DB has data)
4. Response envelope includes `analysis_status`/`data_source`/`warnings`
5. CSV fallback includes explanatory warnings
6. Cache keys are teacher-specific (no cross-contamination)
7. Compat adapter maps T→ENS correctly

## Docker Image Verification

Rebuilt the Docker image successfully:
```
REPOSITORY: pfe-d2f-enseignants-predictive-analytics-service
TAG: latest
IMAGE ID: cf2f702ca877
CREATED: 2026-07-30 17:13:08 +0100 CET
SIZE: 2.35GB
```

Confirmed all new files are inside the container:
- `/app/app/core/id_policy.py` ✓
- `/app/app/core/response_envelope.py` ✓
- `/app/app/routers/d2f_compat.py` ✓

## Additional Bug Fix

### P0-4: Missing get_evaluations_globales() Method (Pre-existing)
The collect_analysis_data function at line 56 calls svc.get_evaluations_globales() but the DataService class was missing this method. The SQL query EVALUATIONS_GLOBALES_QUERY existed but had no corresponding method. This caused a 500 error on POST /analyze/{enseignant_id}.

**Fix**: Added get_evaluations_globales() method to DataService that executes the EVALUATIONS_GLOBALES_QUERY.

## Remaining Recommendations

1. **Phase 4**: Populate `teacher_id_mapping` table with all T→ENS mappings
2. **Phase 6**: Add cache invalidation on `/analyze/{enseignant_id}` endpoint (invalidate teacher-specific cache after analysis completes)
3. **Phase 8**: Run the batch analysis scheduler to populate `TeacherRiskProfile` for all teachers (eliminates CSV fallback)
4. **Phase 9**: Add `analysis_status` display in the frontend UI (warning banner when `DATA_INCOMPLETE`)
5. **Phase 10**: Run `docker-compose up -d` to deploy the rebuilt image

