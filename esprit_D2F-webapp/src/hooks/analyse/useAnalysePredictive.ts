import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AnalysePredictiveService from '@/services/analyse/AnalysePredictiveService';
import type {
  DecliningCompetency,
  InDemandCompetency,
  TeacherRiskIndicator,
  DriftReport,
  GapHeatmapCell,
  RiskEvolutionPoint,
  TrainingEffectiveness,
  ModelPerformance,
  OverviewKpis,
  DemandForecast,
  TrainingNeedsForecast,
  AlertSummary,
  BulkAlertUpdateRequest,
  PriorityAction,
  BatchRecommendationRequest,
  SupplyDemandItem,
  RiskDistribution,
  HeatmapDrilldown,
  TopFormation,
} from '@/models/analyse';

export function useDashboardSummary() {
  return useQuery<{
    declining_competencies?: DecliningCompetency[];
    in_demand_competencies?: InDemandCompetency[];
    teacher_risk_indicators?: TeacherRiskIndicator[];
  }>({
    queryKey: ['analyse', 'dashboard-summary'],
    queryFn: () => AnalysePredictiveService.getDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrainModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => AnalysePredictiveService.retrainModel(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyse'] }),
  });
}

export function useAnalyserEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      enseignantId,
      competenceCible,
      autoTrain,
    }: {
      enseignantId: string;
      competenceCible?: string;
      autoTrain?: boolean;
    }) => AnalysePredictiveService.analyserEnseignant(enseignantId, competenceCible, { autoTrain }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analyse'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePredictGaps() {
  return useMutation({
    mutationFn: ({
      enseignantId,
      horizonMonths,
      topN,
    }: {
      enseignantId: string;
      horizonMonths?: number;
      topN?: number;
    }) => AnalysePredictiveService.predictGaps(enseignantId, horizonMonths, topN),
  });
}

export function useAnalyseTendancesGlobales() {
  return useQuery<{
    dashboard: {
      competencesEnDeclin: string[];
      competencesEnForteDemande: string[];
      enseignantsARisque: string[];
    };
    rawDeclining: DecliningCompetency[];
    rawInDemand: InDemandCompetency[];
    rawRiskIndicators: TeacherRiskIndicator[];
  }>({
    queryKey: ['analyse', 'tendances-globales'],
    queryFn: () => AnalysePredictiveService.analyserTendancesGlobales(),
  });
}

export function useDriftStatus() {
  return useQuery<DriftReport>({
    queryKey: ['analyse', 'drift'],
    queryFn: () => AnalysePredictiveService.getDrift(),
  });
}

export function useDecliningCompetencies() {
  return useQuery<DecliningCompetency[]>({
    queryKey: ['analyse', 'declining'],
    queryFn: () => AnalysePredictiveService.getDecliningCompetencies(),
  });
}

export function useInDemandCompetencies() {
  return useQuery<InDemandCompetency[]>({
    queryKey: ['analyse', 'in-demand'],
    queryFn: () => AnalysePredictiveService.getInDemandCompetencies(),
  });
}

export function useTeacherRiskIndicators() {
  return useQuery<TeacherRiskIndicator[]>({
    queryKey: ['analyse', 'risk-indicators'],
    queryFn: () => AnalysePredictiveService.getTeacherRiskIndicators(),
  });
}

export function useGapHeatmap() {
  return useQuery<GapHeatmapCell[]>({
    queryKey: ['analyse', 'gap-heatmap'],
    queryFn: () => AnalysePredictiveService.getGapHeatmap(),
  });
}

export function useTrainingEffectiveness() {
  return useQuery<TrainingEffectiveness[]>({
    queryKey: ['analyse', 'training-effectiveness'],
    queryFn: () => AnalysePredictiveService.getTrainingEffectiveness(),
  });
}

export function useTopFormations() {
  return useQuery<TopFormation[]>({
    queryKey: ['analyse', 'top-formations'],
    queryFn: () => AnalysePredictiveService.getTopFormationsRecommandees(),
  });
}

export function useRiskEvolution(months = 6) {
  return useQuery<RiskEvolutionPoint[]>({
    queryKey: ['analyse', 'risk-evolution', months],
    queryFn: () => AnalysePredictiveService.getRiskEvolution(months),
  });
}

export function useModelPerformance() {
  return useQuery<ModelPerformance>({
    queryKey: ['analyse', 'model-performance'],
    queryFn: () => AnalysePredictiveService.getModelPerformance(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOverview() {
  return useQuery<OverviewKpis>({
    queryKey: ['analyse', 'overview'],
    queryFn: () => AnalysePredictiveService.getOverview(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDemandForecast(months = 6) {
  return useQuery<DemandForecast>({
    queryKey: ['analyse', 'demand-forecast', months],
    queryFn: () => AnalysePredictiveService.getDemandForecast(months),
  });
}

export function useTrainingNeedsForecast(months = 6, historyMonths = 12) {
  return useQuery<TrainingNeedsForecast>({
    queryKey: ['analyse', 'training-needs-forecast', months, historyMonths],
    queryFn: () => AnalysePredictiveService.getTrainingNeedsForecast(months, historyMonths),
  });
}

// ── Centre d'Action — Alertes ────────────────────────────────
export function useAlertsSummary() {
  return useQuery<AlertSummary>({
    queryKey: ['analyse', 'alerts-summary'],
    queryFn: () => AnalysePredictiveService.getAlertsSummary(),
  });
}

export function useBulkUpdateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAlertUpdateRequest) =>
      AnalysePredictiveService.bulkUpdateAlerts(payload),
    onMutate: async (newStatus) => {
      await qc.cancelQueries({ queryKey: ['analyse', 'alerts-summary'] });
      const previousData = qc.getQueryData(['analyse', 'alerts-summary']);
      qc.setQueryData(['analyse', 'alerts-summary'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          alerts: (old.alerts ?? []).map((a: any) =>
            newStatus.alert_ids.includes(a.id)
              ? { ...a, statut: newStatus.statut, commentaire_traitement: newStatus.commentaire }
              : a,
          ),
        };
      });
      return { previousData };
    },
    onError: (_err, _newStatus, context) => {
      if (context?.previousData) {
        qc.setQueryData(['analyse', 'alerts-summary'], context.previousData);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['analyse', 'alerts-summary'] });
    },
  });
}

// ── Centre d'Action — Actions prioritaires ────────────────────
export function usePriorityActions(limit = 20, departementId?: string) {
  return useQuery<PriorityAction[]>({
    queryKey: ['analyse', 'priority-actions', limit, departementId],
    queryFn: () => AnalysePredictiveService.getPriorityActions(limit, departementId),
  });
}

// ── Centre d'Action — Recommandations par cohorte ───────────
export function useBatchRecommendations() {
  return useMutation({
    mutationFn: (payload: BatchRecommendationRequest) =>
      AnalysePredictiveService.getBatchRecommendations(payload),
  });
}

// ── Visualisations avancées ──────────────────────────────────
export function useSupplyDemand() {
  return useQuery<SupplyDemandItem[]>({
    queryKey: ['analyse', 'supply-demand'],
    queryFn: () => AnalysePredictiveService.getSupplyDemand(),
  });
}

export function useRiskDistribution() {
  return useQuery<RiskDistribution>({
    queryKey: ['analyse', 'risk-distribution'],
    queryFn: () => AnalysePredictiveService.getRiskDistribution(),
  });
}

export function useHeatmapDrilldown(departement: string | null, competenceId: number | null) {
  return useQuery<HeatmapDrilldown>({
    queryKey: ['analyse', 'heatmap-drilldown', departement, competenceId],
    queryFn: () =>
      AnalysePredictiveService.getHeatmapDrilldown(departement as string, competenceId as number),
    enabled: !!departement && competenceId != null,
  });
}

// ── Nouvelles fonctionnalités : impact formations & simulation what-if ──
export function useTrainingImpact() {
  return useQuery({
    queryKey: ['analyse', 'training-impact'],
    queryFn: () => AnalysePredictiveService.getTrainingImpact(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrainingImpactFormations(page = 0, size = 20) {
  return useQuery({
    queryKey: ['analyse', 'training-impact-formations', page, size],
    queryFn: () => AnalysePredictiveService.getTrainingImpactFormations(page, size),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSimulateWhatIf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      enseignant_id: string;
      plan: Array<{ competence_id: number; niveau_vise: number; formation_id?: number }>;
      horizon_mois?: number;
    }) => AnalysePredictiveService.simulateWhatIf(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyse'] }),
  });
}
