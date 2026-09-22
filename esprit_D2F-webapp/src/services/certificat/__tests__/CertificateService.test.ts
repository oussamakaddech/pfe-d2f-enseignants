import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
  },
}));

import CertificateService from '../CertificateService';

describe('CertificateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('lists and creates certificates', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const res = await CertificateService.getAllCertificates();
    expect(res).toEqual([{ id: 1 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 2 } });
    const res2 = await CertificateService.createCertificate({ formationId: 1 } as Record<
      string,
      unknown
    >);
    expect(res2.data).toEqual({ id: 2 });
  });

  it('gets by formation and delivers', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 3 }] });
    const res = await CertificateService.getCertificatesByFormation(10);
    expect(res).toEqual([{ id: 3 }]);

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 3, delivered: true } });
    const res2 = await CertificateService.deliverCertificate(3);
    expect(res2.data).toEqual({ id: 3, delivered: true });
  });

  it('gets by email with token', async () => {
    localStorage.setItem('authToken', 'abc');
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 4 }] });
    const res = await CertificateService.getCertificatesByEmail();
    expect(res).toEqual([{ id: 4 }]);
  });

  it('updates and generates PDFs', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 5 } });
    const res = await CertificateService.updateCertificate(5, { date: 'x' } as Record<
      string,
      unknown
    >);
    expect(res.data).toEqual({ id: 5 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: ['pdf1', 'pdf2'] });
    const res2 = await CertificateService.generateCertificates(10);
    expect(res2).toEqual(['pdf1', 'pdf2']);
  });

  it('revokes a certificate with a mandatory reason', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({
      data: { id: 7, certificateStatus: 'REVOKED', revocationReason: 'Fraude' },
    });
    const res = await CertificateService.revokeCertificate(7, 'Fraude');
    expect(httpMocks.mockPut).toHaveBeenCalledWith(expect.stringContaining('/7/revoke'), {
      reason: 'Fraude',
    });
    expect(res.certificateStatus).toBe('REVOKED');
  });

  it('fetches global and per-formation indicators', async () => {
    const indicators = { eligibleCount: 10, deliveredCount: 6, pendingCount: 3, revokedCount: 1 };
    httpMocks.mockGet.mockResolvedValueOnce({ data: indicators });
    const res = await CertificateService.getIndicators();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/indicators'));
    expect(res).toEqual(indicators);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { ...indicators, eligibleCount: 5 } });
    const res2 = await CertificateService.getIndicatorsByFormation(42);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/indicators/formation/42'),
    );
    expect(res2.eligibleCount).toBe(5);
  });

  it('verifies a certificate by number (public endpoint)', async () => {
    const verification = { certificateNumber: 'CERT-2026-000123', certificateStatus: 'ISSUED' };
    httpMocks.mockGet.mockResolvedValueOnce({ data: verification });
    const res = await CertificateService.verifyCertificate('CERT-2026-000123');
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/verify/CERT-2026-000123'),
    );
    expect(res.certificateStatus).toBe('ISSUED');
  });
});
