import { useQuery, useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import FormationCustomService from '@/services/formation/FormationCustomService';
import FormationReportService from '@/services/formation/FormationReportService';
import FormationWorkflowService from '@/services/formation/FormationWorkflowService';
import MailService from '@/services/besoin/MailService';
import InscriptionService from '@/services/formation/InscriptionService';
import { getProfile } from '@/services/auth/AccountService';
import type { Id } from '@/models/common';
import type { AuthUser } from '@/models/auth';

const KEYS = {
  inscriptions: (formationId: Id) => ['inscriptions', formationId] as const,
  report: (role: string, enseignantId: Id, start: string, end: string) =>
    ['formation-report', role, enseignantId, start, end] as const,
};

export function useGenerateFormationCertificates() {
  return useMutation({
    mutationFn: ({
      formationId,
      typeCertif = 'CERTIF',
    }: {
      formationId: Id;
      typeCertif?: string;
    }) => FormationCustomService.generateCertificates(formationId as number, typeCertif),
  });
}

export function useFormationsParRoleEtPeriode(
  role: string,
  enseignantId: Id | undefined,
  start: string,
  end: string,
) {
  return useQuery<unknown[]>({
    queryKey: KEYS.report(role, enseignantId!, start, end),
    queryFn: () =>
      FormationReportService.getFormationsParRoleEtPeriode(role, String(enseignantId), start, end),
    enabled: !!enseignantId && !!start && !!end,
  });
}

export function useFormationReportFetch() {
  return useMutation({
    mutationFn: ({
      role,
      enseignantId,
      start,
      end,
    }: {
      role: string;
      enseignantId: Id;
      start: string;
      end: string;
    }) =>
      FormationReportService.getFormationsParRoleEtPeriode(role, String(enseignantId), start, end),
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: ({
      to,
      subject,
      content,
      isHtml,
    }: {
      to: string;
      subject: string;
      content: string;
      isHtml?: boolean;
    }) => MailService.sendEmail(to, subject, content, isHtml),
  });
}

export function useInscriptionsByFormation(formationId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: KEYS.inscriptions(formationId!),
    queryFn: () => InscriptionService.getInscriptionsByFormation(formationId!),
    enabled: !!formationId,
  });
}

export function useAllInscriptions() {
  return useQuery<unknown[]>({
    queryKey: ['inscriptions', 'all'],
    queryFn: () => InscriptionService.getAllInscriptions(),
  });
}

export function useInscriptionsByEnseignant(enseignantId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: ['inscriptions', 'enseignant', enseignantId],
    queryFn: () => InscriptionService.getInscriptionsByEnseignant(enseignantId!),
    enabled: !!enseignantId,
  });
}

export function useMyInscriptions() {
  return useQuery<unknown[]>({
    queryKey: ['inscriptions', 'mine'],
    queryFn: () => InscriptionService.getMyInscriptions(),
  });
}

export function useDemanderInscription() {
  return useMutation({
    mutationFn: ({ formationId, enseignantId }: { formationId: Id; enseignantId: Id }) =>
      InscriptionService.demanderInscription(formationId, enseignantId),
  });
}

export function useTraiterDemande() {
  return useMutation({
    mutationFn: ({ id, approuver, motif }: { id: Id; approuver: boolean; motif?: string }) =>
      InscriptionService.traiterDemande(id, approuver, motif),
  });
}

export function useTraiterDemandeBulk() {
  return useMutation({
    mutationFn: ({ ids, approuver, motif }: { ids: Id[]; approuver: boolean; motif?: string }) =>
      InscriptionService.traiterDemandeBulk(ids, approuver, motif),
  });
}

export function useAnnulerInscription() {
  return useMutation({
    mutationFn: ({ id, enseignantId }: { id: Id; enseignantId: Id }) =>
      InscriptionService.annulerInscription(id, enseignantId),
  });
}

export function useFormationsAccessibles(enseignantId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: ['formations', 'accessibles', enseignantId],
    queryFn: () => InscriptionService.getFormationsAccessibles(enseignantId!),
    enabled: !!enseignantId,
  });
}

export function useExportFormations() {
  return useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) =>
      FormationWorkflowService.exportFormations(start, end),
  });
}

export function useProfile() {
  return useQuery<AuthUser, AxiosError>({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    // Never retry on auth/not-found errors — the httpClient interceptor already
    // dispatches auth:loggedOut on 401, so retrying would just flood the server.
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 min — profile rarely changes
  });
}
