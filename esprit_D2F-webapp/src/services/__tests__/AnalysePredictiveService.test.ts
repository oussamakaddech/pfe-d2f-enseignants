import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../../utils/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
  },
}));

import AnalysePredictiveService from '../AnalysePredictiveService';

describe('AnalysePredictiveService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('predictsGaps calls correct endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { gaps: [] } });
    await AnalysePredictiveService.predictGaps('E1', 3, 5);
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/predict/gaps/E1'),
      { teacher_id: 'E1', horizon_months: 3, top_n: 5 }
    );
  });

  it('trainModel calls correct endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: 'trained' });
    await AnalysePredictiveService.trainModel();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/predict/train'));
  });

  it('recommendPath calls correct endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { path: [] } });
    await AnalysePredictiveService.recommendPath('E1', 101, 3, 40);
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/recommend/path'), {
      teacher_id: 'E1',
      target_competency_id: 101,
      target_level: 3,
      max_duration_hours: 40
    });
  });

  it('getAtRiskTeachers calls correct endpoint', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [] });
    await AnalysePredictiveService.getAtRiskTeachers(0.8);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/detect/at-risk-teachers'), {
      params: { threshold: 0.8 }
    });
  });

  it('getDashboardSummary calls correct endpoint', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: {} });
    await AnalysePredictiveService.getDashboardSummary();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/dashboard/summary'));
  });

  it('analyserEnseignant combines gaps and recommendations', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { gaps: [{ competency_id: 1, competency_name: 'Java', current_level: 1, required_level: 3, predicted_gap: 2, confidence: 0.9 }], overall_risk_score: 0.7 } });
    httpMocks.mockPost.mockResolvedValueOnce({ data: { path: [{ step_number: 1, formation_id: 10, formation_title: 'Java Master', competency_name: 'Java', estimated_duration_hours: 20, missing_prerequisites: [], success_probability: 0.8 }] } });
    
    const result = await AnalysePredictiveService.analyserEnseignant('E1', 'Java-1');
    expect(result.enseignantId).toBe('E1');
    expect(result.gaps).toHaveLength(1);
    expect(result.recommandationsFormations).toHaveLength(1);
    expect(result.recommandationsFormations[0].titre).toBe('Java Master');
  });

  it('analyserTendancesGlobales processes dashboard data', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { 
      declining_competencies: [{ competency_name: 'C1' }], 
      in_demand_competencies: [{ competency_name: 'C2' }], 
      teacher_risk_indicators: [{ teacher_name: 'T1', attrition_risk_score: 0.9 }] 
    } });
    
    const result = await AnalysePredictiveService.analyserTendancesGlobales();
    expect(result.dashboard.competencesEnDeclin).toContain('C1');
    expect(result.dashboard.competencesEnForteDemande).toContain('C2');
    expect(result.dashboard.enseignantsARisque).toContain('T1');
  });

  it('analyserTendancesGlobales handles errors', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('Summary failed'));
    await expect(AnalysePredictiveService.analyserTendancesGlobales()).rejects.toThrow('Summary failed');
  });
});
