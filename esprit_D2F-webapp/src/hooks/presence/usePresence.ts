import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import type { Formation } from "@/models/formation";
import type { Id } from "@/models/common";

const KEYS = {
  animateur: ["formations", "animateur"] as const,
  seancePresences: (id: Id) => ["presences", "seance", id] as const,
  seanceStats: (id: Id) => ["presences", "stats", id] as const,
};

export function useFormationsByAnimateur() {
  return useQuery<Formation[]>({
    queryKey: KEYS.animateur,
    queryFn: () => FormationWorkflowService.getFormationsByAnimateur(),
  });
}

export function useSeancePresences(seanceId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: KEYS.seancePresences(seanceId!),
    queryFn: () => FormationWorkflowService.getPresencesBySeance(seanceId!),
    enabled: !!seanceId,
  });
}

export function useSeancePresenceStats(seanceId: Id | undefined) {
  return useQuery({
    queryKey: KEYS.seanceStats(seanceId!),
    queryFn: () => FormationWorkflowService.getSeancePresenceStats(seanceId!),
    enabled: !!seanceId,
  });
}

export function useUpdatePresence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPresent, commentaire }: { id: Id; isPresent: boolean; commentaire?: string }) =>
      FormationWorkflowService.updatePresence(id, isPresent, commentaire),
    onSuccess: (_, { id }) =>
      qc.invalidateQueries({ queryKey: KEYS.seancePresences(id) }),
  });
}

export function useBatchUpdatePresences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      seanceId,
      updates,
    }: {
      seanceId: Id;
      updates: { idParticipation: number | string; present: boolean; commentaire?: string }[];
    }) => FormationWorkflowService.batchUpdatePresences(seanceId, updates),
    onSuccess: (_, { seanceId }) =>
      qc.invalidateQueries({ queryKey: KEYS.seancePresences(seanceId) }),
  });
}

export function useMarkAllPresences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seanceId, present }: { seanceId: Id; present: boolean }) =>
      FormationWorkflowService.markAllPresences(seanceId, present),
    onSuccess: (_, { seanceId }) =>
      qc.invalidateQueries({ queryKey: KEYS.seancePresences(seanceId) }),
  });
}

export function useAggregatedPresences(seanceIds: Id[]) {
  return useQuery<unknown[][]>({
    queryKey: ["presences", "aggregated", seanceIds],
    queryFn: () =>
      Promise.all(
        seanceIds.map((id) =>
          FormationWorkflowService.getPresencesBySeance(id).catch(() => []),
        ),
      ),
    enabled: seanceIds.length > 0,
  });
}
