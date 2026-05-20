import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
  },
}));

import InscriptionService from '../InscriptionService';

describe('InscriptionService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets formations accessibles', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await InscriptionService.getFormationsAccessibles('E1');
    expect(result).toEqual([{ id: 1 }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/accessibles'), { params: { enseignantId: 'E1' } });
  });

  it('demands inscription', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 10 } });
    const result = await InscriptionService.demanderInscription(1, 'E1');
    expect(result).toEqual({ id: 10 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/inscriptions'), null, { params: { formationId: 1, enseignantId: 'E1' } });
  });

  it('gets inscriptions by formation', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 20 }] });
    const result = await InscriptionService.getInscriptionsByFormation(1);
    expect(result).toEqual([{ id: 20 }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/formations/1/inscriptions'));
  });

  it('traiter demande', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 20, statut: 'APPROUVE' } });
    const result = await InscriptionService.traiterDemande(20, true);
    expect(result).toEqual({ id: 20, statut: 'APPROUVE' });
    expect(httpMocks.mockPut).toHaveBeenCalledWith(expect.stringContaining('/traiter'), null, { params: { approuver: true } });
  });
});




