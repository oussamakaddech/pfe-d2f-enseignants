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

import AnalyticsService from '../AnalyticsService';

describe('AnalyticsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('analyzeEnseignant posts to analyze endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { score: 0.8 } });
    const result = await AnalyticsService.analyzeEnseignant('E01');
    expect(result).toEqual({ score: 0.8 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/analyze/E01'));
  });

  it('triggerBatchAnalysis posts to trigger endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { message: 'ok', nb_queued: 5 } });
    const result = await AnalyticsService.triggerBatchAnalysis();
    expect(result).toEqual({ message: 'ok', nb_queued: 5 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/trigger-batch-analysis'));
  });

  it('getGaps with default params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { gaps: [] } });
    const result = await AnalyticsService.getGaps('E01');
    expect(result).toEqual({ gaps: [] });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/gaps/E01'),
      { params: { urgence: undefined, page: 0, size: 20 } }
    );
  });

  it('getGaps with custom params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { gaps: [1] } });
    await AnalyticsService.getGaps('E02', { urgence: 'haute', page: 1, size: 10 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/gaps/E02'),
      { params: { urgence: 'haute', page: 1, size: 10 } }
    );
  });

  it('getRecommendations with default params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { recommendations: [] } });
    const result = await AnalyticsService.getRecommendations('E01');
    expect(result).toEqual({ recommendations: [] });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/recommendations/E01'),
      { params: { competence_id: undefined, page: 0, size: 20 } }
    );
  });

  it('getRecommendations with custom params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { recommendations: [1] } });
    await AnalyticsService.getRecommendations('E01', { competence_id: 3, page: 2, size: 5 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/recommendations/E01'),
      { params: { competence_id: 3, page: 2, size: 5 } }
    );
  });

  it('getTrainingPath', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { steps: [] } });
    const result = await AnalyticsService.getTrainingPath('E01', 7);
    expect(result).toEqual({ steps: [] });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/training-path/E01/7'));
  });

  it('getDashboardGlobal', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { total: 10 } });
    const result = await AnalyticsService.getDashboardGlobal();
    expect(result).toEqual({ total: 10 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/dashboard/global'));
  });

  it('getCompetencesDeclining', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await AnalyticsService.getCompetencesDeclining();
    expect(result).toEqual([{ id: 1 }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/competences-declining'));
  });

  it('getTeachersAtRisk with default seuil', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ id: 'E01' }] });
    const result = await AnalyticsService.getTeachersAtRisk();
    expect(result).toEqual([{ id: 'E01' }]);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/teachers-at-risk'),
      { params: { seuil: 0.50 } }
    );
  });

  it('getTeachersAtRisk with custom seuil', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [] });
    await AnalyticsService.getTeachersAtRisk(0.75);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/teachers-at-risk'),
      { params: { seuil: 0.75 } }
    );
  });

  it('getHealth', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { status: 'UP' } });
    const result = await AnalyticsService.getHealth();
    expect(result).toEqual({ status: 'UP' });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/health'));
  });
});
