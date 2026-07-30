# Cross-Service Contracts

## Overview

This document defines the data contracts between D2F services.

## Canonical Teacher ID

The **User Management service** (DB table `formation.enseignants`) is the canonical owner of teacher IDs.

Format: `ENS001` - `ENS030` (3 digits, zero-padded)

All other services MUST use this canonical ID format.

## Service Contracts

### 1. User Management -> Predictive Analytics

**Method**: REST API or RabbitMQ event

**Payload**:
```json
{
  "teacher_id": "ENS001",
  "department_id": "DEPT_RT",
  "up_id": "UP_RT",
  "role_id": "ENSEIGNANT",
  "status": "ACTIVE",
  "data_version": "2026-07-30T00:00:00Z"
}
```

**Event type**: `user.updated`

### 2. Competency -> Predictive Analytics

**Method**: REST API or RabbitMQ event

**Payload**:
```json
{
  "teacher_id": "ENS001",
  "competency_id": 1,
  "current_level": 3,
  "required_level": 5,
  "observed_at": "2026-07-30T00:00:00Z",
  "source": "competency-service"
}
```

**Event type**: `competency.updated`

### 3. Training -> Predictive Analytics

**Catalog Payload**:
```json
{
  "training_id": 1,
  "active": true,
  "covered_competency_ids": [1],
  "prerequisite_training_ids": [],
  "target_departments": ["DEPT_INFO"],
  "estimated_impact": 0.8
}
```

**Completion Event**:
```json
{
  "event_id": "evt_001",
  "event_type": "training.completed",
  "teacher_id": "ENS001",
  "training_id": 1,
  "completed_at": "2026-07-30T00:00:00Z",
  "correlation_id": "corr_001"
}
```

**Event type**: `training.completed`

## Validation Rules

1. All teacher IDs MUST match pattern `^ENS\d{3}$`
2. Unknown ID formats are REJECTED at API boundaries with HTTP 400
3. Cache keys MUST include canonical teacher_id and data_version
4. RabbitMQ consumers MUST validate teacher_id before processing

## ID Mapping Table

Table: `public.teacher_id_aliases`

| Column | Type | Description |
|--------|------|-------------|
| legacy_teacher_id | VARCHAR(50) | Old T-prefixed ID (T001-T030) |
| canonical_teacher_id | VARCHAR(50) | New ENS-prefixed ID |
| source | VARCHAR(100) | Verification source |
| verified_at | TIMESTAMP | When verified |
| verified_by | VARCHAR(100) | Who verified |
