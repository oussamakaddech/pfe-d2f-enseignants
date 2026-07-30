# Personalization Rules

## Teacher ID Format
- **Canonical format**: `ENSxxx` (e.g., ENS001, ENS002, ..., ENS030)
- **Legacy format**: `Txxx` (e.g., T001, T002, ..., T030)
- **Mapping**: Positional — ENS001 ↔ T001, ENS002 ↔ T002, etc.
- **Enforcement**: API boundary normalizes all incoming IDs to canonical format

## Gap Personalization

### Rule 1: Per-Teacher Gap Calculation
Each teacher's gaps are computed independently using:
- `niveau_actuel` from `teacher_competencies.csv` (teacher-specific)
- `niveau_requis` from `niveau_savoir_requis` (global required levels)
- `gap = max(0, niveau_requis - niveau_actuel) / 5.0`

### Rule 2: Urgency Score
```
urgence_score = min(1.0,
    (mois_stagnation / 12)
    + (0.3 if regression_detected)
    + (nb_besoins / 5) * 0.2
)
```

### Rule 3: Impact Score
```
impact_score = domaine_demand_weight * 0.4
    + (niveau_vise / 5) * 0.3
    + min(1.0, nb_besoins / 3) * 0.3
```

### Rule 4: Priority Score
```
priorite_score = gap_brut * 0.45
    + urgence_score * 0.35
    + impact_score * 0.20
```

## Recommendation Personalization

### Rule 1: Candidate Filtering
A formation is eligible for recommendation if:
1. It is not cancelled (`etat_formation != "ANNULE"`)
2. It has not been completed by the teacher
3. Its `niveau_prerequis` ≤ teacher's `niveau_actuel`
4. Its `niveau_vise` > teacher's `niveau_actuel`

### Rule 2: MSAS Scoring
Multi-Signal Adaptive Scoring combines three signals:
- **S₁ Gap Score**: Alignment between formation and teacher's gap
- **S₂ Peer Score**: Success rate of similar teachers (collaborative filtering)
- **S₃ Risk Score**: Teacher's risk of dropping out

Weights adapt based on data confidence:
- α (gap) = confidence_gap / Σ confidence
- β (peer) = confidence_peer / Σ confidence
- γ (risk) = confidence_risk / Σ confidence

### Rule 3: Component Scores
- **Pertinence**: `1.0 - abs(niveau_vise - gap_delta) / 5.0`
- **Réussite**: Historical completion rate × 0.6 + average note × 0.4
  - Fallback: teacher's global completion rate when no formation-specific data
- **Disponibilité**: Based on `etat_formation` and `inscriptions_ouvertes`

### Rule 4: Diversity Reranking
- Maximum 2 recommendations per formation per teacher
- Prevents same formation dominating multiple gaps
- Applied after scoring, before path building

### Rule 5: Prerequisite Handling
- Missing prerequisites are recommended first
- Maximum 2 prerequisite formations per gap
- Prerequisites checked via `competence_prerequisite` table

## Risk Personalization

### Deterministic Risk Formula (single source of truth)
```
risk = 0.40 * critical_gap_factor
    + 0.25 * coverage_factor
    + 0.20 * stagnation_factor
    + 0.15 * regression_factor
```

Where:
- `critical_gap_factor = min(critical_ratio * 2.5 + n_critical_alerts * 0.15, 1.0)`
- `coverage_factor = 1.0 - min(avg_gap / 5.0, 1.0)`
- `stagnation_factor = min(n_alerts * 0.5, 1.0)`
- `regression_factor = min(n_stagnation_alerts * 0.2, 0.5)`

### Risk Levels
- CRITIQUE: risk ≥ 0.75
- ELEVE: risk ≥ 0.50
- MODERE: risk ≥ 0.25
- FAIBLE: risk < 0.25

## Cache Isolation

### Cache Key Format
```
cache_key = f"recommendations:{teacher_id}:{version}:{snapshot_hash}"
```

### Cache Invalidation
- Triggered when teacher's competency data changes
- Triggered when new training completions are recorded
- Version incremented on schema changes

## Dataset Requirements

### Minimum Thresholds
- ≥30 teachers
- ≥3 departments
- ≥5 competency families
- ≥10 trainings
- 100% gap traceability
- Top-3 concentration ≤25%

### ID Consistency
- All teacher IDs in CSV must match DB format
- No mixed ID formats in any single response
- API rejects unknown ID formats with 400 Bad Request
