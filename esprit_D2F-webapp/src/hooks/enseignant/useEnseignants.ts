import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EnseignantService from "@/services/formation/EnseignantService";
import type { Id } from "@/models/common";

export interface Enseignant {
  id?: Id;
  nom?: string;
  prenom?: string;
  mail?: string;
  type?: string;
  deptLibelle?: string;
  upLibelle?: string;
  [key: string]: unknown;
}

const KEYS = {
  all: ["enseignants"] as const,
  one: (id: Id) => ["enseignants", id] as const,
};

export function useEnseignants() {
  return useQuery<Enseignant[]>({
    queryKey: KEYS.all,
    queryFn: () => EnseignantService.getAllEnseignants(),
  });
}

export function useEnseignantById(id: Id | undefined) {
  return useQuery<unknown>({
    queryKey: KEYS.one(id!),
    queryFn: () => EnseignantService.getEnseignantById(id!),
    enabled: !!id,
  });
}

export function useCreateEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => EnseignantService.createEnseignant(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: Id; data: unknown }) =>
      EnseignantService.updateEnseignant(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => EnseignantService.deleteEnseignant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUploadEnseignants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => EnseignantService.uploadEnseignants(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
