import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EvaluationGlobaleService from "@/services/evaluation/EvaluationGlobaleService";
import EvaluationFormateurService from "@/services/evaluation/EvaluationFormateurService";
import type { Id } from "@/models/common";

export function useEvaluationsGlobales() {
  return useQuery<unknown[]>({
    queryKey: ["evaluations-globales"],
    queryFn: () => EvaluationGlobaleService.getAllEvaluationGlobales(),
  });
}

export function useEvaluationGlobaleByFormation(formationId: Id | undefined) {
  return useQuery<unknown>({
    queryKey: ["evaluations-globales", "formation", formationId],
    queryFn: () => EvaluationGlobaleService.getEvaluationGlobaleByFormationId(formationId!),
    enabled: !!formationId,
  });
}

export function useCreateEvaluationGlobale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => EvaluationGlobaleService.createEvaluationGlobale(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations-globales"] }),
  });
}

export function useUpdateEvaluationGlobale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: Id; data: Record<string, unknown> }) =>
      EvaluationGlobaleService.updateEvaluationGlobale(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations-globales"] }),
  });
}

export function useDeleteEvaluationGlobale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => EvaluationGlobaleService.deleteEvaluationGlobale(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations-globales"] }),
  });
}

export function useEvaluationsEnrichedByFormation(formationId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: ["evaluations-enriched", formationId],
    queryFn: () => EvaluationFormateurService.listEvaluationsEnrichedByFormation(formationId!),
    enabled: !!formationId,
  });
}

export function useUpdateEvaluationsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formationId, evaluations }: { formationId: Id; evaluations: Record<string, unknown>[] }) =>
      EvaluationFormateurService.updateEvaluationsBulkByFormation(formationId, evaluations),
    onSuccess: (_, { formationId }) =>
      qc.invalidateQueries({ queryKey: ["evaluations-enriched", formationId] }),
  });
}

export function useUpdateEvaluationsBulkFlat() {
  return useMutation({
    mutationFn: ({ formationId, evaluations }: { formationId?: Id; evaluations: Record<string, unknown>[] }) =>
      formationId
        ? EvaluationFormateurService.updateEvaluationsBulkByFormation(formationId, evaluations)
        : Promise.resolve(null),
  });
}
