import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('../../utils/httpClient', () => ({
  defaultApi: {
    post: httpMocks.mockPost,
  },
}));

import AIRecoService from '../aiRecoService';

describe('AIRecoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls recommend with correct payload', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { recommendations: [] } });
    const input = {
      domaine: 'IT',
      objectif: 'Learn AI',
      objectifPedagogique: 'Advanced',
      topN: '5'
    };
    const result = await AIRecoService.recommend(input);
    expect(result).toEqual({ recommendations: [] });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/recommend'),
      {
        domaine: 'IT',
        objectif: 'Learn AI',
        objectifPedagogique: 'Advanced',
        topN: 5
      },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it('handles empty domaine by sending null', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: {} });
    await AIRecoService.recommend({ domaine: '', objectif: 'O', objectifPedagogique: 'P', topN: '3' });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ domaine: null }),
      expect.anything()
    );
  });

  it('throws on error', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('AI service down'));
    await expect(AIRecoService.recommend({} as any)).rejects.toThrow('AI service down');
  });
});
