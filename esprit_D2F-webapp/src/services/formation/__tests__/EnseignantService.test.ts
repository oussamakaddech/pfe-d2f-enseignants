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

vi.mock("@/services/auth/authHeaders", () => ({
  requireAuthHeader: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

import EnseignantService from '../EnseignantService';

describe('EnseignantService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates an enseignant', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 'E1', nom: 'Dupont' } });
    const result = await EnseignantService.createEnseignant({ nom: 'Dupont' });
    expect(result).toEqual({ id: 'E1', nom: 'Dupont' });
  });

  it('creates an enseignant with account', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 'E2', nom: 'Martin' } });
    const result = await EnseignantService.createEnseignantWithAccount({ nom: 'Martin', email: 'martin@esprit.tn' }, 'ENSEIGNANT');
    expect(result).toEqual({ id: 'E2', nom: 'Martin' });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/with-account'),
      expect.any(Object),
      { params: { role: 'ENSEIGNANT' } }
    );
  });

  it('throws on create error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('fail'));
    await expect(EnseignantService.createEnseignant({})).rejects.toThrow('fail');
  });

  it('gets all enseignants and normalizes paginated responses', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'E1' }] });
    const result = await EnseignantService.getAllEnseignants();
    expect(result).toEqual([{ id: 'E1' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/formation/enseignants'),
      { params: { size: 5000 } },
    );

    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 'E2' }] } });
    await expect(EnseignantService.getAllEnseignants()).resolves.toEqual([{ id: 'E2' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { data: [{ id: 'E3' }] } });
    await expect(EnseignantService.getAllEnseignants()).resolves.toEqual([{ id: 'E3' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'E4' }] } });
    await expect(EnseignantService.getAllEnseignants()).resolves.toEqual([{ id: 'E4' }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { unknown: true } });
    await expect(EnseignantService.getAllEnseignants()).resolves.toEqual([]);
  });

  it('throws on getAllEnseignants error', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('Network error'));
    await expect(EnseignantService.getAllEnseignants()).rejects.toThrow('Network error');
  });

  it('gets enseignant by id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 'E1', nom: 'Dupont' } });
    const result = await EnseignantService.getEnseignantById('E1');
    expect(result).toEqual({ id: 'E1', nom: 'Dupont' });
  });

  it('updates an enseignant', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 'E1', nom: 'Updated' } });
    const result = await EnseignantService.updateEnseignant('E1', { nom: 'Updated' });
    expect(result).toEqual({ id: 'E1', nom: 'Updated' });
  });

  it('deletes an enseignant', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await EnseignantService.deleteEnseignant('E1');
    expect(httpMocks.mockDelete).toHaveBeenCalledOnce();
  });

  it('uploads enseignants excel', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { imported: 5 } });
    const file = new File(['data'], 'enseignants.xlsx');
    const result = await EnseignantService.uploadEnseignants(file);
    expect(result).toEqual({ imported: 5 });
  });

  it('throws on upload error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('upload fail'));
    await expect(EnseignantService.uploadEnseignants(new File(['x'], 'f.xlsx'))).rejects.toThrow('upload fail');
  });
});




