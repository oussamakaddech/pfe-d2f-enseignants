import { useQuery } from '@tanstack/react-query';
import AnalyticsService from '@/services/analyse/AnalyticsService';
import type { PilotageDashboard } from '@/models/analyse';

export function usePilotageDashboard(horizonMois?: number) {
  return useQuery<PilotageDashboard>({
    queryKey: ['pilotage-dashboard', horizonMois],
    queryFn: () => AnalyticsService.getPilotageDashboard({ horizonMois }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // rafraîchissement live des anomalies
  });
}
