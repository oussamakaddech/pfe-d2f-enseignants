import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AnalyticsService from "../services/AnalyticsService";
import type { AlertsResponse } from "../models/analytics";

interface AlertFilters {
  type_alerte?:   string;
  severite?:      string;
  statut?:        string;
  enseignant_id?: string;
  page:           number;
  size:           number;
}

export function useAlerts(initialFilters: Partial<AlertFilters> = {}) {
  const [filters, setFilters] = useState<AlertFilters>({
    page: 0,
    size: 20,
    ...initialFilters,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<AlertsResponse>({
    queryKey: ["alerts", filters],
    queryFn: () => AnalyticsService.getAlerts(filters),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      alertId,
      statut,
      traitePar,
      commentaire,
    }: {
      alertId: number;
      statut: string;
      traitePar?: string;
      commentaire?: string;
    }) => AnalyticsService.updateAlertStatus(alertId, statut, traitePar, commentaire),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const fetchAlerts = useCallback((overrides?: Partial<AlertFilters>) => {
    if (overrides) setFilters(prev => ({ ...prev, ...overrides }));
  }, []);

  const updateFilter = useCallback((partial: Partial<AlertFilters>) => {
    setFilters(prev => ({ ...prev, ...partial, page: 0 }));
  }, []);

  const resolveAlert = useCallback(
    (alertId: number, statut: string, traitePar?: string, commentaire?: string) =>
      resolveMutation.mutateAsync({ alertId, statut, traitePar, commentaire }),
    [resolveMutation],
  );

  return {
    loading: isLoading,
    data: data ?? null,
    error: isError ? "Impossible de charger les alertes" : null,
    filters,
    fetchAlerts,
    updateFilter,
    resolveAlert,
  };
}
