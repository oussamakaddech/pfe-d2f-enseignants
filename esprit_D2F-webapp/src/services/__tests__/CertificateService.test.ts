import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import CertificateService from '../CertificateService';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CertificateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('retrieves and creates certificates', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(CertificateService.getAllCertificates()).resolves.toMatchObject({ data: [{ id: 1 }] });

    axios.post.mockResolvedValueOnce({ data: { id: 2 } });
    await expect(CertificateService.createCertificate({ titre: 'Certif' })).resolves.toMatchObject({ data: { id: 2 } });
  });

  it('handles formation scoped and delivery endpoints', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 3 }] });
    await expect(CertificateService.getCertificatesByFormation(10)).resolves.toMatchObject({ data: [{ id: 3 }] });

    axios.put.mockResolvedValueOnce({ data: { id: 3, delivered: true } });
    await expect(CertificateService.deliverCertificate(3)).resolves.toMatchObject({ data: { id: 3, delivered: true } });

    axios.put.mockResolvedValueOnce({ data: { id: 3, nom: 'updated' } });
    await expect(CertificateService.updateCertificate(3, { nom: 'updated' })).resolves.toMatchObject({ data: { id: 3, nom: 'updated' } });
  });

  it('requires token for getCertificatesByEmail', async () => {
    expect(() => CertificateService.getCertificatesByEmail()).toThrow('Authentication token is missing.');

    localStorage.setItem('authToken', 'abc');
    axios.get.mockResolvedValueOnce({ data: [{ id: 5 }] });
    await expect(CertificateService.getCertificatesByEmail()).resolves.toMatchObject({ data: [{ id: 5 }] });
  });

  it('generates certificate PDFs', async () => {
    axios.get.mockResolvedValueOnce({ data: ['cert_1.pdf', 'cert_2.pdf'] });
    await expect(CertificateService.generateCertificates(7)).resolves.toEqual(['cert_1.pdf', 'cert_2.pdf']);
  });
});
