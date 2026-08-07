import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CertificateService from '@/services/certificat/CertificateService';
import type { Certificate } from '@/models/certificat';
import type { Id } from '@/models/common';

const KEYS = {
  all: ['certificates'] as const,
  byFormation: (id: Id) => ['certificates', 'formation', id] as const,
  byEmail: ['certificates', 'email'] as const,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useGenerateCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formationId: Id) => CertificateService.generateCertificates(formationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
