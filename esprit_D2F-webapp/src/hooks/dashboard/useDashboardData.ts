import { useQuery } from '@tanstack/react-query';
import AnalyticsService from '@/services/analyse/AnalyticsService';
import type { DashboardData } from '@/models/analyse';
import type {
  AnalyticsDepartementResponse,
  AnalyticsUP,
  EnseignantsInactifsResponse,
  FormationsParPeriodeResponse,
} from '@/models/analyse/reporting';
import type { DashboardScope } from '@/models/dashboard';

const STALE = 5 * 60 * 1000; // 5 min : données de dashboard peu volatiles.
const INACTIFS_SEUIL_MOIS = 6;

/** KPIs globaux + alertes + top formations (ADMIN — non scopé, ne pas exposer au CUP). */
export function useGlobalDashboard(enabled: boolean) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'global'],
    queryFn: () => AnalyticsService.getDashboardGlobal(),
    enabled,
    staleTime: STALE,
  });
}

/** Enseignants inactifs (>N mois). Le serveur scope automatiquement le CUP. */
export function useInactifs(enabled = true) {
  return useQuery<EnseignantsInactifsResponse>({
    queryKey: ['dashboard', 'inactifs', INACTIFS_SEUIL_MOIS],
    queryFn: () =>
      AnalyticsService.getEnseignantsSansFormation({ mois: INACTIFS_SEUIL_MOIS, page: 0, size: 5 }),
    enabled,
    staleTime: STALE,
  });
}

/** Série temporelle formations/participants par mois (scopée serveur pour le CUP). */
export function useFormationsTimeline(scope: DashboardScope) {
  return useQuery<FormationsParPeriodeResponse>({
    queryKey: ['dashboard', 'timeline', scope.start, scope.end],
    queryFn: () =>
      AnalyticsService.getFormationsParPeriode({
        granularite: 'MOIS',
        debut: scope.start,
        fin: scope.end,
      }),
    enabled: !!scope.start && !!scope.end,
    staleTime: STALE,
  });
}

/** Participation par département (ADMIN uniquement côté serveur). */
export function useParticipationByDept(enabled: boolean) {
  return useQuery<AnalyticsDepartementResponse>({
    queryKey: ['dashboard', 'participation', 'dept'],
    queryFn: () => AnalyticsService.getFormationsParDepartement({}),
    enabled,
    staleTime: STALE,
  });
}

/** Participation par UP (scopée serveur — convient au CUP). */
export function useParticipationByUp(enabled: boolean) {
  return useQuery<{ items: AnalyticsUP[] }>({
    queryKey: ['dashboard', 'participation', 'up'],
    queryFn: () => AnalyticsService.getFormationsParUp({}),
    enabled,
    staleTime: STALE,
  });
}

export { INACTIFS_SEUIL_MOIS };
