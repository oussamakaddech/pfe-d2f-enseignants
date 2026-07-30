# FRONTEND_ANALYTICS_CHANGELOG.md

**Date:** 2026-07-11  
**Module:** esprit_D2F-webapp (React/TypeScript frontend)  
**Scope:** P0 + P1 frontend analytics/dashboard remediation

---

## 1. Completed Work

### P0 — Route Mounting & Access

| # | Finding | Change | Files |
|---|---------|--------|-------|
| P0-1 | ExecutiveDashboard not mounted | Added lazy route + sidebar entry for ADMIN/CUP/CHEF_DEPARTEMENT | `routes/index.tsx`, `sideMenuData.ts` |
| P0-2 | PriorityAlertsPanel unreachable | Created AlertsCenterPage wrapper, mounted route + sidebar entry | `pages/analyse/AlertsCenterPage.tsx` (NEW), `routes/index.tsx`, `sideMenuData.ts` |
| P0-3 | PersonalDashboard not mounted | Added lazy route + sidebar entry for ENSEIGNANT/ANIMATEUR | `routes/index.tsx`, `sideMenuData.ts` |

### P1 — Data Correctness & UX

| # | Finding | Change | Files |
|---|---------|--------|-------|
| P1-1 | Hardcoded 2025 dates in ParticipantKPIChart | Replaced with `dayjs().startOf("year")` / `dayjs().endOf("year")` | `pages/kpiFormation/ParticipantKPIChart.tsx` |
| P1-2 | Export always sends RAPPORT_MENSUEL | Conditional: MOIS→RAPPORT_MENSUEL, ANNEE→RAPPORT_ANNUEL, SEMAINE/TRIMESTRE disabled with tooltip | `pages/analyse/FormationsParPeriodePage.tsx` |
| P1-3 | Teacher analytics uses free-text input | Created server-side search via `/api/v1/unified-profiles?search=`, debounced 300ms, min 2 chars, 20 results max | `services/formation/UnifiedProfileService.ts` (NEW), `hooks/formation/useTeacherSearch.ts` (NEW), `pages/analyse/TeacherAnalyticsPage.tsx` |
| P1-4 | Modal closes on backdrop click | Added `maskClosable={false}` to TrainingPath modal | `pages/analyse/TeacherAnalyticsPage.tsx` |
| P1-5 | AnalysePredictivePage has no date range | Added Segmented date-range selector (30j/6m/12m/année) + "Historique complet" badges on unsupported widgets | `pages/analyse/AnalysePredictivePage.tsx` |
| P1-6 | GapHeatmap lacks drilldown | Made cells clickable, added drilldown modal with per-teacher table | `components/charts/glass/GlassHeatmap.tsx`, `pages/analyse/AnalysePredictivePage.tsx` |
| P1-7 | DashboardGlass has no detail links | Added "Voir toutes les alertes →" link in alerts section | `pages/dashboard/DashboardGlass.tsx` |
| P1-8 | PersonalDashboard/ExecutiveDashboard use hardcoded role | Refactored to derive role from `useAuth()` via `normalizeRole` | `pages/dashboard/ExecutiveDashboard.tsx`, `pages/dashboard/PersonalDashboard.tsx` |

---

## 2. Changed Files

### New Files (3)
| File | Purpose |
|------|---------|
| `src/pages/analyse/AlertsCenterPage.tsx` | Alerts center page wrapper for PriorityAlertsPanel |
| `src/services/formation/UnifiedProfileService.ts` | Server-side teacher search service |
| `src/hooks/formation/useTeacherSearch.ts` | React Query hook for debounced teacher search |

### Modified Files (10)
| File | Changes |
|------|---------|
| `src/routes/index.tsx` | Added 3 lazy imports (ExecutiveDashboard, PersonalDashboard, AlertsCenterPage) + 3 routes |
| `src/components/layout/sideMenuData.ts` | Added nav entries: "Dashboard exécutif" + "Alertes" (admin/cup/chef), "Mon espace" (enseignant/animateur) |
| `src/pages/dashboard/ExecutiveDashboard.tsx` | Made role prop optional, derives from useAuth() |
| `src/pages/dashboard/PersonalDashboard.tsx` | Made role prop optional, derives from useAuth() |
| `src/pages/dashboard/DashboardGlass.tsx` | Added "Voir toutes les alertes →" link |
| `src/pages/analyse/TeacherAnalyticsPage.tsx` | Replaced Input with AutoComplete, added modal safety (maskClosable=false) |
| `src/pages/analyse/FormationsParPeriodePage.tsx` | Conditional export: enable monthly/annual, disable weekly/quarterly with tooltip |
| `src/pages/analyse/AnalysePredictivePage.tsx` | Added date-range selector, "Historique complet" badges, GapHeatmap drilldown modal |
| `src/pages/kpiFormation/ParticipantKPIChart.tsx` | Replaced hardcoded 2025 dates with dayjs() |
| `src/components/charts/glass/GlassHeatmap.tsx` | Added onCellClick callback for drilldown, keyboard accessibility |

---

## 3. New Routes & Allowed Roles

| Route | Component | Roles | Guard |
|-------|-----------|-------|-------|
| `/home/executive-dashboard` | ExecutiveDashboard | ADMIN, CUP, CHEF_DEPARTEMENT | RoleGuard |
| `/home/personal-dashboard` | PersonalDashboard | ENSEIGNANT, ANIMATEUR | RoleGuard |
| `/home/analytics/alerts` | AlertsCenterPage | ADMIN, CUP, CHEF_DEPARTEMENT | RoleGuard |

---

## 4. Connected Endpoints & Query Parameters

| Endpoint | Service | Used By | Query Key |
|----------|---------|---------|-----------|
| `GET /api/v1/unified-profiles?search=&size=20` | formation (8088) | useTeacherSearch | `["teacherSearch", "unified-profiles", term]` |
| `GET /analyse/v1/alerts/summary` | analyse (8089) | AlertsCenterPage | `["analyse", "alerts-summary"]` |
| `PATCH /analyse/v1/alerts/bulk` | analyse (8089) | AlertsCenterPage | mutation |
| `GET /analyse/v1/analytics/dashboard/gap-heatmap/:dept/:compId` | analyse (8089) | AnalysePredictivePage drilldown | `["analyse", "heatmap-drilldown", dept, compId]` |

---

## 5. Quality Gates Results

| Gate | Result |
|------|--------|
| ESLint | ✅ 0 errors, 20 warnings (all pre-existing) |
| TypeScript typecheck (`tsc --noEmit`) | ✅ Clean — 0 errors |
| Vite production build | ✅ Built in 27.44s |
| Tests (`vitest run`) | ✅ 416 passed, 6 skipped, 3 failed (all pre-existing) |

---

## 6. Manual Validation Checklist

- [ ] `/home/executive-dashboard` renders ExecutiveDashboard for ADMIN/CUP/CHEF_DEPARTEMENT
- [ ] `/home/executive-dashboard` returns 403 for ENSEIGNANT/ANIMATEUR
- [ ] `/home/analytics/alerts` renders PriorityAlertsPanel with loading/empty/error states
- [ ] `/home/personal-dashboard` renders PersonalDashboard for ENSEIGNANT/ANIMATEUR
- [ ] `/home/personal-dashboard` returns 403 for ADMIN/CUP
- [ ] Sidebar shows "Dashboard exécutif" + "Alertes" for admin/cup/chef
- [ ] Sidebar shows "Mon espace" for enseignant/animateur
- [ ] "Voir toutes les alertes →" link visible on DashboardGlass when alerts exist
- [ ] Teacher autocomplete triggers after 2+ chars, shows max 20 results
- [ ] Teacher autocomplete debounces 300ms, no flicker
- [ ] Selecting a teacher from autocomplete loads gaps/recommendations
- [ ] Deep link `/home/analytics/teacher/:id` pre-fills and loads
- [ ] TrainingPath modal: clicking backdrop does NOT close it
- [ ] TrainingPath modal: X button closes it, Escape key closes it
- [ ] ParticipantKPIChart defaults to current year dates
- [ ] FormationsParPeriodePage: export disabled for SEMAINE/TRIMESTRE with tooltip
- [ ] FormationsParPeriodePage: export enabled for MOIS (RAPPORT_MENSUEL) and ANNEE (RAPPORT_ANNUEL)
- [ ] AnalysePredictivePage: Segmented date-range selector visible (30j/6m/12m/année)
- [ ] AnalysePredictivePage: "Historique complet" badges on Risk, Heatmap, Training Needs sections
- [ ] GapHeatmap: clicking a cell opens drilldown modal with teacher list
- [ ] GapHeatmap drilldown: keyboard accessible (Enter/Space to activate)

---

## 7. Known Limitations

1. **Date-range filtering:** Most analytics backend endpoints (overview, risk-distribution, gap-heatmap, demand-forecast, training-needs-forecast, etc.) do NOT accept start/end date parameters. The Segmented selector is present for UI consistency with ExecutiveDashboard, but widgets display "Historique complet" badges since they cannot filter by date range server-side.

2. **AutoComplete loading state:** Ant Design v5 `AutoComplete` explicitly omits the `loading` prop. Loading is indicated via `notFoundContent` text ("Chargement…") instead.

3. **GlobalSearch preload:** The existing `GlobalSearch` component (Ctrl+K) still uses `EnseignantService.getAllEnseignants(size=5000)` for client-side filtering. This was not in scope for this change. The new `useTeacherSearch` hook uses server-side search exclusively.

---

## 8. Backend Security Dependencies

1. **CHEF_DEPARTEMENT dashboard data scope:** Analytics endpoints (`/dashboard/global`, `/teachers-at-risk`, `/dashboard/overview`, etc.) do NOT appear to filter data by department for CHEF_DEPARTEMENT role. The backend `UnifiedProfileController` does enforce department-scoped row-level filtering for the `/unified-profiles` endpoint via `UnifiedProfileService.isDepartmentScoped()`. However, the predictive analytics pipeline endpoints have no visible per-department restriction. **Security review recommended for backend analytics endpoints.**

2. **Teacher autocomplete RBAC:** The `/api/v1/unified-profiles` endpoint correctly enforces CHEF_DEPARTEMENT department scope via `UnifiedProfileSpecifications` + `CurrentUser.isDepartmentScoped()`. This is verified and safe.

3. **Export authorization:** PDF and Excel export endpoints should verify role server-side. Frontend cannot enforce this — role guard is frontend-only.

4. **No client-side department ID sent for authorization:** The frontend does NOT send a department ID as a parameter to enforce access control. All scope derivation comes from the authenticated identity via HttpOnly cookie.

---

## 10. Backend Data Pipeline Fixes (P4 — Identical Recommendations)

**Issue:** ENS002/T002 and ENS003/T003 showed identical recommendations, scores, gaps count, and alerts count.

**Root Cause:** `seed_remaining.sql` used hardcoded constant scores for all generic recommendations (`score_global=0.72`, `probabilite_reussite=0.68`), making teachers with the same gap competences appear to have identical recommendations.

**Fix:** Replaced hardcoded constants with gap-score-dependent dynamic formulas:
- `score_pertinence` = `GREATEST(0.4, LEAST(0.98, gap_score * 0.9 + 0.1))`
- `score_taux_reussite` = `GREATEST(0.4, LEAST(0.95, 1.0 - gap_score * 0.3))`
- `score_disponibilite` = `GREATEST(0.5, LEAST(0.98, 0.8 - gap_score * 0.05))`
- `score_global` = `GREATEST(0.4, LEAST(0.98, gap_score * 0.85 +urgence_bonus))`
- `probabilite_reussite` = `GREATEST(0.4, LEAST(0.95, gap_score * 0.7 + urgence_bonus))`
- `rang_dans_parcours` uses `ROW_NUMBER() OVER (PARTITION BY teacher ORDER BY gap.priorite_score DESC)` for correct ordering

**Files changed:** `init_db/seed_remaining.sql`

**File changed:** `reports/cross_service_integration_audit.md` — updated fixed issues list

---

## 9. Teacher Search Confirmation

**Confirmed:** The `TeacherAnalyticsPage` autocomplete flow uses **server-side search only** via `UnifiedProfileService.search()` → `GET /api/v1/unified-profiles?search={term}&size=20`. There is **no preloading of 5000 teachers** in the autocomplete flow. The existing `EnseignantService.getAllEnseignants(size=5000)` is used only by `GlobalSearch` (Ctrl+K), which was not in scope for this change.
