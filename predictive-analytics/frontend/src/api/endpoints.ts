import { apiRequest } from "./client";
import type {
  AtRiskResponse,
  GlobalKpis,
  HeatmapResponse,
  LearningPath,
  MlScoreResponse,
  RecommendationResult,
  RiskProfile,
  TeacherDataQualityReport,
  TeacherGapAnalysis,
  TrainingDemandResponse,
} from "./types";

export const endpoints = {
  teacherGaps: (teacherId: string) =>
    apiRequest<TeacherGapAnalysis>(`/teachers/${teacherId}/gaps`),
  teacherRecommendations: (teacherId: string, limit = 10) =>
    apiRequest<RecommendationResult>(`/teachers/${teacherId}/recommendations?limit=${limit}`),
  teacherLearningPath: (teacherId: string) =>
    apiRequest<LearningPath>(`/teachers/${teacherId}/learning-path`),
  teacherRisk: (teacherId: string) =>
    apiRequest<RiskProfile>(`/teachers/${teacherId}/risk`),
  teacherDataQuality: (teacherId: string) =>
    apiRequest<TeacherDataQualityReport>(`/teachers/${teacherId}/data-quality`),
  dashboardKpis: () => apiRequest<GlobalKpis>(`/dashboard/global`),
  dashboardAtRisk: () => apiRequest<AtRiskResponse>(`/dashboard/teachers-at-risk`),
  dashboardHeatmap: () => apiRequest<HeatmapResponse>(`/dashboard/gap-heatmap`),
  dashboardTrainingDemand: () =>
    apiRequest<TrainingDemandResponse>(`/dashboard/training-demand`),
  mlScore: (target: "completion_probability" | "training_effectiveness_score", teacherId: string) =>
    apiRequest<MlScoreResponse>(
      `/ml/score/${target === "completion_probability" ? "completion" : "effectiveness"}`,
      {
        method: "POST",
        body: { teacher_id: teacherId },
      },
    ),
};
