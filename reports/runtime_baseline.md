# Runtime Baseline — D2F Predictive Analytics

**Generated**: 2026-07-30
**Branch**: `oussama`
**Commit**: `13e56d62`

## 1. Git & Working Tree

- **Branch**: `oussama` (origin/oussama)
- **HEAD**: `13e56d62` — feat(P3): inter-service events, validation, idempotency, cache invalidation, dept/UP filtering
- **Working tree**: dirty — many modified files in both backend and frontend (see `git status`)

## 2. Service Topology

| Service | Container | Internal Port | External Port | Notes |
|---|---|---|---|---|
| predictive-analytics | d2f-predictive-analytics | 8000 | none (gateway only) | FastAPI |
| api-gateway | d2f-gateway | 8080 | 8080 | Spring Cloud Gateway |
| webapp | d2f-webapp | 80 | 3000 | React/Vite |
| postgres | d2f-postgres | 5432 | 7432 | PostgreSQL 15 |
| rabbitmq | d2f-rabbitmq | 5672 | 5672 | RabbitMQ 3.13 |

**IMPORTANT**: The task brief states backend port 8090 and gateway 8222, but the actual `docker-compose.yml` uses backend internal port **8000** and gateway **8080**. The `routes.yml` default `ANALYSE_SERVICE_URL` is `http://localhost:8090` (local dev), but Docker sets it to `http://d2f-predictive-analytics:8000`.

## 3. API Gateway Routing

`esprit_D2F-api-gateway/src/main/resources/routes.yml`:

- `/api/analyse/**` → `${ANALYSE_SERVICE_URL}` with `RewritePath=/api/analyse/(?<segment>.*), /api/${segment}`
  - So `/api/analyse/v1/analytics/gaps/ENS002` → backend `/api/v1/analytics/gaps/ENS002`
  - So `/api/analyse/v1/d2f/kpis` → backend `/api/v1/d2f/kpis`
- `/api/v1/analyse-predictive/**` → `${SKILL_PASSPORT_SERVICE_URL}` (BFF, port 8089)

## 4. Frontend → Backend Path

### Dashboard page (`AnalyticsDashboardPage.tsx`)
- Uses `useDashboard`, `useAtRisk`, `useAlerts` from `useAnalyticsD2FAdapter.ts`
- These call `D2FService` → `/api/analyse/v1/d2f/*` → backend `d2f_master.py` router
- **`d2f_master.py` reads from CSV files** in `data/clean/` (teachers.csv, risk_scores.csv, etc.)
- This is the **legacy CSV path**, NOT the DB-backed analytics pipeline

### Teacher page (`AnalyticsTeacherPage.tsx`)
- Uses `useAnalyzeTeacher`, `useTeacherGaps`, `useTeacherRecommendations`, `useTeacherRisk`, `useRiskHistory` from `useAnalyticsQueries.ts`
- These call `analyticsApi` → `/api/analyse/v1/analytics/*` → backend `analytics.py` router
- **`analytics.py` reads from PostgreSQL** (SkillGap, TeacherRiskProfile, Recommendation tables)
- Query keys DO include `enseignantId`: `["analytics", "gaps", enseignantId, urgence, page]` ✓

## 5. Root Cause Analysis of "Identical Results" Bug

### Two parallel data paths exist:

1. **DB path** (`/api/v1/analytics/*`): Used by teacher page. Reads `skill_gaps`, `teacher_risk_profiles`, `recommendations` from PostgreSQL. Data is teacher-specific IF the batch analysis has been run.

2. **CSV path** (`/api/v1/d2f/*`): Used by dashboard page. Reads static CSV files. Data IS differentiated (ENS002 risk=0.58, ENS003 risk=0.76), but:
   - `d2f_master.py` `get_teacher_ml_signal` calls `_heuristic_predict` with **empty competency/required levels** → returns `avg_predicted_gap=0.0` for ALL teachers (identical)
   - The CSV `recommendations.csv` has differentiated data, but the dashboard aggregation in `useAnalyticsD2FAdapter` may produce identical top formations

### The "8 generic gaps" symptom:
- If `skill_gaps` table is empty (batch not run), `analytics.py` `get_gaps` returns `{"gaps": [], "total": 0}`
- If competency levels are missing, `GapEngine.compute_gaps` produces gaps with `niveau_actuel=0` → "Manquante"
- The `_load_csv_teacher_profile` fallback in `analytics.py` returns a profile with all zeros → identical gaps

### The "0.41 score / 75% success" symptom:
- `recommendation_engine.py` `_make_item`: `proba = min(0.95, 0.55 + score_g * 0.3 + score_reussite * 0.15)`
- With `score_g=0.5` (default) and `score_reussite=0.5` (fallback): `0.55 + 0.15 + 0.075 = 0.775` → 78% ≈ 75%
- `score_global` with no collaborative: `0.40*0.5 + 0.35*0.5 + 0.25*0.5 = 0.4125` ≈ 0.41

## 6. Data Source Summary

| UI Tab | Frontend Hook | API Endpoint | Backend Router | Data Source |
|---|---|---|---|---|
| Dashboard | useDashboard (D2FAdapter) | /api/analyse/v1/d2f/kpis | d2f_master.py | CSV files |
| At-Risk | useAtRisk (D2FAdapter) | /api/analyse/v1/d2f/at-risk | d2f_master.py | CSV files |
| Alerts | useAlerts (D2FAdapter) | /api/analyse/v1/d2f/alerts | d2f_master.py | CSV files |
| Teacher Gaps | useTeacherGaps | /api/analyse/v1/analytics/gaps/{id} | analytics.py | PostgreSQL |
| Teacher Risk | useTeacherRisk | /api/analyse/v1/analytics/risk/{id} | analytics.py | PostgreSQL |
| Teacher Recos | useTeacherRecommendations | /api/analyse/v1/analytics/recommendations/{id} | analytics.py | PostgreSQL |

## 7. Teacher ID Format

- CSV files use **ENS** format (ENS001..ENS030) ✓
- DB `enseignants.id` uses **ENS** format ✓
- `normalize_teacher_id` in `data_service.py` accepts ENS directly, maps T→ENS via `teacher_id_mapping` table
- No T-format leakage found in CSV files
- Legacy `d2f_master.py` does NOT normalize teacher IDs (accepts any string)

## 8. Cache Implementation

- **Backend**: `PredictionCache` (LRU-TTL, 5 min) in `gap_predictor.py` — keyed by `{teacher_id}:{top_n}` ✓
- **Frontend**: React Query with teacher-specific keys for teacher pages ✓
- **Dashboard**: React Query keys are global (`["d2f", "kpis"]`) — acceptable for global dashboard

## 9. Identified Issues to Fix

1. **`d2f_master.py` CSV path** must be deprecated/gated — it bypasses the DB pipeline
2. **`analytics.py` CSV fallback** (`_load_csv_teacher_profile`) returns zero-profiles → identical gaps
3. **`d2f_master.py` `get_teacher_ml_signal`** calls `_heuristic_predict` with empty data → identical ML signal
4. **Missing `analysis_status`/`data_source`/`warnings`** in responses — no way to distinguish real vs fallback data
5. **`normalize_teacher_id`** should reject T-format on new endpoints (currently maps silently)
6. **`build_factors_from_teacher_profile`** is deprecated but still used in `all.py` `_compute_teacher_risk`
7. **Duplicate imports** in `gap_predictor.py` (lines 27-55)
8. **`job_batch_analysis_all`** is sequential (comment mentions ThreadPoolExecutor but code iterates)