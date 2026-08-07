import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BureauService from '@/services/bureau/BureauService';
import type { Bureau, BureauRequest } from '@/models/bureau';

const QUERY_KEY = ['bureaux'] as const;

// refetchType: "all" → on rafraîchit aussi les requêtes en cache mais INACTIVES
// (ex. la table « Gestion des Bureaux » non montée au moment où l'on crée un
// bureau depuis le formulaire de formation). Sans ça, la liste pouvait rester
// périmée tant qu'on ne rechargeait pas la page.
const invalidateBureaux = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: QUERY_KEY, refetchType: 'all' });

export function useBureaux() {
  return useQuery<Bureau[]>({
    queryKey: QUERY_KEY,
    queryFn: () => BureauService.getAllBureaux(),
  });
}

export function useCreateBureau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BureauRequest) => BureauService.createBureau(data),
    onSuccess: () => invalidateBureaux(qc),
  });
}

export function useUpdateBureau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BureauRequest }) =>
      BureauService.updateBureau(id, data),
    onSuccess: () => invalidateBureaux(qc),
  });
}

export function useDeleteBureau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => BureauService.deleteBureau(id),
    onSuccess: () => invalidateBureaux(qc),
  });
}
