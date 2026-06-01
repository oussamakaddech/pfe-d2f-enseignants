import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
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
    expect(res.data).toEqual([{ id: 1 }]);

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 2 } });
    const res2 = await CertificateService.createCertificate({ formationId: 1 } as Record<string, unknown>);
    expect(res2.data).toEqual({ id: 2 });
  });

  it('gets by formation and delivers', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 3 }] });
    const res = await CertificateService.getCertificatesByFormation(10);
    expect(res.data).toEqual([{ id: 3 }]);

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 3, delivered: true } });
    const res2 = await CertificateService.deliverCertificate(3);
    expect(res2.data).toEqual({ id: 3, delivered: true });
  });

  it('gets by email with token', async () => {
    localStorage.setItem('authToken', 'abc');
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 4 }] });
    const res = await CertificateService.getCertificatesByEmail();
    expect(res.data).toEqual([{ id: 4 }]);
  });

  it('updates and generates PDFs', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 5 } });
    const res = await CertificateService.updateCertificate(5, { date: 'x' } as Record<string, unknown>);
    expect(res.data).toEqual({ id: 5 });

    httpMocks.mockGet.mockResolvedValueOnce({ data: ['pdf1', 'pdf2'] });
    const res2 = await CertificateService.generateCertificates(10);
    expect(res2).toEqual(['pdf1', 'pdf2']);
  });
});




