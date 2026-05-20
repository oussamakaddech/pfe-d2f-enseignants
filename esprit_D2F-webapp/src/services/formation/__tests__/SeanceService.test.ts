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

import SeanceService from '../SeanceService';

describe('SeanceService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a seance', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1, salle: 'A1' } });
    const result = await SeanceService.createSeance({ salle: 'A1' });
    expect(result).toEqual({ id: 1, salle: 'A1' });
  });

  it('throws on create error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('fail'));
    await expect(SeanceService.createSeance({})).rejects.toThrow('fail');
  });

  it('updates a seance', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, salle: 'B2' } });
    const result = await SeanceService.updateSeance(1, { salle: 'B2' });
    expect(result).toEqual({ id: 1, salle: 'B2' });
  });

  it('deletes a seance', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({ data: 'ok' });
    const result = await SeanceService.deleteSeance(1);
    expect(result).toBe('ok');
  });

  it('gets seance by id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    const result = await SeanceService.getSeanceById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('gets all seances', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    const result = await SeanceService.getAllSeances();
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});




