import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BesoinFormationService from "@/services/besoin/BesoinFormationService";
import BesoinCompetenceService, { type BesoinCompetenceLink } from "@/services/besoin/BesoinCompetenceService";
import type { BesoinFormation } from "@/models/besoin";
import type { Id } from "@/models/common";

const KEYS = {
  all: ["besoins"] as const,
  approved: ["besoins", "approved"] as const,
  byUp: (up: string) => ["besoins", "up", up] as const,
  byDept: (dept: string) => ["besoins", "dept", dept] as const,
  competences: (id: Id) => ["besoins-competences", id] as const,
};

export function useBesoins() {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.all,
    queryFn: () => BesoinFormationService.getAllBesoinFormations(),
  });
}

export function useApprovedBesoins() {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.approved,
    queryFn: () => BesoinFormationService.getApprovedBesoinFormations(),
  });
}

export function useBesoinsByUp(up: string | undefined) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.byUp(up ?? ""),
    queryFn: () => BesoinFormationService.getBesoinsByUp(up!),
    enabled: !!up,
  });
}

export function useBesoinsByDepartement(dept: string | undefined) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.byDept(dept ?? ""),
    queryFn: () => BesoinFormationService.getBesoinsByDepartement(dept!),
    enabled: !!dept,
  });
}

export function useAddBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BesoinFormation>) =>
      BesoinFormationService.addBesoinFormation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useModifyBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ besoin, commentaire }: { besoin: Partial<BesoinFormation>; commentaire: string }) =>
      BesoinFormationService.modifyBesoinFormation(besoin, commentaire),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useRemoveBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => BesoinFormationService.removeBesoinFormation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useApproveBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => BesoinFormationService.approveBesoin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useBesoinCompetences(besoinId: Id | undefined) {
  return useQuery<BesoinCompetenceLink[]>({
    queryKey: KEYS.competences(besoinId ?? 0),
    queryFn: () => BesoinCompetenceService.getByBesoin(besoinId as number),
    enabled: !!besoinId,
  });
}

export function useReplaceBesoinCompetences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ besoinId, links }: { besoinId: number; links: BesoinCompetenceLink[] }) =>
      BesoinCompetenceService.replaceAll(besoinId, links),
    onSuccess: (_, { besoinId }) =>
      qc.invalidateQueries({ queryKey: KEYS.competences(besoinId) }),
  });
}
