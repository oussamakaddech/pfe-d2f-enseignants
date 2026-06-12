import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
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

  it('normalises paginated and empty list payloads', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 2 }] } });
    await expect(InscriptionService.getAllInscriptions()).resolves.toEqual([{ id: 2 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: undefined });
    await expect(InscriptionService.getMyInscriptions()).resolves.toEqual([]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 3 }] } });
    await expect(InscriptionService.getInscriptionsByEnseignant('E1')).resolves.toEqual([{ id: 3 }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/enseignant/E1'), { params: { size: 200 } });
  });

  it('trims an empty motif to undefined when processing', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 21 } });
    await InscriptionService.traiterDemande(21, false, '   ');
    expect(httpMocks.mockPut).toHaveBeenCalledWith(expect.stringContaining('/traiter'), null, { params: { approuver: false, motif: undefined } });
  });

  it('bulk-processes demands, coercing ids to numbers', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    const res = await InscriptionService.traiterDemandeBulk(['1', 2], true, 'motif');
    expect(res).toHaveLength(2);
    expect(httpMocks.mockPut).toHaveBeenCalledWith(
      expect.stringContaining('/inscriptions/traiter-bulk'),
      { ids: [1, 2], approuver: true, motif: 'motif' },
    );

    httpMocks.mockPut.mockResolvedValueOnce({ data: null });
    await expect(InscriptionService.traiterDemandeBulk([1], false)).resolves.toEqual([]);
  });

  it('cancels an inscription with the owner enseignantId', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await InscriptionService.annulerInscription(6, 'E1');
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(
      expect.stringContaining('/inscriptions/6'),
      { params: { enseignantId: 'E1' } },
    );
  });
});




