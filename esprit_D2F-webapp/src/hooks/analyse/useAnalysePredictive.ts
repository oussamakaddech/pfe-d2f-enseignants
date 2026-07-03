import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AnalysePredictiveService from "@/services/analyse/AnalysePredictiveService";
import type {
  DecliningCompetency, InDemandCompetency, TeacherRiskIndicator, DriftReport,
  GapHeatmapCell, RiskEvolutionPoint, TrainingEffectiveness, ModelPerformance,
  OverviewKpis, DemandForecast,
  AlertSummary, BulkAlertUpdateRequest, BulkAlertUpdateResponse,
  PriorityAction, BatchRecommendationRequest, BatchRecommendationResponse,
  SupplyDemandItem, RiskDistribution, HeatmapDrilldown,
} from "@/models/analyse";

export function useDashboardSummary() {
  return useQuery<{
    declining_competencies?: DecliningCompetency[];
    in_demand_competencies?: InDemandCompetency[];
    teacher_risk_indicators?: TeacherRiskIndicator[];
  }>({
    queryKey: ["analyse", "dashboard-summary"],
    queryFn: () => AnalysePredictiveService.getDashboardSummary(),
  });
}

export function useTrainModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => AnalysePredictiveService.retrainModel(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analyse"] }),
  });
}

export function useAnalyserEnseignant() {
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
    dashboard: { competencesEnDeclin: string[]; competencesEnForteDemande: string[]; enseignantsARisque: string[] };
    rawDeclining: DecliningCompetency[];
    rawInDemand: InDemandCompetency[];
    rawRiskIndicators: TeacherRiskIndicator[];
  }>({
    queryKey: ["analyse", "tendances-globales"],
    queryFn: () => AnalysePredictiveService.analyserTendancesGlobales(),
  });
}

export function useDriftStatus() {
  return useQuery<DriftReport>({
    queryKey: ["analyse", "drift"],
    queryFn: () => AnalysePredictiveService.getDrift(),
  });
}

export function useDecliningCompetencies() {
  return useQuery<DecliningCompetency[]>({
    queryKey: ["analyse", "declining"],
    queryFn: () => AnalysePredictiveService.getDecliningCompetencies(),
  });
}

export function useInDemandCompetencies() {
  return useQuery<InDemandCompetency[]>({
    queryKey: ["analyse", "in-demand"],
    queryFn: () => AnalysePredictiveService.getInDemandCompetencies(),
  });
}

export function useTeacherRiskIndicators() {
  return useQuery<TeacherRiskIndicator[]>({
    queryKey: ["analyse", "risk-indicators"],
    queryFn: () => AnalysePredictiveService.getTeacherRiskIndicators(),
  });
}

export function useGapHeatmap() {
  return useQuery<GapHeatmapCell[]>({
    queryKey: ["analyse", "gap-heatmap"],
    queryFn: () => AnalysePredictiveService.getGapHeatmap(),
  });
}

export function useTrainingEffectiveness() {
  return useQuery<TrainingEffectiveness[]>({
    queryKey: ["analyse", "training-effectiveness"],
    queryFn: () => AnalysePredictiveService.getTrainingEffectiveness(),
  });
}

export function useRiskEvolution(months = 6) {
  return useQuery<RiskEvolutionPoint[]>({
    queryKey: ["analyse", "risk-evolution", months],
    queryFn: () => AnalysePredictiveService.getRiskEvolution(months),
  });
}

export function useModelPerformance() {
  return useQuery<ModelPerformance>({
    queryKey: ["analyse", "model-performance"],
    queryFn: () => AnalysePredictiveService.getModelPerformance(),
  });
}

export function useOverview() {
  return useQuery<OverviewKpis>({
    queryKey: ["analyse", "overview"],
    queryFn: () => AnalysePredictiveService.getOverview(),
  });
}

export function useDemandForecast(months = 6) {
  return useQuery<DemandForecast>({
    queryKey: ["analyse", "demand-forecast", months],
    queryFn: () => AnalysePredictiveService.getDemandForecast(months),
  });
}

export function useRetrainModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => AnalysePredictiveService.retrainModel(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analyse"] }),
  });
}

// ── Centre d'Action — Alertes ────────────────────────────────
export function useAlertsSummary() {
  return useQuery<AlertSummary>({
    queryKey: ["analyse", "alerts-summary"],
    queryFn: () => AnalysePredictiveService.getAlertsSummary(),
  });
}

export function useBulkUpdateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAlertUpdateRequest) => AnalysePredictiveService.bulkUpdateAlerts(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analyse", "alerts-summary"] }),
  });
}

// ── Centre d'Action — Actions prioritaires ────────────────────
export function usePriorityActions(limit = 20, departementId?: string) {
  return useQuery<PriorityAction[]>({
    queryKey: ["analyse", "priority-actions", limit, departementId],
    queryFn: () => AnalysePredictiveService.getPriorityActions(limit, departementId),
  });
}

// ── Centre d'Action — Recommandations par cohorte ───────────
export function useBatchRecommendations() {
  return useMutation({
    mutationFn: (payload: BatchRecommendationRequest) => AnalysePredictiveService.getBatchRecommendations(payload),
  });
}

// ── Visualisations avancées ──────────────────────────────────
export function useSupplyDemand() {
  return useQuery<SupplyDemandItem[]>({
    queryKey: ["analyse", "supply-demand"],
    queryFn: () => AnalysePredictiveService.getSupplyDemand(),
  });
}

export function useRiskDistribution() {
  return useQuery<RiskDistribution>({
    queryKey: ["analyse", "risk-distribution"],
    queryFn: () => AnalysePredictiveService.getRiskDistribution(),
  });
}

export function useHeatmapDrilldown(departement: string | null, competenceId: number | null) {
  return useQuery<HeatmapDrilldown>({
    queryKey: ["analyse", "heatmap-drilldown", departement, competenceId],
    queryFn: () => AnalysePredictiveService.getHeatmapDrilldown(departement!, competenceId!),
    enabled: !!departement && competenceId != null,
  });
}
