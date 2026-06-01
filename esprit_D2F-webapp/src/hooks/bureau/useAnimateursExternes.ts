import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AnimateurExterneService from "@/services/bureau/AnimateurExterneService";
import type { AnimateurExterne, AnimateurExterneRequest } from "@/models/bureau";

const queryKey = (bureauId: number) => ["bureaux", bureauId, "animateurs"] as const;

export function useAnimateursExternes(bureauId: number | null, enabled = true) {
  return useQuery<AnimateurExterne[]>({
    queryKey: bureauId != null ? queryKey(bureauId) : ["bureaux", "animateurs", "none"],
    queryFn: () => AnimateurExterneService.getByBureau(bureauId as number),
    enabled: enabled && bureauId != null,
  });
}

export function useCreateAnimateurExterne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bureauId, data }: { bureauId: number; data: AnimateurExterneRequest }) =>
      AnimateurExterneService.create(bureauId, data),
    onSuccess: (_res, { bureauId }) => qc.invalidateQueries({ queryKey: queryKey(bureauId) }),
  });
}

export function useUpdateAnimateurExterne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bureauId, id, data }: { bureauId: number; id: number; data: AnimateurExterneRequest }) =>
      AnimateurExterneService.update(bureauId, id, data),
    onSuccess: (_res, { bureauId }) => qc.invalidateQueries({ queryKey: queryKey(bureauId) }),
  });
}

export function useDeleteAnimateurExterne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bureauId, id }: { bureauId: number; id: number }) =>
      AnimateurExterneService.delete(bureauId, id),
    onSuccess: (_res, { bureauId }) => qc.invalidateQueries({ queryKey: queryKey(bureauId) }),
  });
}
