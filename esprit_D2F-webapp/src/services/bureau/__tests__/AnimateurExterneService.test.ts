import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
  },
}));

import AnimateurExterneService from '../AnimateurExterneService';

describe('AnimateurExterneService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists animateurs of a bureau and tolerates a non-array payload', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(AnimateurExterneService.getByBureau(5)).resolves.toEqual([{ id: 1 }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/bureaux/5/animateurs'),
    );

    httpMocks.mockGet.mockResolvedValueOnce({ data: null });
    await expect(AnimateurExterneService.getByBureau(5)).resolves.toEqual([]);
  });

  it('creates, updates and deletes an animateur', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 2, nom: 'X' } });
    await expect(AnimateurExterneService.create(5, { nom: 'X' } as never)).resolves.toEqual({
      id: 2,
      nom: 'X',
    });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 2, nom: 'Y' } });
    await expect(AnimateurExterneService.update(5, 2, { nom: 'Y' } as never)).resolves.toEqual({
      id: 2,
      nom: 'Y',
    });
    expect(httpMocks.mockPut).toHaveBeenCalledWith(
      expect.stringContaining('/bureaux/5/animateurs/2'),
      { nom: 'Y' },
    );

    httpMocks.mockDelete.mockResolvedValueOnce({});
    await AnimateurExterneService.delete(5, 2);
    expect(httpMocks.mockDelete).toHaveBeenCalledWith(
      expect.stringContaining('/bureaux/5/animateurs/2'),
    );
  });
});
