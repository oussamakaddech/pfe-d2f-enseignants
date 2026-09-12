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

import EvaluationFormateurService from '../EvaluationFormateurService';

describe('EvaluationFormateurService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists enriched evaluations by formation', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1, note: 4 }] });
    const result = await EvaluationFormateurService.listEvaluationsEnrichedByFormation(1);
    expect(result).toEqual([{ id: 1, note: 4 }]);
  });

  it('updates evaluations in bulk', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { updated: 3 } });
    const result = await EvaluationFormateurService.updateEvaluationsBulkByFormation(1, [
      { id: 1, note: 5 },
    ]);
    expect(result).toEqual({ updated: 3 });
  });

  it('covers CRUD endpoints', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    await expect(EvaluationFormateurService.listAll()).resolves.toEqual([{ id: 1 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { content: [{ id: 2 }] } });
    await expect(EvaluationFormateurService.listAll()).resolves.toEqual([{ id: 2 }]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: null });
    await expect(EvaluationFormateurService.listAll()).resolves.toEqual([]);

    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    await expect(EvaluationFormateurService.getById(1)).resolves.toEqual({ id: 1 });

    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 3 } });
    await expect(EvaluationFormateurService.create({ note: 5 })).resolves.toEqual({ id: 3 });

    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, note: 4 } });
    await expect(EvaluationFormateurService.update(1, { note: 4 })).resolves.toEqual({
      id: 1,
      note: 4,
    });

    httpMocks.mockDelete.mockResolvedValueOnce({ data: null });
    await expect(EvaluationFormateurService.remove(1)).resolves.toBeUndefined();

    httpMocks.mockPost.mockResolvedValueOnce({ data: null });
    await expect(EvaluationFormateurService.validerCompetences(1)).resolves.toBeUndefined();
  });
});
