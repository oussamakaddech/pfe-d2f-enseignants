import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AnalyticsService from '@/services/analyse/AnalyticsService';
import type {
  SkillForecast,
  PeerBenchmark,
  AnomalyDetectionResult,
  DepartmentAnomalyResult,
} from '@/models/analyse';

// ── 1) Prévision temporelle des niveaux de compétence ──
export function useForecast(
  enseignantId: string | null,
  opts: { horizonMois?: number; competenceId?: number } = {},
) {
  return useQuery<SkillForecast>({
    queryKey: ['forecast', enseignantId, opts.horizonMois, opts.competenceId],
    queryFn: () => AnalyticsService.getForecast(enseignantId!, opts),
    enabled: !!enseignantId,
    staleTime: 2 * 60 * 1000,
  });
}

// ── 2) Benchmark vs pairs ──
export function useBenchmark(enseignantId: string | null, parUp = false) {
  return useQuery<PeerBenchmark>({
    queryKey: ['benchmark', enseignantId, parUp],
    queryFn: () => AnalyticsService.getBenchmark(enseignantId!, { parUp }),
    enabled: !!enseignantId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── 3) Détection d'anomalies (enseignant) ──
export function useDetectAnomalies() {
  const qc = useQueryClient();
  return useMutation<AnomalyDetectionResult, Error, string>({
    mutationFn: (enseignantId: string) => AnalyticsService.detectAnomalies(enseignantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

// ── 3b) Détection d'anomalies (département) ──
export function useDetectAnomaliesDepartment() {
  const qc = useQueryClient();
  return useMutation<DepartmentAnomalyResult, Error, string>({
    mutationFn: (departementId: string) =>
      AnalyticsService.detectAnomaliesDepartment(departementId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
