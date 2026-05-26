import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DeptService from "@/services/formation/DeptService";

const KEYS = {
  all: ["departements"] as const,
};

export function useAllDepts() {
  return useQuery<unknown[]>({
    queryKey: KEYS.all,
    queryFn: () => DeptService.getAllDepts(),
  });
}

export function useDeptById(id: number | string | undefined) {
  return useQuery({
    queryKey: ["departements", id],
    queryFn: () => DeptService.getDeptById(id!),
    enabled: !!id,
  });
}

export function useCreateDept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => DeptService.createDept(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateDept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Record<string, unknown> }) =>
      DeptService.updateDept(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteDept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => DeptService.deleteDept(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useImportDeptsExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => DeptService.importDeptsExcel(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
