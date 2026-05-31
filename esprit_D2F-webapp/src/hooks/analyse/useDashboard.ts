import { useQuery } from "@tanstack/react-query";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import type { DashboardData, TeacherRiskProfile } from "@/models/analyse";

export function useDashboard() {
  const dashboardQ = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => AnalyticsService.getDashboardGlobal(),
  });

  const atRiskQ = useQuery<TeacherRiskProfile[]>({
    queryKey: ["teachers-at-risk"],
    queryFn: () => AnalyticsService.getTeachersAtRisk(0.5),
  });

  return {
    loading: dashboardQ.isLoading || atRiskQ.isLoading,
    dashboard: dashboardQ.data ?? null,
    atRisk: atRiskQ.data ?? [],
    error:
      dashboardQ.isError || atRiskQ.isError
        ? "Impossible de charger le tableau de bord"
        : null,
    lastUpdate:
      dashboardQ.dataUpdatedAt
        ? new Date(dashboardQ.dataUpdatedAt).toLocaleTimeString("fr-FR")
        : null,
    refetch: () => {
      dashboardQ.refetch();
      atRiskQ.refetch();
    },
  };
}




