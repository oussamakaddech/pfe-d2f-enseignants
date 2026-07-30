/**
 * React Query hooks for the D2F master dataset API.
 *
 * All hooks consume ONLY /api/v1/d2f/* endpoints.
 * Loading/error states handled centrally via React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import D2FService from "@/services/analyse/D2FService";

// ── KPI Dashboard ──────────────────────────────────────
export function useD2FKPIs() {
  return useQuery({
    queryKey: ["d2f", "kpis"],
    queryFn: () => D2FService.getKPIs(),
    staleTime: 60_000,
  });
}

// ── Teachers ───────────────────────────────────────────
export function useD2FTeachers(opts: { risk_level?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ["d2f", "teachers", opts],
    queryFn: () => D2FService.listTeachers(opts),
    staleTime: 60_000,
  });
}

export function useD2FTeacherProfile(teacherId: string | undefined) {
  return useQuery({
    queryKey: ["d2f", "teacher", teacherId],
    queryFn: () => D2FService.getTeacherProfile(teacherId!),
    enabled: !!teacherId,
    staleTime: 30_000,
  });
}

// ── At-Risk / Critical ─────────────────────────────────
export function useD2FAtRisk() {
  return useQuery({
    queryKey: ["d2f", "at-risk"],
    queryFn: () => D2FService.getAtRiskTeachers(),
    staleTime: 60_000,
  });
}

export function useD2FCritical() {
  return useQuery({
    queryKey: ["d2f", "critical"],
    queryFn: () => D2FService.getCriticalTeachers(),
    staleTime: 60_000,
  });
}

// ── Alerts ─────────────────────────────────────────────
export function useD2FAlerts(status?: string) {
  return useQuery({
    queryKey: ["d2f", "alerts", status],
    queryFn: () => D2FService.listAlerts(status),
    staleTime: 30_000,
  });
}

// ── Recommendations ────────────────────────────────────
export function useD2FRecommendations(priority?: string) {
  return useQuery({
    queryKey: ["d2f", "recommendations", priority],
    queryFn: () => D2FService.listRecommendations(priority),
    staleTime: 30_000,
  });
}

// ── Training Completion (Feedback Loop) ────────────────
export function useMarkTrainingCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, trainingCode }: { teacherId: string; trainingCode: string }) =>
      D2FService.markTrainingCompleted(teacherId, trainingCode),
    onSuccess: (_, vars) => {
      // Invalidate all queries affected by risk recompute
      qc.invalidateQueries({ queryKey: ["d2f", "kpis"] });
      qc.invalidateQueries({ queryKey: ["d2f", "at-risk"] });
      qc.invalidateQueries({ queryKey: ["d2f", "critical"] });
      qc.invalidateQueries({ queryKey: ["d2f", "teacher", vars.teacherId] });
    },
  });
}

// ── Heatmap (competence x departement) ────────────────
export function useD2FHeatmap() {
  return useQuery({
    queryKey: ["d2f", "heatmap"],
    queryFn: () => D2FService.getHeatmap(),
    staleTime: 60_000,
  });
}

// ── Top Formations recommandees ────────────────
export function useD2FTopFormations(limit: number = 10) {
  return useQuery({
    queryKey: ["d2f", "top-formations", limit],
    queryFn: () => D2FService.getTopFormations(limit),
    staleTime: 60_000,
  });
}

// ── Plan d'action prioritaire ────────────────
export function useD2FPlanActions() {
  return useQuery({
    queryKey: ["d2f", "plan-actions"],
    queryFn: () => D2FService.getPlanActions(),
    staleTime: 60_000,
  });
}

// ── Stats additionnelles (regression, stagnation, alertes critiques) ────────────────
export function useD2FStats() {
  return useQuery({
    queryKey: ["d2f", "stats"],
    queryFn: () => D2FService.getStats(),
    staleTime: 60_000,
  });
}
