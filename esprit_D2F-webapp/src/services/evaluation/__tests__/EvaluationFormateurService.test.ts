import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@/services/httpClient", () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
  },
}));

import EvaluationFormateurService from '../EvaluationFormateurService';

describe('EvaluationFormateurService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists enriched evaluations by formation', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1, note: 4 }] });
    const result = await EvaluationFormateurService.listEvaluationsEnrichedByFormation(1);
    expect(result).toEqual([{ id: 1, note: 4 }]);
  });

  it('updates evaluations in bulk', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { updated: 3 } });
    const result = await EvaluationFormateurService.updateEvaluationsBulkByFormation(1, [{ id: 1, note: 5 }]);
    expect(result).toEqual({ updated: 3 });
  });
});




