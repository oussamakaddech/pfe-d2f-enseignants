import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import UpService from "@/services/api/UploadService";
import type { LookupItem } from "@/models/common";

const KEYS = {
  all: ["ups"] as const,
};

export function useAllUps() {
  return useQuery<LookupItem[]>({
    queryKey: KEYS.all,
    queryFn: () => UpService.getAllUps() as Promise<LookupItem[]>,
  });
}

export function useUpById(id: number | string | undefined) {
  return useQuery({
    queryKey: ["ups", id],
    queryFn: () => UpService.getUpById(id!),
    enabled: !!id,
  });
}

export function useCreateUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => UpService.createUp(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Record<string, unknown> }) =>
      UpService.updateUp(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => UpService.deleteUp(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useImportUpsExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => UpService.importUpsExcel(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
