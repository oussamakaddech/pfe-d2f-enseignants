import { lazy } from "react";
import { Route } from "react-router-dom";
import { RoleGuard } from "@/routes/guards";
import { ROLES } from "@/utils/constants/roles";

const AnalyticsTeacherPage = lazy(() => import("../pages/AnalyticsTeacherPage"));
const AnalyticsDashboardPage = lazy(() => import("../pages/AnalyticsDashboardPage"));
const ModelMonitoringPage = lazy(() => import("../pages/ModelMonitoringPage"));
const HeatmapPage = lazy(() => import("../pages/HeatmapPage"));
const ForecastPage = lazy(() => import("../pages/ForecastPage"));

/**
 * Routes du feature-module Analytics.
 * RBAC :
 *  - Teacher : sa propre analyse (le backend applique la garde BOLA).
 *  - CHEFDEPARTEMENT : dashboard agrégé sur son périmètre.
 *  - CUP / ADMIN : dashboard global + monitoring modèle.
 *
 * RoleGuard rend un <Outlet/>, donc chaque route est déclarée en deux niveaux :
 * le parent porte la garde, l'enfant porte la page.
 */
export const analyticsRoutes = (
  <>
    <Route
      path="/home/analytics/teacher/:enseignantId"
      element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.ENSEIGNANT, ROLES.CHEF_DEPARTEMENT]} />}
    >
      <Route index element={<AnalyticsTeacherPage />} />
    </Route>
    <Route
      path="/home/analytics/dashboard"
      element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />}
    >
      <Route index element={<AnalyticsDashboardPage />} />
    </Route>
    <Route
      path="/home/analytics/heatmap"
      element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />}
    >
      <Route index element={<HeatmapPage />} />
    </Route>
    <Route
      path="/home/analytics/monitoring"
      element={<RoleGuard allowedRoles={[ROLES.ADMIN]} />}
    >
      <Route index element={<ModelMonitoringPage />} />
    </Route>
    <Route
      path="/home/analytics/forecast"
      element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.CUP, ROLES.CHEF_DEPARTEMENT]} />}
    >
      <Route index element={<ForecastPage />} />
    </Route>
  </>
);
