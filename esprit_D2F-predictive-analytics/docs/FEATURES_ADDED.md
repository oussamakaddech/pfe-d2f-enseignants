# Features Added - D2F Predictive Analytics

## Dataset Pipeline (generated + clean + validate)

### Master Dataset (30 unique teachers, 6 departments, 12 competencies)
- `data/raw/` - Source schemas (departments, competencies, formations)
- `data/clean/` - Cleaned and validated exports
- `data/exports/` - JSON dashboard KPIs (computed, never hardcoded)
- `pipelines/generate_d2f_dataset.py` - Master generation script
- `pipelines/run_qa_checks.py` - QA validation checks
- `pipelines/run_all.py` - Complete pipeline orchestration

### Data Quality Guarantees
- No duplicate teacher_id or full_name
- Each teacher has exactly one department and one UP
- All risk_scores in [0,1]
- KPI counts verified against computed values
- Every alert references a real teacher
- Every recommendation maps to a real gap

## P0 Features Implemented

### 1. Unified Risk Score (single formula, reused everywhere)
Formula: risk = 0.40 * critical_gap_factor + 0.25 * coverage_factor + 0.20 * stagnation_factor + 0.15 * regression_factor
Levels: CRITIQUE (>=0.75), ELEVE (>=0.50), MODERE (>=0.25), FAIBLE (<0.25)

### 2. Feedback Loop (training completion)
- `POST /api/v1/d2f/teachers/{teacher_id}/training-complete`
- Recomputes risk score after training
- Returns old and new risk with impact message

### 3. Business Explanation per Recommendation
Every recommendation includes `explanation_fr` with the gap value and competency name, e.g.:
"Recommande car gap 3 sur Algorithmique et stagnation >= 90 jours"

### 4. Gap Trend (`gap_tendance`)
Computed from alerts and gap history with values: amelioration | stagnation | regression

### 5. Impact KPI (% teachers whose risk decreased after training)
Tracked in `dashboard_kpis.json` as `nb_recommandations` and impact tracking

## API Endpoints (D2F Master)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/d2f/kpis` | GET | Dashboard KPIs from dataset |
| `/api/v1/d2f/teachers` | GET | List all teachers with risk (filterable by level) |
| `/api/v1/d2f/teachers/{id}` | GET | Full teacher profile (gaps, alerts, recommendations) |
| `/api/v1/d2f/at-risk` | GET | Teachers with risk >= 0.5 |
| `/api/v1/d2f/critical` | GET | Teachers with risk >= 0.75 |
| `/api/v1/d2f/alerts` | GET | All alerts (filterable by status) |
| `/api/v1/d2f/recommendations` | GET | All recommendations (filterable by priority) |
| `/api/v1/d2f/teachers/{id}/training-complete` | POST | Feedback loop: mark training complete |

## Frontend Integration Points

All KPI values are computed from the master dataset CSV files or via the API.
No hardcoded dashboard values.

## QA Report
- `qa/qa_report.json` - Machine-readable validation results
- `qa/qa_report.md` - Human-readable QA report
- All 8 assertion checks pass every run