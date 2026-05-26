import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AnalysePredictiveService from "@/services/analyse/AnalysePredictiveService";
import type { AnalyseData, DecliningCompetency, InDemandCompetency, TeacherRiskIndicator, DriftReport } from "@/models/analyse";

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
    mutationFn: () => AnalysePredictiveService.trainModel(),
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
