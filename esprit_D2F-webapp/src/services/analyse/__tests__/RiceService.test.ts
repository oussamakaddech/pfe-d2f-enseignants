import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    patch: httpMocks.mockPatch,
    delete: httpMocks.mockDelete,
  },
}));

vi.mock("@/services/auth/authHeaders", () => ({
  requireAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

import RiceService from '../RiceService';

describe('RiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('analyze sends formData to python service', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { result: 'ok' } });
    const files = [new File([''], 'test.pdf')];
    const enseignants = [{ id: '1' }];
    const result = await RiceService.analyze(files, enseignants, 'info');
    
    expect(result).toEqual({ result: 'ok' });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/rice/analyze'),
      expect.any(FormData),
      expect.objectContaining({ timeout: 300000 })
    );
  });

  it('importToDb sends payload to competence service', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { success: true } });
    const result = await RiceService.importToDb({ domaines: [] });
    expect(result).toEqual({ success: true });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/competence/rice/import'), { domaines: [] });
  });

  it('getImportHistory retrieves imports', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [] });
    const result = await RiceService.getImportHistory();
    expect(result).toEqual([]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/competence/rice/imports'));
  });

  it('getEnseignants tries formation then fallback to competence', async () => {
    // Try formation first
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'E1', departement: 'INFO' }] });
    const result = await RiceService.getEnseignants('info');
    expect(result).toEqual([{ id: 'E1', departement: 'INFO' }]);

    // Fallback if formation fails
    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 'E2' }], totalPages: 1 } });
    const result2 = await RiceService.getEnseignants();
    expect(result2).toEqual([{ id: 'E2' }]);
  });

  it('saveAssignments handles add and remove', async () => {
    // Mock existing to find IDs for removal
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 100, savoirId: 1, enseignantId: 'E1' }] });
    httpMocks.mockDelete.mockResolvedValueOnce({});
    httpMocks.mockPost.mockResolvedValueOnce({});

    const result = await RiceService.saveAssignments({
      add: [{ savoirId: 2, enseignantId: 'E1' }],
      remove: [{ savoirId: 1, enseignantId: 'E1' }]
    });

    expect(result).toEqual({ added: 1, removed: 1 });
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(expect.stringContaining('/100'));
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/enseignant-competences'), expect.objectContaining({ savoirId: 2 }));
  });

  it('covers CRUD for enseignants', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 'E1' } });
    await expect(RiceService.createEnseignant({ nom: 'X' })).resolves.toEqual({ id: 'E1' });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 'E1', nom: 'Y' } });
    await expect(RiceService.updateEnseignant('E1', { nom: 'Y' })).resolves.toEqual({ id: 'E1', nom: 'Y' });

    httpMocks.mockPatch.mockResolvedValueOnce({ data: { id: 'E1', etat: 'I' } });
    await expect(RiceService.deactivateEnseignant('E1')).resolves.toEqual({ id: 'E1', etat: 'I' });
  });

  it('getEnseignantAffectations returns assignments', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1, savoirId: 1, enseignantId: 'E1' }] });
    const result = await RiceService.getEnseignantAffectations();
    expect(result).toEqual([{ id: 1, savoirId: 1, enseignantId: 'E1' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/enseignant-competences')
    );
  });

  it('assignCompetence posts to enseignant-competences', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 10 } });
    const result = await RiceService.assignCompetence({ enseignantId: 'E1', savoirId: 1, niveau: 'N1_DEBUTANT' });
    expect(result).toEqual({ id: 10 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/enseignant-competences'),
      { enseignantId: 'E1', savoirId: 1, niveau: 'N1_DEBUTANT' }
    );
  });

  it('removeAssignment deletes by id', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({ data: null });
    await RiceService.removeAssignment(42);
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(
      expect.stringContaining('/enseignant-competences/42')
    );
  });

  it('getSavoirs returns array directly', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(RiceService.getSavoirs()).resolves.toEqual([{ id: 1 }]);
  });

  it('getSavoirs with departement filters by department', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 2 }], totalPages: 1 } });
    await expect(RiceService.getSavoirs('gc')).resolves.toEqual([{ id: 2 }]);
  });

  it('getSavoirs handles savoirs object key format', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { savoirs: [{ id: 3 }], totalPages: 1 } });
    await expect(RiceService.getSavoirs()).resolves.toEqual([{ id: 3 }]);
  });

  it('getSavoirs falls back to rice referential on error', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('competence fail'));
    httpMocks.mockGet.mockResolvedValueOnce({ data: { savoirs: [{ id: 4 }] } });
    await expect(RiceService.getSavoirs()).resolves.toEqual([{ id: 4 }]);
  });

  it('getSavoirs rethrows if fallback also fails', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('competence fail'));
    httpMocks.mockGet.mockRejectedValueOnce(new Error('rice fail'));
    await expect(RiceService.getSavoirs()).rejects.toThrow('competence fail');
  });

  it('saveAssignments returns immediately for empty add and remove', async () => {
    const result = await RiceService.saveAssignments({ add: [], remove: [] });
    expect(result).toEqual({ added: 0, removed: 0 });
    expect(httpMocks.mockGet).not.toHaveBeenCalled();
  });

  it('getEnseignants handles multi-page via fallback', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('formation fail'));
    httpMocks.mockGet
      .mockResolvedValueOnce({ data: { content: [{ id: 'E1' }], totalPages: 2 } })
      .mockResolvedValueOnce({ data: { content: [{ id: 'E2' }], totalPages: 2 } });
    const result = await RiceService.getEnseignants();
    expect(result).toHaveLength(2);
  });

  it('getEnseignants normalizes data-keyed payload', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('fail'));
    httpMocks.mockGet.mockResolvedValueOnce({ data: { data: [{ id: 'E3' }], totalPages: 1 } });
    const result = await RiceService.getEnseignants();
    expect(result).toEqual([{ id: 'E3' }]);
  });
});




