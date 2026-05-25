import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BureauService from "@/services/bureau/BureauService";
import type { Bureau, BureauRequest } from "@/models/bureau";

const QUERY_KEY = ["bureaux"] as const;

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
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateBureau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BureauRequest }) =>
      BureauService.updateBureau(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteBureau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => BureauService.deleteBureau(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
