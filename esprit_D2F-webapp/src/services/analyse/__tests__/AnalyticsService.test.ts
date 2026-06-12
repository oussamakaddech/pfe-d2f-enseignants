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

  it('getEnseignantsSansFormation with default and custom params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    const r1 = await AnalyticsService.getEnseignantsSansFormation();
    expect(r1).toEqual({ items: [], total: 0 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/enseignants-sans-formation'),
      expect.objectContaining({ params: expect.objectContaining({ page: 0, size: 20 }) })
    );

    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [{ id: 'E1' }], total: 1 } });
    const r2 = await AnalyticsService.getEnseignantsSansFormation({ mois: 6, departement: 'GC', up: 'UP1', page: 1, size: 10 });
    expect(r2).toEqual({ items: [{ id: 'E1' }], total: 1 });
  });

  it('getFormationsParPeriode with default and custom params', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [] } });
    const r1 = await AnalyticsService.getFormationsParPeriode();
    expect(r1).toEqual({ items: [] });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/formations-par-periode'),
      expect.objectContaining({ params: expect.objectContaining({ granularite: 'MOIS' }) })
    );

    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [{ mois: 'Jan' }] } });
    const r2 = await AnalyticsService.getFormationsParPeriode({ granularite: 'TRIMESTRE', debut: '2026-01', fin: '2026-12', departement: 'INFO', up: 'UP2' });
    expect(r2).toEqual({ items: [{ mois: 'Jan' }] });
  });

  it('getFormationsParUp with default and custom opts', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [{ up: 'GC', count: 3 }] } });
    const r1 = await AnalyticsService.getFormationsParUp();
    expect(r1).toEqual({ items: [{ up: 'GC', count: 3 }] });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/formations-par-up'),
      expect.any(Object)
    );

    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [] } });
    await AnalyticsService.getFormationsParUp({ annee: 2026, departement: 'GC' });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/formations-par-up'),
      { params: { annee: 2026, departement: 'GC' } }
    );
  });

  it('getFormationsParDepartement with default and custom opts', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [] } });
    const r1 = await AnalyticsService.getFormationsParDepartement();
    expect(r1).toEqual({ items: [] });

    httpMocks.mockGet.mockResolvedValueOnce({ data: { items: [{ dept: 'INFO' }] } });
    await AnalyticsService.getFormationsParDepartement({ annee: 2026 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/formations-par-departement'),
      { params: { annee: 2026 } }
    );
  });

  it('exportExcel and exportPdf return blob data', async () => {
    const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats' });
    httpMocks.mockGet.mockResolvedValueOnce({ data: blob });
    const r1 = await AnalyticsService.exportExcel('formations-par-up' as never);
    expect(r1).toBe(blob);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/export/excel'),
      expect.objectContaining({ responseType: 'blob' })
    );

    const pdfBlob = new Blob(['pdf'], { type: 'application/pdf' });
    httpMocks.mockGet.mockResolvedValueOnce({ data: pdfBlob });
    const r2 = await AnalyticsService.exportPdf('rapport-annuel' as never, { annee: 2026 });
    expect(r2).toBe(pdfBlob);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/export/pdf'),
      expect.objectContaining({ responseType: 'blob', params: { type: 'rapport-annuel', annee: 2026 } })
    );
  });
});
