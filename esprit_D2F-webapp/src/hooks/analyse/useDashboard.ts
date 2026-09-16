import { useQuery } from "@tanstack/react-query";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import type { DashboardData } from "@/models/analyse";

export function useDashboard() {
  const dashboardQ = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => AnalyticsService.getDashboardGlobal(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    loading: dashboardQ.isLoading,
    dashboard: dashboardQ.data ?? null,
    error: dashboardQ.isError
      ? "Impossible de charger le tableau de bord"
      : null,
    lastUpdate: dashboardQ.dataUpdatedAt
      ? new Date(dashboardQ.dataUpdatedAt).toLocaleTimeString("fr-FR")
      : null,
    refetch: () => dashboardQ.refetch(),
  };
}
