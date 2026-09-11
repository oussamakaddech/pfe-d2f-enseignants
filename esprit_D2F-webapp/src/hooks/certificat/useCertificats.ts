import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CertificateService from '@/services/certificat/CertificateService';
import FormationCustomService, {
  type DocumentType,
} from '@/services/formation/FormationCustomService';
import type { Certificate, CertificateIndicators } from '@/models/certificat';
import type { Id } from '@/models/common';

const KEYS = {
  all: ['certificates'] as const,
  byFormation: (id: Id) => ['certificates', 'formation', id] as const,
  byEmail: ['certificates', 'email'] as const,
  indicators: (formationId?: Id) =>
    formationId != null
      ? (['certificates', 'indicators', 'formation', formationId] as const)
      : (['certificates', 'indicators'] as const),
};

export function useAllCertificates() {
  return useQuery<Certificate[]>({
    queryKey: KEYS.all,
    queryFn: () => CertificateService.getAllCertificates(),
  });
}

export function useCertificatesByFormation(formationId: Id | undefined) {
  return useQuery<Certificate[]>({
    queryKey: KEYS.byFormation(formationId!),
    queryFn: () => CertificateService.getCertificatesByFormation(formationId!),
    enabled: !!formationId,
  });
}

export function useCertificatesByEmail() {
  return useQuery<Certificate[]>({
    queryKey: KEYS.byEmail,
    queryFn: () => CertificateService.getCertificatesByEmail(),
  });
}

export function useCreateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Certificate>) => CertificateService.createCertificate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: Id; data: Partial<Certificate> }) =>
      CertificateService.updateCertificate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeliverCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => CertificateService.deliverCertificate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['certificates', 'indicators'] });
    },
  });
}

/** Révocation d'un certificat (motif obligatoire, ADMIN). */
export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: Id; reason: string }) =>
      CertificateService.revokeCertificate(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['certificates', 'indicators'] });
    },
  });
}

/** Indicateurs de certification (éligibles / délivrés / en attente / révoqués). */
export function useCertificateIndicators(formationId?: Id) {
  return useQuery<CertificateIndicators>({
    queryKey: KEYS.indicators(formationId),
    queryFn: () =>
      formationId != null
        ? CertificateService.getIndicatorsByFormation(formationId)
        : CertificateService.getIndicators(),
  });
}

export function useGenerateCertificates() {
  const qc = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({
      formationId,
      typeCertif = 'CERTIF',
    }: {
      formationId: Id;
      typeCertif?: DocumentType;
    }): Promise<string[]> => {
      // Étape 1 — créer les documents éligibles côté service formation.
      // CERTIF : présence + post-test + évaluation ; ATTESTATION/BADGE : présence.
      // 409 = déjà générés → on continue vers les PDF.
      try {
        await FormationCustomService.generateCertificates(Number(formationId), typeCertif);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 409) throw err;
      }
      // Étape 2 — générer les PDF des documents créés.
      return CertificateService.generateCertificates(formationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['certificates', 'indicators'] });
    },
  });
}
