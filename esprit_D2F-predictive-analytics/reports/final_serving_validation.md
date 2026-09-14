# Validation serving (appels API réels)

- Mode déployé : **PRODUCTION_ML**
- Artefact actif chargeable : True

## `alerts`

```json
{
  "data": [
    {
      "id": 900,
      "alert_type": "GAP_CRITIQUE",
      "target_type": "INDIVIDUEL",
      "teacher_id": "ENS022",
      "department_id": null,
      "competence_id": 3,
      "severity": "CRITICAL",
      "title": "Gap critique â€” QualitÃ© & Tests",
      "message": "Niveau actuel 0/5, requis 5/5 sur la compÃ©tence Â« QualitÃ© & Tests Â». Score prioritÃ© : 1.0.",
      "details": {
        "gap_score": 1.0,
        "niveau_actuel": 0,
        "niveau_requis": 5,
        "priorite_score": 1.0,
        "score_priorite": 1.0
      },
      "status": "RESOLUE",
      "created_at": "2026-07-31T20:00:41.884440+00:00"
    },
    {
      "id": 899,
      "alert_type": "GAP_CRITIQUE",
      "target_type": "INDIVIDUEL",
      "teacher_id": "ENS022",
      "department_id": nu
```

## `dashboard_global`

```json
{}
```

## `dashboard_global_latest`

```json
{
  "data": {
    "generated_at": "2026-08-06",
    "nb_regression": 0,
    "nb_stagnation": 0,
    "alertes_recentes": [
      {
        "id": 899,
        "titre": "Gap critique â€” QualitÃ© & Tests",
        "severite": "CRITICAL",
        "created_at": "2026-07-31T20:00:41.884435+00:00",
        "type_alerte": "GAP_CRITIQUE",
        "enseignant_id": "ENS022"
      },
      {
        "id": 898,
        "titre": "Gap critique â€” QualitÃ© & Tests",
        "severite": "CRITICAL",
        "created_at": "2026-07-31T16:36:11.293712+00:00",
        "type_alerte": "GAP_CRITIQUE",
        "enseignant_id": "ENS015"
      },
      {
        "id": 897,
        "titre": "Gap critique â€” QualitÃ© & Tests",
        "severite": "CRITICAL",
        "created_at": "2026-07-31T16:36:11.293707+00:00",
 
```

## `gaps_ENS001`

```json
{
  "data": [
    {
      "competence_id": 4,
      "competence_code": "RES.SEC",
      "competence_nom": "SÃ©curitÃ© Applicative",
      "current_level": 0.0,
      "target_level": 5.0,
      "gap_score": 1.0,
      "severity": "CRITIQUE",
      "trend": "STABLE",
      "as_of": "2026-08-19"
    },
    {
      "competence_id": 10,
      "competence_code": "SYS.CLOUD",
      "competence_nom": "SystÃ¨mes & Cloud",
      "current_level": 0.0,
      "target_level": 5.0,
      "gap_score": 1.0,
      "severity": "CRITIQUE",
      "trend": "STABLE",
      "as_of": "2026-08-19"
    },
    {
      "competence_id": 5,
      "competence_code": "RES.INFRA",
      "competence_nom": "Infrastructure & Cloud",
      "current_level": 0.0,
      "target_level": 3.0,
      "gap_score": 0.75,
      "severit
```

## `risk_ENS001`

```json
{
  "data": {
    "teacher_id": "ENS001",
    "score": 0.8667,
    "score_percent": 86.67,
    "level": "CRITICAL",
    "level_label": "CRITIQUE",
    "is_capped": false,
    "uncapped_score": 0.8667,
    "factors": [
      {
        "feature": "critical_gaps",
        "code": "critical_gaps",
        "label": "Gaps critiques",
        "raw_value": 3.0,
        "normalized_value": 1.0,
        "weight": 0.5,
        "contribution": 0.5,
        "contribution_percent": 50.0,
        "scope": "DEPARTMENT",
        "scope_type": "TEACHER",
        "scope_id": "ENS001",
        "scope_label": null
      },
      {
        "feature": "high_gaps",
        "code": "high_gaps",
        "label": "Gaps de haute urgence",
        "raw_value": 0.0,
        "normalized_value": 0.0,
        "weight": 0.
```


## Constats

