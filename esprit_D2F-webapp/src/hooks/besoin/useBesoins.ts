import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BesoinFormationService from '@/services/besoin/BesoinFormationService';
import BesoinCompetenceService from '@/services/besoin/BesoinCompetenceService';
import type { BesoinCompetenceLink, BesoinFormation, ReviewerScope } from '@/models/besoin';
import type { Id } from '@/models/common';

const KEYS = {
  all: ['besoins'] as const,
  mine: ['besoins', 'mine'] as const,
  approved: ['besoins', 'approved'] as const,
  pending: ['besoins', 'pending'] as const,
  scope: ['besoins', 'scope'] as const,
  history: (id: Id) => ['besoins', 'history', id] as const,
  scopes: ['besoins', 'reviewer-scopes'] as const,
  myScope: ['besoins', 'reviewer-scopes', 'me'] as const,
  byUp: (up: string) => ['besoins', 'up', up] as const,
  byDept: (dept: string) => ['besoins', 'dept', dept] as const,
  competences: (id: Id) => ['besoins-competences', id] as const,
};

export function useBesoins(enabled = true) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.all,
    queryFn: () => BesoinFormationService.getAllBesoinFormations(),
    enabled,
  });
}

export function useMyBesoins(enabled = true) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.mine,
    queryFn: () => BesoinFormationService.getMyBesoins(),
    enabled,
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
    queryKey: KEYS.byUp(up ?? ''),
    queryFn: () => BesoinFormationService.getBesoinsByUp(up!),
    enabled: !!up,
  });
}

export function useBesoinsByDepartement(dept: string | undefined) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.byDept(dept ?? ''),
    queryFn: () => BesoinFormationService.getBesoinsByDepartement(dept!),
    enabled: !!dept,
  });
}

export function useAddBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BesoinFormation>) => BesoinFormationService.addBesoinFormation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useModifyBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      besoin,
      commentaire,
    }: {
      besoin: Partial<BesoinFormation>;
      commentaire: string;
    }) => BesoinFormationService.modifyBesoinFormation(besoin, commentaire),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.pending });
      qc.invalidateQueries({ queryKey: KEYS.scope });
    },
  });
}

export function useRejectBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: Id; reason: string }) =>
      BesoinFormationService.rejectBesoin(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.pending });
      qc.invalidateQueries({ queryKey: KEYS.scope });
    },
  });
}

export function useCancelBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => BesoinFormationService.cancelBesoin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.mine });
      qc.invalidateQueries({ queryKey: KEYS.pending });
      qc.invalidateQueries({ queryKey: KEYS.scope });
    },
  });
}

export function usePendingApproval(enabled = true) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.pending,
    queryFn: () => BesoinFormationService.getPendingApproval(),
    enabled,
  });
}

export function useScopeBesoins(enabled = true) {
  return useQuery<BesoinFormation[]>({
    queryKey: KEYS.scope,
    queryFn: () => BesoinFormationService.getScopeBesoins(),
    enabled,
  });
}

export function useApprovalHistory(besoinId: Id | undefined, enabled = true) {
  return useQuery({
    queryKey: KEYS.history(besoinId ?? 0),
    queryFn: () => BesoinFormationService.getApprovalHistory(besoinId as Id),
    enabled: !!besoinId && enabled,
  });
}

export function useReviewerScopes(enabled = true) {
  return useQuery({
    queryKey: KEYS.scopes,
    queryFn: () => BesoinFormationService.getReviewerScopes(),
    enabled,
  });
}

export function useMyReviewerScope(enabled = true) {
  const query = useQuery({
    queryKey: KEYS.myScope,
    queryFn: () => BesoinFormationService.getMyReviewerScope(),
    enabled,
    retry: false,
  });
  return query;
}

export function useUpsertReviewerScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, scope }: { username: string; scope: Partial<ReviewerScope> }) =>
      BesoinFormationService.upsertReviewerScope(username, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scopes });
      qc.invalidateQueries({ queryKey: KEYS.myScope });
    },
  });
}

export function useDeleteReviewerScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => BesoinFormationService.deleteReviewerScope(username),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scopes });
      qc.invalidateQueries({ queryKey: KEYS.myScope });
    },
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
    onSuccess: (_, { besoinId }) => qc.invalidateQueries({ queryKey: KEYS.competences(besoinId) }),
  });
}
