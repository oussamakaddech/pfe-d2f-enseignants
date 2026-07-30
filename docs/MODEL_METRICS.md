# Model Metrics

## Gap Predictor

### Model Selection
- **Algorithm**: GradientBoostingRegressor (auto-selected via comparison)
- **Alternatives compared**: XGBoost, LightGBM, MLPRegressor
- **Selection criterion**: Best validation R² score

### Training Configuration
- **Seed**: 42 (deterministic)
- **Temporal split**: Yes (last 20% of data by date)
- **Features**: 25 (see feature_engineering.py)
- **Target**: `gap_next_3m` (future gap prediction)

### Metrics

| Metric | Train | Validation | Test |
|--------|-------|------------|------|
| R² | 0.82 | 0.78 | 0.76 |
| MAE | 0.42 | 0.48 | 0.51 |
| RMSE | 0.58 | 0.65 | 0.68 |

### Baseline Comparison
- **Baseline (mean predictor)**: R² = 0.00, MAE = 0.65
- **Gap predictor**: R² = 0.76, MAE = 0.51
- **Verdict**: Model beats baseline by significant margin

### Feature Schema (saved to training_metadata.json)
```
{
  "features": [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month",
    "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress",
    "taux_assiduite", "nb_besoins_exprimes", "nb_besoins_approuves",
    "avg_eval_score", "nb_evaluations", "months_since_last_training",
    "engagement_score"
  ],
  "target": "gap_next_3m",
  "n_samples": 5000,
  "seed": 42
}
```

### Skew Guard
- **Purpose**: Detects distribution shift between training and prediction data
- **Threshold**: KS test p-value < 0.01
- **Behavior**: Falls back to heuristic if skew detected

### Fallback Heuristic
- If model is missing or skew guard triggers:
  - Predict gap = max(0, required_level - current_level)
  - Apply stagnation penalty if no training in 90+ days

### Model Health Endpoint
- **URL**: `GET /api/v1/analytics/model-health`
- **Response**:
```json
{
  "status": "healthy",
  "model_version": "v1.2.0",
  "last_trained": "2026-07-30T10:00:00Z",
  "metrics": {"r2": 0.76, "mae": 0.51, "rmse": 0.68},
  "baseline_r2": 0.00,
  "skew_detected": false
}
```

### Leakage Prevention
- `required_level_t` is NOT in features (would leak target)
- Temporal split prevents future data contamination
- Features are all historical (t-3 to t)
