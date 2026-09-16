import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ABTestingService, {
  type ABAssignRequest,
  type ABEventRequest,
  type ABResultsResponse,
  type ABWinnerResponse,
} from "@/services/analyse/ABTestingService";

/** Résultats agrégés d'une expérience A/B. */
export function useABResults(experiment: string | undefined) {
  return useQuery<ABResultsResponse>({
    queryKey: ["ab-testing", "results", experiment],
    queryFn: () => ABTestingService.getResults(experiment as string),
    enabled: !!experiment,
    refetchInterval: 15_000,
  });
}

/** Variante gagnante d'une expérience A/B (404 = pas encore de gagnant). */
export function useABWinner(experiment: string | undefined) {
  return useQuery<ABWinnerResponse>({
    queryKey: ["ab-testing", "winner", experiment],
    queryFn: () => ABTestingService.getWinner(experiment as string),
    enabled: !!experiment,
    retry: false,
  });
}

/** Assignation d'un enseignant à une variante. */
export function useABAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ABAssignRequest) => ABTestingService.assign(req),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ab-testing", "results", variables.experiment_name] });
    },
  });
}

/** Enregistrement d'un événement (shown, accepted, completed, scored, ...). */
export function useABEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ABEventRequest) => ABTestingService.recordEvent(req),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ab-testing", "results", variables.experiment_name] });
      qc.invalidateQueries({ queryKey: ["ab-testing", "winner", variables.experiment_name] });
    },
  });
}
