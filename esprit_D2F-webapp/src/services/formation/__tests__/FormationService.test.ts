import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/utils/helpers/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
  },
}));

import FormationService from '../FormationService';

describe('FormationService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a formation', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1, titre: 'Java' } });
    const result = await FormationService.createFormation({ titre: 'Java' });
    expect(result).toEqual({ id: 1, titre: 'Java' });
  });

  it('throws on create error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('fail'));
    await expect(FormationService.createFormation({})).rejects.toThrow('fail');
  });

  it('gets all formations', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await FormationService.getAllFormations();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('gets formation by id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1, titre: 'Java' } });
    const result = await FormationService.getFormationById(1);
    expect(result).toEqual({ id: 1, titre: 'Java' });
  });

  it('updates a formation', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, titre: 'Updated' } });
    const result = await FormationService.updateFormation(1, { titre: 'Updated' });
    expect(result).toEqual({ id: 1, titre: 'Updated' });
  });

  it('deletes a formation', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await FormationService.deleteFormation(1);
    expect(httpMocks.mockDelete).toHaveBeenCalledOnce();
  });
});




