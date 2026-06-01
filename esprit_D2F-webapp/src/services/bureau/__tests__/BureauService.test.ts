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

import BureauService from '../BureauService';

describe('BureauService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('gets all bureaux', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1, nom: 'Informatique' }] });
    const result = await BureauService.getAllBureaux();
    expect(result).toEqual([{ id: 1, nom: 'Informatique' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledOnce();
  });

  it('gets bureau by id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 2, nom: 'GC' } });
    const result = await BureauService.getBureauById(2);
    expect(result).toEqual({ id: 2, nom: 'GC' });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/2'));
  });

  it('creates a bureau', async () => {
    const payload = { nom: 'Nouveau', chefId: 10 };
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 3, ...payload } });
    const result = await BureauService.createBureau(payload as Record<string, unknown>);
    expect(result).toEqual({ id: 3, ...payload });
    expect(httpMocks.mockPost).toHaveBeenCalledOnce();
  });

  it('updates a bureau', async () => {
    const payload = { nom: 'Mis à jour', chefId: 5 };
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, ...payload } });
    const result = await BureauService.updateBureau(1, payload as Record<string, unknown>);
    expect(result).toEqual({ id: 1, ...payload });
    expect(httpMocks.mockPut).toHaveBeenCalledWith(
      expect.stringContaining('/1'),
      payload
    );
  });

  it('deletes a bureau', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await expect(BureauService.deleteBureau(4)).resolves.toBeUndefined();
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(expect.stringContaining('/4'));
  });
});
