import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockPut: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    put: httpMocks.mockPut,
  },
}));

vi.mock("@/services/auth/authHeaders", () => ({
  requireAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

import FormationCustomService from '../FormationCustomService';

describe('FormationCustomService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('generates certificates with default type', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: 'Certificats générés' });
    const result = await FormationCustomService.generateCertificates(1);
    expect(result).toBe('Certificats générés');
    expect(httpMocks.mockPut).toHaveBeenCalledWith(
      expect.stringContaining('/1/generate-certificates'),
      null,
      expect.objectContaining({ params: { typeCertif: 'CERTIF' } })
    );
  });

  it('generates certificates with custom type', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: 'Success' });
    const result = await FormationCustomService.generateCertificates(2, 'ATTESTATION');
    expect(result).toBe('Success');
    expect(httpMocks.mockPut).toHaveBeenCalledWith(
      expect.stringContaining('/2/generate-certificates'),
      null,
      expect.objectContaining({ params: { typeCertif: 'ATTESTATION' } })
    );
  });

  it('throws on error', async () => {
    httpMocks.mockPut.mockRejectedValueOnce(new Error('Server error'));
    await expect(FormationCustomService.generateCertificates(1)).rejects.toThrow('Server error');
  });
});




