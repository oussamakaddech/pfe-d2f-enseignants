# ML Pipeline Audit — Before

## Models

### 1. GapPredictor (gap_predictor.joblib)
- **Type**: GradientBoostingRegressor
- **Status**: Loaded, active (fallback_mode=False)
- **Target**: `gap = required_level - current_level`
- **Horizon**: CURRENT (same timestamp — not future)
- **Target leakage**: **CONFIRMED** — `current_level` and `required_level` are used as features to predict the gap which is computed from them
- **R²**: 1.0 (artificial — due to target leakage)
- **CV scores**: gradient_boosting=0.0001, xgboost=0.0078, mlp=0.011
- **Samples**: 80
- **Features**: 23 (13 with zero variance)
- **sklearn mismatch**: Trained on 1.8.0, running on 1.5.2
- **Decision**: **DEPRECATED** — gap current must be deterministic

### 2. Feature Engineering Pipeline
- **File**: `app/ml/feature_engineering.py`
- **Leakage**: `build_gap_labels()` uses `required_level` and `current_level` to compute the target
- **Features**: `build_teacher_features()` includes `current_level` in aggregates (avg/min/max)
- **Issue**: The same data feeds both features and target

### 3. Risk Scoring
- **File**: `app/engines/risk_scoring.py`
- **Type**: Deterministic formula (multi-factor weighted)
- **Status**: Valid — no ML used
- **Issue**: Factors derived from identical gaps → same score for all teachers

### 4. Recommendation Engine
- **File**: `app/engines/recommendation_engine.py`
- **Status**: Deterministic + collaborative filtering
- **Issue**: No explicit eligibility check (is_training_eligible_for_teacher)

## Data Files
| File | Rows | Usage |
|------|------|-------|
| `teachers.csv` | 30 | Teacher profiles |
| `risk_scores.csv` | 30 | Per-teacher risk scores |
| `teacher_competencies.csv` | 51 | Competency levels |
| `recommendations.csv` | 34 | Training recommendations |
| `alerts.csv` | 16 | Alert events |
| `gap_predictor.joblib` | 163KB | Trained model (leaky) |

## Key Findings
1. **Target leakage**: R²=1.0 from using current_level/required_level as features
2. **Dead features**: 13/23 features have zero variance
3. **sklearn mismatch**: 1.8.0 train → 1.5.2 runtime
4. **No temporal split**: Single snapshot, no time-based validation
5. **No provenance**: Features lack source tracking