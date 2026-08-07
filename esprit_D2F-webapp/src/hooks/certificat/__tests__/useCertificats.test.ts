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

  it('useGenerateCertificates calls service', async () => {
    (CertificateService.generateCertificates as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useGenerateCertificates(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(CertificateService.generateCertificates).toHaveBeenCalledWith(1);
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
