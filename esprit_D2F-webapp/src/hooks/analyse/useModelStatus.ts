import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AnalysePredictiveService, { type DriftReport } from "@/services/analyse/AnalysePredictiveService";

export type ModelStatus = "loading" | "no_model" | "fresh" | "stale" | "drift" | "error";

function resolveStatus(report: DriftReport | undefined, isError: boolean): ModelStatus {
  if (isError) {
    return "error";
  }

  if (!report) {
    return "loading";
  }

  const message = String(report.message || "").toLowerCase();
  if (message.includes("no model") || message.includes("not trained") || message.includes("non entraîné")) {
    return "no_model";
  }

  if (report.drift_detected) {
    if (typeof report.days_since_training === "number" && report.days_since_training > 90) {
      return "stale";
    }
    return "drift";
  }

  return "fresh";
}

export function useModelStatus(refreshKey = 0) {
  const query = useQuery<DriftReport>({
    queryKey: ["analyse", "model-status", refreshKey],
    queryFn: () => AnalysePredictiveService.getDrift(),
  });

  const status = useMemo(
    () => resolveStatus(query.data, query.isError),
    [query.data, query.isError]
  );

  return {
    report: query.data,
    status,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}