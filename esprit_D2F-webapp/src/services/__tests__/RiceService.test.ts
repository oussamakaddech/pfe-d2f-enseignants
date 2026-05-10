import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../utils/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    patch: httpMocks.mockPatch,
    delete: httpMocks.mockDelete,
  },
}));

vi.mock('../authHeaders', () => ({
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
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/competence/rice/import'), { domaines: [] }, expect.anything());
  });

  it('getImportHistory retrieves imports', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [] });
    const result = await RiceService.getImportHistory();
    expect(result).toEqual([]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/competence/rice/imports'), expect.anything());
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
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(expect.stringContaining('/100'), expect.anything());
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/enseignant-competences'), expect.objectContaining({ savoirId: 2 }), expect.anything());
  });

  it('covers CRUD for enseignants', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 'E1' } });
    await expect(RiceService.createEnseignant({ nom: 'X' })).resolves.toEqual({ id: 'E1' });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 'E1', nom: 'Y' } });
    await expect(RiceService.updateEnseignant('E1', { nom: 'Y' })).resolves.toEqual({ id: 'E1', nom: 'Y' });

    httpMocks.mockPatch.mockResolvedValueOnce({ data: { id: 'E1', etat: 'I' } });
    await expect(RiceService.deactivateEnseignant('E1')).resolves.toEqual({ id: 'E1', etat: 'I' });
  });
});
