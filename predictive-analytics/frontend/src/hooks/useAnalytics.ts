import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";

export function useTeacherGaps(teacherId: string) {
  return useQuery({
    queryKey: ["gaps", teacherId],
    queryFn: () => endpoints.teacherGaps(teacherId),
    enabled: teacherId.length > 0,
    staleTime: 60_000,
  });
}

export function useTeacherRecommendations(teacherId: string, limit = 10) {
  return useQuery({
    queryKey: ["recommendations", teacherId, limit],
    queryFn: () => endpoints.teacherRecommendations(teacherId, limit),
    enabled: teacherId.length > 0,
    staleTime: 60_000,
  });
}

export function useTeacherLearningPath(teacherId: string) {
  return useQuery({
    queryKey: ["learning-path", teacherId],
    queryFn: () => endpoints.teacherLearningPath(teacherId),
    enabled: teacherId.length > 0,
    staleTime: 60_000,
  });
}

export function useTeacherRisk(teacherId: string) {
  return useQuery({
    queryKey: ["risk", teacherId],
    queryFn: () => endpoints.teacherRisk(teacherId),
    enabled: teacherId.length > 0,
    staleTime: 60_000,
  });
}

export function useTeacherDataQuality(teacherId: string) {
  return useQuery({
    queryKey: ["data-quality", teacherId],
    queryFn: () => endpoints.teacherDataQuality(teacherId),
    enabled: teacherId.length > 0,
    staleTime: 60_000,
  });
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: endpoints.dashboardKpis,
    staleTime: 180_000,
  });
}

export function useDashboardAtRisk() {
  return useQuery({
    queryKey: ["dashboard", "at-risk"],
    queryFn: endpoints.dashboardAtRisk,
    staleTime: 180_000,
  });
}

export function useDashboardHeatmap() {
  return useQuery({
    queryKey: ["dashboard", "heatmap"],
    queryFn: endpoints.dashboardHeatmap,
    staleTime: 180_000,
  });
}

export function useDashboardTrainingDemand() {
  return useQuery({
    queryKey: ["dashboard", "demand"],
    queryFn: endpoints.dashboardTrainingDemand,
    staleTime: 180_000,
  });
}

export function useMlScore(target: "completion_probability" | "training_effectiveness_score") {
  return useMutation({
    mutationFn: (teacherId: string) => endpoints.mlScore(target, teacherId),
  });
}
