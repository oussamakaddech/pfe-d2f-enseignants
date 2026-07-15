/**
 * Hooks TanStack Query du feature-module Analytics.
 * Centralise cache, refetch, loading/error et invalidation.
 */
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "../services/analyticsApi";
import type {
  AlertUpdatePayload,
  DashboardFilters,
  GapsResponse,
  PilotageResponse,
  RecommendationsResponse,
  RiskHistoryResponse,
  RiskScore,
  TrainingPath,
} from "../types";

// ── Analyse individuelle ───────────────────────────────────
export function useAnalyzeTeacher(enseignantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsApi.analyze(enseignantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics", "gaps", enseignantId] });
      qc.invalidateQueries({ queryKey: ["analytics", "recos", enseignantId] });
      qc.invalidateQueries({ queryKey: ["analytics", "risk", enseignantId] });
    },
  });
}

export function useTeacherGaps(enseignantId: string, urgence?: string) {
  const [page, setPage] = useState(0);
  const query = useQuery<GapsResponse>({
    queryKey: ["analytics", "gaps", enseignantId, urgence, page],
    queryFn: () => analyticsApi.getGaps(enseignantId, { urgence, page, size: 20 }),
    enabled: !!enseignantId,
  });
  return { ...query, page, setPage };
}

export function useTeacherRecommendations(enseignantId: string, competenceId?: number) {
  const [page, setPage] = useState(0);
  const query = useQuery<RecommendationsResponse>({
    queryKey: ["analytics", "recos", enseignantId, competenceId, page],
    queryFn: () =>
      analyticsApi.getRecommendations(enseignantId, { competence_id: competenceId, page, size: 20 }),
    enabled: !!enseignantId,
  });
  return { ...query, page, setPage };
}

export function useTeacherTrainingPath(enseignantId: string, competenceId: number | null) {
  return useQuery<TrainingPath>({
    queryKey: ["analytics", "path", enseignantId, competenceId],
    queryFn: () => analyticsApi.getTrainingPath(enseignantId, competenceId as number),
    enabled: !!enseignantId && competenceId !== null,
  });
}

export function useTeacherRisk(enseignantId: string) {
  return useQuery<RiskScore>({
    queryKey: ["analytics", "risk", enseignantId],
    queryFn: () => analyticsApi.getRisk(enseignantId),
    enabled: !!enseignantId,
  });
}

export function useRiskHistory(enseignantId: string, mois = 12) {
  return useQuery<RiskHistoryResponse>({
    queryKey: ["analytics", "risk-history", enseignantId, mois],
    queryFn: () => analyticsApi.getRiskHistory(enseignantId, mois),
    enabled: !!enseignantId,
  });
}

export function usePilotage(horizonMois?: number) {
  return useQuery<PilotageResponse>({
    queryKey: ["analytics", "pilotage", horizonMois],
    queryFn: () => analyticsApi.getPilotage(horizonMois),
  });
}

// ── Dashboard global ───────────────────────────────────────
export function useDashboard(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ["analytics", "dashboard", filters],
    queryFn: () => analyticsApi.getDashboard(filters),
  });
}

export function useHeatmap(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ["analytics", "heatmap", filters],
    queryFn: () => analyticsApi.getHeatmap(filters),
  });
}

export function useAtRisk(filters?: DashboardFilters & { seuil?: number }) {
  return useQuery({
    queryKey: ["analytics", "at-risk", filters],
    queryFn: () => analyticsApi.getAtRisk(filters),
  });
}

export function useDecliningSkills(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ["analytics", "declining", filters],
    queryFn: () => analyticsApi.getDecliningSkills(filters),
  });
}

// ── Alertes (F5/F6) ───────────────────────────────────────
export function useAlerts(filters?: {
  type_alerte?: string;
  severite?: string;
  statut?: string;
  enseignant_id?: string;
  departement_id?: string;
  page?: number;
  size?: number;
}) {
  return useQuery({
    queryKey: ["analytics", "alerts", filters],
    queryFn: () => analyticsApi.getAlerts(filters),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AlertUpdatePayload }) =>
      analyticsApi.updateAlert(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics", "alerts"] });
      qc.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
    },
  });
}

// ── Monitoring modèle ──────────────────────────────────────
export function useModelStatus() {
  return useQuery({
    queryKey: ["analytics", "model", "status"],
    queryFn: () => analyticsApi.getModelStatus(),
    refetchInterval: 60_000,
  });
}

export function useModelDrift() {
  return useQuery({
    queryKey: ["analytics", "model", "drift"],
    queryFn: () => analyticsApi.getDrift(),
    refetchInterval: 60_000,
  });
}

export function useModelRetrain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsApi.retrain(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics", "model"] }),
  });
}

export function useModelRollback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsApi.rollback(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics", "model"] }),
  });
}

// ── Sélecteur d'enseignant réutilisable ────────────────────
export function useTeacherPicker() {
  const [enseignantId, setEnseignantId] = useState<string>("");
  const select = useCallback((id: string) => setEnseignantId(id), []);
  return { enseignantId, setEnseignantId: select };
}
