import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../../utils/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    put: httpMocks.mockPut,
    delete: httpMocks.mockDelete,
  },
}));

import EvaluationGlobaleService from '../EvaluationGlobaleService';

describe('EvaluationGlobaleService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates an evaluation globale', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { id: 1 } });
    const result = await EvaluationGlobaleService.createEvaluationGlobale({ formationId: 1 });
    expect(result).toEqual({ id: 1 });
  });

  it('throws on create error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('fail'));
    await expect(EvaluationGlobaleService.createEvaluationGlobale({})).rejects.toThrow('fail');
  });

  it('gets all evaluations globales', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await EvaluationGlobaleService.getAllEvaluationGlobales();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('gets evaluation globale by id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1 } });
    const result = await EvaluationGlobaleService.getEvaluationGlobaleById(1);
    expect(result).toEqual({ id: 1 });
  });

  it('gets evaluation globale by formation id', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { id: 1, formationId: 5 } });
    const result = await EvaluationGlobaleService.getEvaluationGlobaleByFormationId(5);
    expect(result).toEqual({ id: 1, formationId: 5 });
  });

  it('updates an evaluation globale', async () => {
    httpMocks.mockPut.mockResolvedValueOnce({ data: { id: 1, note: 5 } });
    const result = await EvaluationGlobaleService.updateEvaluationGlobale(1, { note: 5 });
    expect(result).toEqual({ id: 1, note: 5 });
  });

  it('deletes an evaluation globale', async () => {
    httpMocks.mockDelete.mockResolvedValueOnce({});
    await EvaluationGlobaleService.deleteEvaluationGlobale(1);
    expect(httpMocks.mockDelete).toHaveBeenCalledOnce();
  });
});
