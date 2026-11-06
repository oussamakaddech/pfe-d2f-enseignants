import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushQuery } from '@/hooks/testUtils';
import {
  useAllCertificates,
  useCertificatesByFormation,
  useCertificatesByEmail,
  useCreateCertificate,
  useUpdateCertificate,
  useDeliverCertificate,
  useGenerateCertificates,
} from '@/hooks/certificat/useCertificats';
import {
  useMyPassportData,
  usePassportDataByUsername,
  useDownloadMyPassport,
  useDownloadPassportByUsername,
} from '@/hooks/certificat/useSkillPassport';
import CertificateService from '@/services/certificat/CertificateService';
import FormationCustomService from '@/services/formation/FormationCustomService';
import SkillPassportService from '@/services/certificat/SkillPassportService';
import { createWrapper } from '@/hooks/testUtils';

vi.mock('@/services/certificat/CertificateService', () => ({
  default: {
    getAllCertificates: vi.fn(),
    getCertificatesByFormation: vi.fn(),
    getCertificatesByEmail: vi.fn(),
    createCertificate: vi.fn(),
    updateCertificate: vi.fn(),
    deliverCertificate: vi.fn(),
    generateCertificates: vi.fn(),
  },
  __esModule: true,
}));
vi.mock('@/services/formation/FormationCustomService', () => ({
  default: {
    generateCertificates: vi.fn(),
  },
  __esModule: true,
}));
vi.mock('@/services/certificat/SkillPassportService', () => ({
  default: {
    getMyPassportData: vi.fn(),
    getPassportDataByUsername: vi.fn(),
    downloadMyPassport: vi.fn(),
    downloadPassportByUsername: vi.fn(),
  },
  __esModule: true,
}));

describe('useCertificats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useAllCertificates fetches', async () => {
    (CertificateService.getAllCertificates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1 },
    ]);
    const { result } = renderHook(() => useAllCertificates(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it('useCertificatesByFormation disabled without id', async () => {
    const { result } = renderHook(() => useCertificatesByFormation(undefined), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it('useCertificatesByFormation fetches with id', async () => {
    (CertificateService.getCertificatesByFormation as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
    const { result } = renderHook(() => useCertificatesByFormation(3), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(CertificateService.getCertificatesByFormation).toHaveBeenCalledWith(3);
  });

  it('useCertificatesByEmail fetches', async () => {
    (CertificateService.getCertificatesByEmail as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useCertificatesByEmail(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it('useCreateCertificate calls service', async () => {
    (CertificateService.createCertificate as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateCertificate(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({} as never);
    });
    expect(CertificateService.createCertificate).toHaveBeenCalled();
  });

  it('useUpdateCertificate calls service', async () => {
    (CertificateService.updateCertificate as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateCertificate(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: {} } as never);
    });
    expect(CertificateService.updateCertificate).toHaveBeenCalledWith(1, {});
  });

  it('useDeliverCertificate calls service', async () => {
    (CertificateService.deliverCertificate as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeliverCertificate(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(CertificateService.deliverCertificate).toHaveBeenCalledWith(1);
  });

  it('useGenerateCertificates creates eligible certificates then generates PDFs', async () => {
    (FormationCustomService.generateCertificates as ReturnType<typeof vi.fn>).mockResolvedValue(
      'ok',
    );
    (CertificateService.generateCertificates as ReturnType<typeof vi.fn>).mockResolvedValue([
      'pdf1',
    ]);
    const { result } = renderHook(() => useGenerateCertificates(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ formationId: 1, typeCertif: 'CERTIF' });
    });
    // Étape 1 : création via le service formation (éligibilité vérifiée serveur)
    expect(FormationCustomService.generateCertificates).toHaveBeenCalledWith(1, 'CERTIF');
    // Étape 2 : génération PDF via le service certificat
    expect(CertificateService.generateCertificates).toHaveBeenCalledWith(1);
  });

  it('useGenerateCertificates tolerates 409 (already generated) and still builds PDFs', async () => {
    (FormationCustomService.generateCertificates as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 409 },
    });
    (CertificateService.generateCertificates as ReturnType<typeof vi.fn>).mockResolvedValue([
      'pdf1',
    ]);
    const { result } = renderHook(() => useGenerateCertificates(), { wrapper: createWrapper() });
    await act(async () => {
      // Le 409 est avalé par le hook (certificats déjà générés) : la mutation
      // doit aboutir et produire les PDF.
      await result.current.mutateAsync({ formationId: 2, typeCertif: 'ATTESTATION' });
    });
    expect(FormationCustomService.generateCertificates).toHaveBeenCalledWith(2, 'ATTESTATION');
    expect(CertificateService.generateCertificates).toHaveBeenCalledWith(2);
  });

  it('useGenerateCertificates propagates eligibility failures', async () => {
    (FormationCustomService.generateCertificates as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 500, data: { message: 'Aucun participant ne remplit les criteres' } },
    });
    const { result } = renderHook(() => useGenerateCertificates(), { wrapper: createWrapper() });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ formationId: 3, typeCertif: 'CERTIF' }),
      ).rejects.toMatchObject({
        response: { status: 500 },
      });
    });
    expect(CertificateService.generateCertificates).not.toHaveBeenCalled();
  });
});

describe('useSkillPassport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useMyPassportData fetches', async () => {
    (SkillPassportService.getMyPassportData as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useMyPassportData(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it('usePassportDataByUsername disabled without username', async () => {
    const { result } = renderHook(() => usePassportDataByUsername(undefined), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it('usePassportDataByUsername fetches with username', async () => {
    (SkillPassportService.getPassportDataByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(
      {},
    );
    const { result } = renderHook(() => usePassportDataByUsername('u1'), {
      wrapper: createWrapper(),
    });
    await flushQuery(result);
    expect(SkillPassportService.getPassportDataByUsername).toHaveBeenCalledWith('u1');
  });

  it('useDownloadMyPassport calls service', async () => {
    (SkillPassportService.downloadMyPassport as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDownloadMyPassport(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(SkillPassportService.downloadMyPassport).toHaveBeenCalled();
  });

  it('useDownloadPassportByUsername calls service', async () => {
    (SkillPassportService.downloadPassportByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(
      {},
    );
    const { result } = renderHook(() => useDownloadPassportByUsername(), {
      wrapper: createWrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync('u1');
    });
    expect(SkillPassportService.downloadPassportByUsername).toHaveBeenCalledWith('u1');
  });
});
