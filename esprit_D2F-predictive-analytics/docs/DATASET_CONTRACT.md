# Dataset Contract - D2F Predictive Analytics

## Master Dataset Schema

### `teachers` (teachers.csv)
| Field | Type | Description |
|-------|------|-------------|
| teacher_id | string | Unique ID format TXXX |
| full_name | string | Full name (unique) |
| department_code | string | Department code (GL, INFO, RT, GC, WEB, SUP) |
| department_nom | string | Department name in French |
| up_code | string | Unité Pédagogique code (UP-XXX) |
| status_metier | string | Enseignant, Maître de Conférences, AER |
| date_embauche | date | YYYY-MM-DD |

### `teacher_competencies` (teacher_competencies.csv)
| Field | Type | Description |
|-------|------|-------------|
| teacher_id | string | FK to teachers |
| competence_code | string | FK to competences catalog |
| competence_nom | string | Competency label in French |
| domaine | string | Department domain |
| observed_result | int | Résultat réel observé de l'enseignant (1-5) |
| knowledge_difficulty_level | int | Niveau de difficulté du savoir (1-5, référentiel) |
| gap_value | int | max(0, knowledge_difficulty_level - observed_result) |
| is_critical_gap | bool | True if gap_value >= 3 |

### `alerts` (alerts.csv)
| Field | Type | Description |
|-------|------|-------------|
| alert_id | string | Format AXXX |
| teacher_id | string | FK to teachers |
| type | string | gap_critique, stagnation |
| severity | string | CRITIQUE or HAUTE |
| competence_code | string or null | FK if type=gap_critique |
| message | string | Human-readable in French |
| created_at | date | YYYY-MM-DD |
| status | string | NOUVELLE, LUE, EN_COURS, RESOLUE |

### `risk_scores` (risk_scores.csv)
| Field | Type | Description |
|-------|------|-------------|
| teacher_id | string | FK to teachers |
| risk_score | float | 0.0 - 1.0 |
| risk_level | string | CRITIQUE, ELEVE, MODERE, FAIBLE |
| avg_gap | float | Mean gap across competencies |
| n_critical_gaps | int | Count of critical gaps |
| n_active_alerts | int | Count of high/critical alerts |

### `recommendations` (recommendations.csv)
| Field | Type | Description |
|-------|------|-------------|
| recommendation_id | string | Format R-{competence}-{teacher} |
| teacher_id | string | FK to teachers |
| training_code | string | FK to formations catalog |
| training_title | string | Formation title in French |
| target_competency_code | string | Competency being targeted |
| relevance_score | float | 0-1 |
| expected_risk_reduction | float | 0-1 |
| explanation_fr | string | Business explanation in French |
| priority | string | HAUTE or MODEREE |

### `dashboard_kpis.json`
All KPIs are computed from the dataset, never hardcoded:
- total_teachers: count of teachers
- enseignants_a_risque: count with risk >= 0.50
- enseignants_critiques: count with risk >= 0.75
- score_risque_moyen: mean of all risk scores
- taux_couverture_global: % of covered competencies
- nb_gaps_critiques: count of is_critical_gap=True
- nb_alertes_nouvelles: count with status=NOUVELLE
- nb_recommandations: count of recommendations

## Risk Score Formula

```
risk = 0.40 * critical_gap_factor + 0.25 * coverage_factor + 0.20 * stagnation_factor + 0.15 * regression_factor

where:
  critical_gap_factor = min(critical_ratio * 2.5 + (n_critical_alerts * 0.15), 1.0)
  coverage_factor = 1 - min(avg_gap / 5.0, 1.0)
  stagnation_factor = min(n_alerts * 0.5, 1.0)
  regression_factor = min(n_stagnation_alerts * 0.2, 0.5)
```

## Risk Thresholds
| Level | Range |
|-------|-------|
| CRITIQUE | 0.75 - 1.00 |
| ELEVE | 0.50 - 0.74 |
| MODERE | 0.25 - 0.49 |
| FAIBLE | 0.00 - 0.24 |

## Coverage Rule
covered = count(competencies where observed_result >= knowledge_difficulty_level) / count(tracked_competencies) * 100

## Règle métier fondamentale

Le **niveau de difficulté** d'un savoir (knowledge_difficulty_level) décrit
uniquement la **complexité pédagogique** du savoir dans le référentiel. Il ne
représente **jamais** le niveau de maîtrise de l'enseignant.

Le **résultat réel observé** (observed_result) est la seule mesure de la
maîtrise effective de l'enseignant, issue d'une observation datée.

Le dataset distingue :
- enseignant
- savoir
- niveau de difficulté du savoir
- résultat réel observé de l'enseignant
- date de l'observation
- source de l'observation