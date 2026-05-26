import { useQuery, useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import FormationCustomService from "@/services/formation/FormationCustomService";
import FormationReportService from "@/services/formation/FormationReportService";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import MailService from "@/services/besoin/MailService";
import InscriptionService from "@/services/formation/InscriptionService";
import { getProfile } from "@/services/auth/AccountService";
import type { Id } from "@/models/common";
import type { AuthUser } from "@/models/auth";

const KEYS = {
  inscriptions: (formationId: Id) => ["inscriptions", formationId] as const,
  report: (role: string, enseignantId: Id, start: string, end: string) =>
    ["formation-report", role, enseignantId, start, end] as const,
};

export function useGenerateFormationCertificates() {
  return useMutation({
    mutationFn: ({ formationId, typeCertif = "CERTIF" }: { formationId: Id; typeCertif?: string }) =>
      FormationCustomService.generateCertificates(formationId, typeCertif),
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
    queryFn: () => FormationReportService.getFormationsParRoleEtPeriode(role, enseignantId!, start, end),
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
    }) => FormationReportService.getFormationsParRoleEtPeriode(role, enseignantId, start, end),
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: ({ to, subject, content }: { to: string; subject: string; content: string }) =>
      MailService.sendEmail(to, subject, content),
  });
}

export function useInscriptionsByFormation(formationId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: KEYS.inscriptions(formationId!),
    queryFn: () => InscriptionService.getInscriptionsByFormation(formationId!),
    enabled: !!formationId,
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
    mutationFn: ({ id, approuver }: { id: Id; approuver: boolean }) =>
      InscriptionService.traiterDemande(id, approuver),
  });
}

export function useFormationsAccessibles(enseignantId: Id | undefined) {
  return useQuery<unknown[]>({
    queryKey: ["formations", "accessibles", enseignantId],
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
    queryKey: ["profile"],
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
