import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RiceService from "@/services/analyse/RiceService";

const KEYS = {
  enseignants: ["rice", "enseignants"] as const,
  savoirs: (dept?: string | null) => ["rice", "savoirs", dept] as const,
  affectations: ["rice", "affectations"] as const,
  history: ["rice", "import-history"] as const,
};

export function useRiceEnseignants(departement?: string | null) {
  return useQuery({
    queryKey: KEYS.enseignants,
    queryFn: () => RiceService.getEnseignants(departement ?? null),
  });
}

export function useRiceSavoirs(departement?: string | null) {
  return useQuery({
    queryKey: KEYS.savoirs(departement),
    queryFn: () => RiceService.getSavoirs(departement ?? null),
  });
}

export function useRiceEnseignantAffectations() {
  return useQuery({
    queryKey: KEYS.affectations,
    queryFn: () => RiceService.getEnseignantAffectations(),
  });
}

export function useRiceAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      enseignants,
      departement,
    }: {
      files: File[];
      enseignants: Record<string, unknown>[];
      departement?: string;
    }) => RiceService.analyze(files, enseignants, departement),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rice"] }),
  });
}

export function useRiceSaveAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { add?: Record<string, unknown>[]; remove?: Record<string, unknown>[] }) =>
      RiceService.saveAssignments(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.affectations }),
  });
}

export function useRiceAssignCompetence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => RiceService.assignCompetence(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.affectations }),
  });
}

export function useRiceRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => RiceService.removeAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.affectations }),
  });
}

export function useRiceCreateEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => RiceService.createEnseignant(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.enseignants }),
  });
}

export function useRiceUpdateEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Record<string, unknown> }) =>
      RiceService.updateEnseignant(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.enseignants }),
  });
}

export function useRiceDeactivateEnseignant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => RiceService.deactivateEnseignant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.enseignants }),
  });
}
