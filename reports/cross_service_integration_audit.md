# Cross-Service Integration Audit Report

**Service**: D2F Predictive Analytics  
**Date**: 2026-07-30  
**Auditor**: opencode  

---

## Executive Summary

The Predictive Analytics service connects to **three external services** (User Management, Competency, Training) via **raw SQL queries against a shared PostgreSQL database**. The integration is **PARTIAL** — it reads from the correct tables but suffers from:

1. **ID Format Mismatch**: Predictive service uses `ENS001..ENS030` (from DB) while master CSV dataset uses `T001..T030`
2. **No API Contracts**: Direct SQL coupling — no versioned APIs, no circuit breakers, no schema validation
3. **Missing Write-Back**: Predictive service never writes to User Management / Competency / Training services (read-only)
4. **No Real-Time Sync**: Batch nightly job only; stale data between runs

---

## 1. User Management Service Integration

### Connection Method
**Direct SQL** against `enseignants` table in `auth` schema (via `DB_SEARCH_PATH`).

### Queries Used
- `TEACHER_PROFILE_QUERY` (data_service.py:92-150) — joins `enseignants`, `inscriptions`, `presences`, `besoin_formation`, `evaluation_formateur`
- `ALL_ENSEIGNANTS_QUERY` (data_service.py:370-374) — `SELECT id, nom, prenom, mail, dept_id FROM enseignants WHERE deleted_at IS NULL`
- `get_enseignant_scope` (data_service.py:630-640) — resolves UP/department for RBAC

### Data Retrieved
| Field | Source Table | Used For |
|-------|-------------|----------|
| `id` (ENS001..) | `enseignants.id` | Canonical teacher_id |
| `nom`, `prenom`, `mail` | `enseignants` | Display, notifications |
| `dept_id` | `enseignants.dept_id` | Department scoping, gap domain demand |
| `up_id` | `enseignants.up_id` | UP-level aggregation |
| `deleted_at` | `enseignants.deleted_at` | Soft-delete filter |

### Gaps Found
| Check | Status | Evidence |
|-------|--------|----------|
| Every predictive teacher exists in User Management | ❌ FAIL | CSV has `T001..T030`, DB has `ENS001..ENS030` — no mapping |
| Canonical ID ownership defined | ❌ FAIL | No `teacher_id_mapping` table; both formats used interchangeably |
| RBAC scoping enforced | ✅ PASS | `_resolve_object_scope()` in analytics.py:63-92 filters by dept/UP |
| Teacher status (active/inactive) respected | ⚠️ PARTIAL | Only `deleted_at IS NULL` checked; no `status_metier` filter |

### Risk
**HIGH** — Mixed ID formats cause:
- Duplicate teacher profiles (ENS001 ≠ T001)
- Gaps/recommendations computed for wrong teacher
- Cache keys collide or miss

---

## 2. Competency Service Integration

### Connection Method
**Direct SQL** against `competence` schema tables: `enseignant_competences`, `savoirs`, `sous_competences`, `competences`, `domaines`, `niveau_savoir_requis`.

### Queries Used
| Query | Purpose | Tables |
|-------|---------|--------|
| `COMPETENCY_LEVELS_QUERY` (data_service.py:152-175) | Current levels per teacher | `enseignant_competences` → `savoirs` → `sous_competences`/`competences` → `domaines` |
| `REQUIRED_LEVELS_QUERY` (data_service.py:177-195) | Required levels per competency | `niveau_savoir_requis` → `savoirs` → `competences`/`sous_competences` → `domaines` |
| `PREREQUISITE_GRAPH_QUERY` (data_service.py:197-206) | Competency prerequisites | `competence_prerequisite` → `competences` |

### Data Retrieved
| Field | Source | Used By |
|-------|--------|---------|
| `enseignant_id`, `savoir_id`, `niveau` (N1_DEBUTANT..N5_EXPERT) | `enseignant_competences` | GapEngine current_level |
| `competence_id`, `competence_nom`, `domaine_id`, `domaine_nom` | `competences`/`domaines` | GapEngine, RecommendationEngine |
| `required_level` (N1..N5) | `niveau_savoir_requis` | GapEngine required_level |
| `prerequisite_id`, `niveau_minimum` | `competence_prerequisite` | RecommendationEngine path building |

### Gaps Found
| Check | Status | Evidence |
|-------|--------|----------|
| Every predictive teacher has competency rows | ❌ FAIL | `teacher_competencies.csv` has 46 rows for 30 teachers; T011, T014, T028 missing (audit finding) |
| Explicit exclusion status for teachers without competencies | ❌ FAIL | No `competency_status` column; missing = implicit zero gaps |
| Required levels cover all active competencies | ⚠️ UNKNOWN | No validation query run |
| Prerequisite graph is complete | ⚠️ UNKNOWN | No cycle detection, no coverage audit |

### Risk
**HIGH** — Missing competency rows → zero gaps → zero recommendations → false "healthy" profile.

---

## 3. Training Service Integration

### Connection Method
**Direct SQL** against `formation` schema tables: `formations`, `formation_competences`, `inscriptions`, `seances`, `presences`, `evaluation_globale`, `certificates`.

### Queries Used
| Query | Purpose | Tables |
|-------|---------|--------|
| `FORMATION_COMPETENCIES_QUERY` (data_service.py:208-227) | Training → competency mapping | `formation_competences` → `formations` |
| `FORMATIONS_ALL_QUERY` (data_service.py:229-243) | Active training catalog | `formations` (excl. ANNULE) |
| `INSCRIPTIONS_TEACHER_QUERY` (data_service.py:245-253) | Teacher enrollments | `inscriptions` |
| `PRESENCES_TEACHER_QUERY` (data_service.py:255-264) | Attendance records | `presences` → `seances` → `formations` |
| `EVALUATIONS_GLOBALES_QUERY` (data_service.py:289-295) | Training effectiveness | `evaluation_globale` |
| `CERTIFICATS_TEACHER_QUERY` (data_service.py:297-305) | Completion certificates | `certificates` |
| `FORMATION_COMPLETION_QUERY` (data_service.py:377-386) | Completion rates per training | `inscriptions` → `formations` |

### Data Retrieved
| Field | Source | Used By |
|-------|--------|---------|
| `id_formation`, `titre_formation`, `etat_formation`, `type_formation` | `formations` | RecommendationEngine candidate filtering |
| `competence_id`, `niveau_prerequis`, `niveau_vise` | `formation_competences` | Gap matching, prerequisite checking |
| `etat` (PENDING/APPROVED/REJECTED) | `inscriptions` | Completed training exclusion |
| `presence` (boolean) | `presences` | Attendance rate feature |
| `note_globale` | `evaluation_globale` | Training effectiveness scoring |

### Gaps Found
| Check | Status | Evidence |
|-------|--------|----------|
| Every recommendation references active training | ❌ FAIL | `recommendation_engine.py:329` filters `etat != ANNULE` but no `inscriptions_ouvertes` / `ouverte` check |
| Completed trainings excluded | ⚠️ PARTIAL | `recommendation_engine.py:331-332` checks `formations_completees` set but uses `formation_id` from `inscriptions` — may miss trainings completed without formal inscription |
| Department/UP restrictions respected | ❌ FAIL | No `departement_id` / `up_id` filter in `_filter_candidates` (recommendation_engine.py:315-338) |
| Prerequisites checked | ✅ PASS | `prereq_index` built from `PREREQUISITE_GRAPH_QUERY`; used in `_build_path` (recommendation_engine.py:354-363) |
| At least 10 active trainings for demo | ❌ FAIL | `formations.csv` has only 8 trainings (F001-F008) |

### Risk
**HIGH** — Only 8 trainings → recommendation concentration → identical top-3 for many teachers.

---

## 4. Cross-Service Consistency Checks

### Check 1: Every predictive teacher exists in User Management
**RESULT: FAIL**

| Predictive ID Format | Source | Count |
|---------------------|--------|-------|
| `ENS001..ENS030` | PostgreSQL `enseignants` table | 30 |
| `T001..T030` | Master CSV `teachers.csv` | 30 |

**No mapping table exists.** The fallback `_load_csv_teacher_profile()` (analytics.py:222-249) loads CSV by `teacher_id` but DB queries use `enseignant_id`. They are treated as same namespace but are **different identifiers**.

### Check 2: Every predictive teacher has competency rows or explicit exclusion
**RESULT: FAIL**

- `teacher_competencies.csv`: 46 rows, 27 unique teachers (ENS001-ENS030 minus ENS011, ENS014, ENS028)
- 3 teachers (ENS011, ENS014, ENS028) have **zero** competency rows
- No `is_excluded` / `competency_status` column to distinguish "no data" from "no gaps"

### Check 3: Every recommendation references existing active training
**RESULT: FAIL**

- `recommendations.csv`: 24 recommendations referencing F001-F008
- `formations.csv`: 8 trainings (F001-F008), all `etat_formation` not ANNULE
- **BUT**: No validation that `inscriptions_ouvertes=true` and `ouverte=true` at recommendation time
- RecommendationEngine filters only `etat != ANNULE` (line 329)

### Check 4: Every recommendation matches at least one unresolved teacher-specific gap
**RESULT: PARTIAL**

- `recommendation_engine.py:266-269` calls `_filter_candidates(competence_id, niveau_actuel, ...)` 
- Candidates filtered by `niveau_actuel > 0 and nprq > niveau_actuel` (prereq check) and `nvis > 0 and nvis <= niveau_actuel` (target level check)
- **ISSUE**: If a teacher has NO gaps for a competence, no recommendation generated — correct
- **BUT**: Collaborative filtering (MSAS) adds peer score that can override gap relevance

### Check 5: Completed trainings excluded
**RESULT: PARTIAL**

```python
# recommendation_engine.py:227-230
formations_completees = {
    i["formation_id"] for i in inscriptions
    if i.get("etat") == "APPROVED"
}
# Line 331-332:
if fid in formations_completees:
    continue
```
- Only excludes if `inscription.etat == APPROVED`
- Misses: completed via `presences` without inscription, completed via `certificates`

### Check 6: No mixed ENS/T ID format after normalization
**RESULT: FAIL**

- DB queries use `enseignant_id` (ENS format)
- CSV fallback uses `teacher_id` (T format)
- `data_service.py:551` has **duplicate** `get_competency_levels` method (line 547 and 551) — one with validation, one without
- No normalization layer at API boundary

### Check 7: No cache key or React query key ignores teacher_id
**RESULT: UNKNOWN (Frontend not audited)**

Backend caches:
- `PredictionCache` (gap_predictor.py:102-147) — key = `f"{teacher_id}:{top_n}"` ✅ includes teacher_id
- DashboardEngine caches global KPIs (no teacher_id) — by design for global scope
- No per-teacher cache invalidation on data change

### Check 8: No endpoint returns global/shared data for teacher-specific requests
**RESULT: PASS**

All teacher-specific endpoints in `analytics.py`:
- `/gaps/{enseignant_id}` — filtered by `enseignant_id`
- `/risk/{enseignant_id}` — filtered by `enseignant_id`
- `/recommendations/{enseignant_id}` — filtered by `enseignant_id`
- `/forecast/{enseignant_id}` — filtered by `enseignant_id`
- `/benchmark/{enseignant_id}` — filtered by `enseignant_id`

Global endpoints (require ADMIN/CUP):
- `/dashboard/global`
- `/dashboard/gap-heatmap`
- `/dashboard/teachers-at-risk`
- `/dashboard/training-effectiveness`

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PREDICTIVE ANALYTICS SERVICE                 │
├─────────────────────────────────────────────────────────────────┤
│  Routers (analytics.py, d2f_master.py)                          │
│    │                                                            │
│    ▼                                                            │
│  DataService ──▶ Raw SQL (PostgreSQL)                           │
│    │                     │                                      │
│    ├─▶ enseignants ──────┼──▶ User Management (auth schema)     │
│    ├─▶ enseignant_competences, niveau_savoir_requis,            │
│    │   competence_prerequisite ────▶ Competency Service         │
│    │   (competence schema)                                       │
│    ├─▶ formations, formation_competences, inscriptions,         │
│    │   presences, evaluation_globale, certificates ──▶ Training │
│    │   (formation schema)                                        │
│    └─▶ besoin_formation (besoin schema)                          │
│                                                                 │
│  Engines: GapEngine, RecommendationEngine, RiskScoring,         │
│           ForecastEngine, CollaborativeFilter, AlertEngine      │
│                                                                 │
│  ML: GapPredictor (GradientBoosting/XGBoost/LightGBM/MLP)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Summary: Integration Status

| Service | Connection | Contract | Sync | Write-Back | Status |
|---------|------------|----------|------|------------|--------|
| User Management | Direct SQL | ❌ None | Batch (nightly) | ❌ No | **PARTIAL** |
| Competency | Direct SQL | ❌ None | Batch (nightly) | ❌ No | **PARTIAL** |
| Training | Direct SQL | ❌ None | Batch (nightly) | ❌ No | **PARTIAL** |

**Overall: PARTIAL** — Connected at data layer but no API contracts, no real-time sync, no write-back, ID format mismatch.

---

## 7. Immediate Actions Required

1. **Define canonical teacher_id** (ENS format from DB) and create `teacher_id_mapping` table
2. **Add API contracts** (OpenAPI) for User Management / Competency / Training services
3. **Implement CDC or event-driven sync** (RabbitMQ already configured in settings)
4. **Add validation endpoints** to verify cross-service consistency
5. **Fix ID normalization** at API boundary (reject mixed formats)
6. **Expand training catalog** to ≥10 active trainings for demo
7. **Add competency_status column** to track explicit exclusions

---

## Appendix: Key Files Audited

| File | Lines | Purpose |
|------|-------|---------|
| `app/services/data_service.py` | 694 | All raw SQL queries to external services |
| `app/routers/analytics.py` | 1265+ | Main API endpoints, pipeline orchestration |
| `app/engines/gap_engine.py` | 265 | Gap computation per teacher |
| `app/engines/recommendation_engine.py` | 423 | Training recommendation generation |
| `app/engines/collaborative.py` | 271 | Peer-based scoring (MSAS) |
| `app/routers/d2f_master.py` | 571 | Master dataset CSV endpoints |
| `pipelines/generate_d2f_dataset.py` | 403 | Master dataset generator (T001..T030 format) |
| `pipelines/generate_training_corpus.py` | 210 | ML training corpus generator |