# ML Target Feasibility Matrix

## Decision Summary

| Target | Labels Available? | n | Historical Period | Missing % | Decision |
|--------|------------------|---|-------------------|-----------|----------|
| current_gap | ✅ (trivial) | 80 | Current snapshot | 0% | **REJECTED** — target leakage |
| gap_future_90d | ❌ | 0 | No longitudinal snapshots | 100% | COLLECT_DATA_FIRST |
| risk_of_stagnation_90d | ❌ | 0 | No longitudinal data | 100% | COLLECT_DATA_FIRST |
| training_completion_probability | ❌ | 0 | No enrollment history | 100% | COLLECT_DATA_FIRST |
| training_effectiveness_probability | ❌ | 0 | No pre/post levels | 100% | COLLECT_DATA_FIRST |
| skill_progression_delta_90d | ❌ | 0 | No temporal snapshots | 100% | COLLECT_DATA_FIRST |

## Current Gap (REJECTED — Target Leakage)

- **Target definition**: `gap = (required_level - current_level) / 5`
- **Horizon**: Current (same timestamp)
- **Label source**: `build_gap_labels()` in feature_engineering.py
- **Features used**: `current_level`, `required_level` (among others)
- **Leakage**: **CONFIRMED** — the target is computed from the same variables used as features
- **R²**: 1.0 (artificial)
- **Decision**: Use deterministic formula in `GapEngine` / `current_gap_diagnostic.py` instead

## Gap Future 90d (COLLECT_DATA_FIRST)

- **Target definition**: `gap_future = (required_level - current_level_at_t+90d) / 5`
- **Required**: Temporal snapshots of competency levels per teacher
- **Current status**: No temporal snapshots available
- **Action needed**: Create `teacher_competency_snapshots` table and start collecting data

## Risk of Stagnation 90d (COLLECT_DATA_FIRST)

- **Target definition**: Binary classification — teacher has no gap improvement after 90 days
- **Required**: Longitudinal data with at least 2 snapshots per teacher
- **Current status**: No longitudinal data
- **Action needed**: Same as above — temporal snapshots

## Training Completion Probability (COLLECT_DATA_FIRST)

- **Target definition**: Binary — teacher completes a recommended training
- **Required**: Enrollment history with completion status, teacher attributes
- **Current status**: No structured enrollment data with ML-ready features
- **Action needed**: Create `training_enrollments` table with structured data

## Training Effectiveness Probability (COLLECT_DATA_FIRST)

- **Target definition**: Binary — training reduces the gap by at least 1 level
- **Required**: Pre/post competency levels for each training
- **Current status**: No pre/post measurement data
- **Action needed**: Create `training_effectiveness_observations` table

## Skill Progression Delta 90d (COLLECT_DATA_FIRST)

- **Target definition**: `delta = current_level_at_t+90d - current_level_at_t0`
- **Required**: Temporal snapshots
- **Current status**: No temporal data
- **Action needed**: Same as gap_future_90d

## Conclusion

**No ML model is deployable for any future target** due to insufficient longitudinal data. The system correctly uses deterministic rules (GapEngine, RiskScoring) for the current diagnostic. ML should be re-evaluated after collecting 6+ months of temporal competency snapshots.