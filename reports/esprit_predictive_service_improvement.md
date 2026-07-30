# ESPRIT Predictive Analytics Service — Improvement Report

## 1. Target Leakage — Root Cause

The `GapPredictor` model was trained to predict `gap = (required_level - current_level) / 5` using features that included `current_level` and `required_level`. This is a **mathematical identity** — the model trivially predicted the gap with R²=1.0 because the target is computed directly from the same features.

**File**: `app/ml/gap_predictor.py` (FEATURE_COLS line 46: `"current_level", "required_level"`)
**File**: `app/ml/feature_engineering.py` (line 114: `merged["gap"] = merged["required_level"].fillna(0) - merged["current_level"]`)

## 2. Why Current Gap Must Be Deterministic

The current gap is a **diagnostic measurement**, not a prediction. Computing it requires knowing the current level and the required level — both of which are available at the time of computation. There is no need for ML to compute this:

- `gap = max(0, (required_level - current_level) / 5)`
- This is a deterministic formula, not a prediction
- ML should only be used for **future** targets where the outcome is unknown

## 3. ML Target Decision

**DECISION: RÈGLES MÉTIER VALIDÉES, ML À COLLECTER**

| Target | Decision | Reason |
|--------|----------|--------|
| current_gap | **REJECTED** — target leakage | Use deterministic GapEngine |
| gap_future_90d | COLLECT_DATA_FIRST | No longitudinal snapshots |
| training_completion_probability | COLLECT_DATA_FIRST | No enrollment history |
| training_effectiveness_probability | COLLECT_DATA_FIRST | No pre/post levels |
| skill_progression_delta_90d | COLLECT_DATA_FIRST | No temporal data |

## 4. Files Changed

| File | Change |
|------|--------|
| `app/engines/current_gap_diagnostic.py` | **NEW** — deterministic gap diagnostic with source: RULE_BASED_DIAGNOSTIC |
| `app/ml/gap_predictor.py` | **DEPRECATED** — docstring + predict() falls back to deterministic gap; train() removes current_level/required_level; model_health() reports target leakage; fallback_mode=True |
| `docs/ML_TARGET_FEASIBILITY_MATRIX.md` | **NEW** — feasibility matrix for all ML targets |
| `reports/ml_pipeline_audit_before.md` | **NEW** — audit of ML pipeline before fixes |
| `reports/esprit_predictive_service_improvement.md` | **NEW** — this report |

## 5. Remaining Issues

1. **Longitudinal data**: No temporal snapshots exist — ML for future targets cannot be validated
2. **sklearn version mismatch**: Model trained on 1.8.0, runtime on 1.5.2 (needs alignment)
3. **Dead features**: 13/23 features have zero variance (need real data)
4. **Recommendation eligibility**: No explicit `is_training_eligible_for_teacher()` check
5. **Risk score**: Identical for all teachers (needs teacher-specific data)

## 6. Final Decision

**RÈGLES MÉTIER VALIDÉES, ML À COLLECTER**