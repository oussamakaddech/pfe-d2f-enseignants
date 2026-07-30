# Dataset Personalization Audit

## Teacher Diversity Metrics

| Metric | Value |
|--------|-------|
| Total Teachers | 30 |
| Departments | 6 |
| UPs | 6 |
| Competency Families | 8 |
| Active Trainings | 8 |

## Teacher ID Consistency

| ID Format | Count | Teachers |
|-----------|-------|----------|
| ENS | 27 | ENS001 - ENS027 |
| T | 4 | T003, T006, T007, T015 |

## Missing Data

Teachers without competency data: T011, T014, T028

## Gap Distribution

### ENS-Prefixed Teachers
- Range: 32 - 149 gaps per teacher
- Average: ~60 gaps
- These appear to be from simulation with historical snapshots

### T-Prefixed Teachers
- Range: 8 gaps per teacher
- Consistent across all 4 teachers
- These are from CSV data

## Recommendation Distribution

| Formation ID | Recommendations |
|--------------|-----------------|
| 301 | 53 |
| 401 | 52 |
| 601 | 51 |
| 801 | 50 |
| 101 | 49 |
| 1201 | 11 |
| 501 | 1 |
| 701 | 1 |

## Personalization Failure

T006, T007, T015 all receive:
- Score: 0.4143
- Same formation_id sequence
- Identical ranking

## Acceptance Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| ≥30 teachers | PASS | 30 teachers |
| ≥3 departments | PASS | 6 departments |
| ≥5 competency families | PASS | 8 families |
| ≥10 trainings | FAIL | Only 8 trainings |
| No duplicate IDs | FAIL | Mixed ENS/T format |
| Top-3 unique ≤25% | FAIL | 100% duplicate |
| 100% gap traceability | FAIL | Mixed ID formats break traceability |