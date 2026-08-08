import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
  },
}));

import AnalysePredictiveService from '../AnalysePredictiveService';

describe('AnalysePredictiveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('predictGaps calls correct endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { gaps: [] } });
    await AnalysePredictiveService.predictGaps('E1', 3, 5);
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/predict/gaps/E1'), {
      teacher_id: 'E1',
      horizon_months: 3,
      top_n: 5,
    });
  });

  it('trainModel calls correct endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { status: 'trained' } });
    await AnalysePredictiveService.trainModel();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/predict/train'), {});
  });

  it('getDrift calls correct endpoint', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { drift_detected: false } });
    const r = await AnalysePredictiveService.getDrift();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/predict/drift'));
    expect(r.drift_detected).toBe(false);
  });

  it('recommendPath calls correct endpoint', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { path: [] } });
    await AnalysePredictiveService.recommendPath('E1', 101, 3, 40);
    expect(httpMocks.mockPost).toHaveBeenCalledWith(expect.stringContaining('/recommend/path'), {
      teacher_id: 'E1',
      target_competency_id: 101,
      target_level: 3,
      max_duration_hours: 40,
    });
  });

  it('recommendPath sends null max_duration_hours when omitted', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({ data: { path: [] } });
    await AnalysePredictiveService.recommendPath('E1', 101, 3);
    expect(httpMocks.mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/recommend/path'),
      expect.objectContaining({ max_duration_hours: null }),
    );
  });

  it('getAtRiskTeachers calls correct endpoint', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [] });
    await AnalysePredictiveService.getAtRiskTeachers(0.8);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/detect/at-risk-teachers'),
      { params: { threshold: 0.8 } },
    );
  });

  it('getDashboardSummary calls correct endpoint', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: {} });
    await AnalysePredictiveService.getDashboardSummary();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(expect.stringContaining('/dashboard/summary'));
  });

  it('analyserEnseignant combines gaps and recommendations', async () => {
    httpMocks.mockPost
      .mockResolvedValueOnce({
        data: {
          gaps: [
            {
              competency_id: 1,
              competency_name: 'Java',
              current_level: 1,
              required_level: 3,
              predicted_gap: 2,
              confidence: 0.9,
            },
          ],
          overall_risk_score: 0.7,
        },
      })
      .mockResolvedValueOnce({
        data: {
          path: [
            {
              step_number: 1,
              formation_id: 10,
              formation_title: 'Java Master',
              competency_name: 'Java',
              estimated_duration_hours: 20,
              missing_prerequisites: [],
              success_probability: 0.8,
            },
          ],
        },
      });

    const result = await AnalysePredictiveService.analyserEnseignant('E1', 'Java-1');
    expect(result.enseignantId).toBe('E1');
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].gravite).toBe('elevee');
    expect(result.recommandationsFormations).toHaveLength(1);
    expect(result.recommandationsFormations[0].titre).toBe('Java Master');
  });

  it('analyserEnseignant maps gravite by predicted_gap', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({
      data: {
        gaps: [
          {
            competency_id: 1,
            competency_name: 'A',
            current_level: 0,
            required_level: 5,
            predicted_gap: 2.5,
            confidence: 0.9,
          },
          {
            competency_id: 2,
            competency_name: 'B',
            current_level: 0,
            required_level: 5,
            predicted_gap: 1.2,
            confidence: 0.9,
          },
          {
            competency_id: 3,
            competency_name: 'C',
            current_level: 0,
            required_level: 5,
            predicted_gap: 0.5,
            confidence: 0.9,
          },
        ],
        overall_risk_score: 0.5,
      },
    });
    const result = await AnalysePredictiveService.analyserEnseignant('E1');
    expect(result.gaps.map((g: { gravite: string }) => g.gravite)).toEqual([
      'elevee',
      'moyenne',
      'faible',
    ]);
  });

  it('analyserEnseignant throws clear message on 503 without autoTrain', async () => {
    const err = Object.assign(new Error('503'), { response: { status: 503 } });
    httpMocks.mockPost.mockRejectedValueOnce(err);
    await expect(
      AnalysePredictiveService.analyserEnseignant('E1', undefined, { autoTrain: false }),
    ).rejects.toThrow(/administrateur/);
  });

  it('analyserEnseignant attempts auto-train on 503 when autoTrain=true', async () => {
    const err503 = Object.assign(new Error('503'), { response: { status: 503 } });
    httpMocks.mockPost
      .mockRejectedValueOnce(err503) // first predictGaps fails
      .mockResolvedValueOnce({ data: { status: 'trained' } }) // trainModel succeeds
      .mockResolvedValueOnce({
        // retry predictGaps
        data: {
          gaps: [
            {
              competency_id: 1,
              competency_name: 'X',
              current_level: 1,
              required_level: 3,
              predicted_gap: 1.5,
              confidence: 0.8,
            },
          ],
          overall_risk_score: 0.4,
        },
      });
    const result = await AnalysePredictiveService.analyserEnseignant('E1', undefined, {
      autoTrain: true,
    });
    expect(result.gaps).toHaveLength(1);
    expect(result.modelNeedsTraining).toBe(false);
  });

  it('analyserEnseignant surfaces 403 retry error when admin auto-train denied', async () => {
    const err503 = Object.assign(new Error('503'), { response: { status: 503 } });
    const err403 = Object.assign(new Error('403'), { response: { status: 403 } });
    httpMocks.mockPost.mockRejectedValueOnce(err503).mockRejectedValueOnce(err403);
    await expect(
      AnalysePredictiveService.analyserEnseignant('E1', undefined, { autoTrain: true }),
    ).rejects.toThrow(/403/);
  });

  it('analyserEnseignant auto-trains and retries when result is heuristic and autoTrain=true', async () => {
    httpMocks.mockPost
      .mockResolvedValueOnce({
        data: {
          gaps: [
            {
              competency_id: 1,
              competency_name: 'A',
              current_level: 1,
              required_level: 3,
              predicted_gap: 1.0,
              confidence: 0.5,
            },
          ],
          overall_risk_score: 0.3,
          explanation: { method: 'heuristic', model_trained: false },
        },
      })
      .mockResolvedValueOnce({ data: { status: 'trained', metrics: { cv_rmse: 0.5 } } })
      .mockResolvedValueOnce({
        data: {
          gaps: [
            {
              competency_id: 1,
              competency_name: 'A',
              current_level: 1,
              required_level: 3,
              predicted_gap: 0.4,
              confidence: 0.9,
            },
          ],
          overall_risk_score: 0.2,
          explanation: { method: 'ml', model_trained: true },
        },
      });
    const result = await AnalysePredictiveService.analyserEnseignant('E1', undefined, {
      autoTrain: true,
    });
    expect(result.isHeuristic).toBe(false);
    expect(result.modelNeedsTraining).toBe(false);
  });

  it('analyserEnseignant keeps heuristic result when auto-train reports not ready', async () => {
    httpMocks.mockPost
      .mockResolvedValueOnce({
        data: {
          gaps: [
            {
              competency_id: 1,
              competency_name: 'A',
              current_level: 1,
              required_level: 3,
              predicted_gap: 1.0,
            },
          ],
          overall_risk_score: 0.3,
          explanation: { method: 'heuristic' },
        },
      })
      .mockResolvedValueOnce({ data: { status: 'training' } });
    const result = await AnalysePredictiveService.analyserEnseignant('E1', undefined, {
      autoTrain: true,
    });
    expect(result.isHeuristic).toBe(true);
  });

  it('analyserEnseignant keeps heuristic result when auto-train throws', async () => {
    httpMocks.mockPost
      .mockResolvedValueOnce({
        data: {
          gaps: [
            {
              competency_id: 1,
              competency_name: 'A',
              current_level: 1,
              required_level: 3,
              predicted_gap: 1.0,
            },
          ],
          overall_risk_score: 0.3,
          explanation: { method: 'heuristic' },
        },
      })
      .mockRejectedValueOnce(new Error('train failed'));
    const result = await AnalysePredictiveService.analyserEnseignant('E1', undefined, {
      autoTrain: true,
    });
    expect(result.isHeuristic).toBe(true);
  });

  it('analyserEnseignant ignores competenceCible without digits', async () => {
    httpMocks.mockPost.mockResolvedValueOnce({
      data: {
        gaps: [
          {
            competency_id: 1,
            competency_name: 'A',
            current_level: 1,
            required_level: 3,
            predicted_gap: 0.5,
          },
        ],
        overall_risk_score: 0.1,
      },
    });
    const result = await AnalysePredictiveService.analyserEnseignant('E1', 'CompetenceSansChiffre');
    expect(result.recommandationsFormations).toHaveLength(0);
  });

  it('analyserEnseignant keeps recommendations empty when recommendPath fails', async () => {
    httpMocks.mockPost
      .mockResolvedValueOnce({ data: { gaps: [], overall_risk_score: 0 } })
      .mockRejectedValueOnce(new Error('path failed'));
    const result = await AnalysePredictiveService.analyserEnseignant('E1', 'Java-1');
    expect(result.recommandationsFormations).toHaveLength(0);
  });

  it('analyserEnseignant surfaces generic error when retry after auto-train fails', async () => {
    const err503 = Object.assign(new Error('503'), { response: { status: 503 } });
    httpMocks.mockPost
      .mockRejectedValueOnce(err503)
      .mockResolvedValueOnce({ data: { status: 'trained' } })
      .mockRejectedValueOnce(new Error('retry failed'));
    await expect(
      AnalysePredictiveService.analyserEnseignant('E1', undefined, { autoTrain: true }),
    ).rejects.toThrow(/échoué/);
  });

  it('analyserEnseignant rethrows non-503 errors as-is', async () => {
    httpMocks.mockPost.mockRejectedValueOnce(new Error('boom'));
    await expect(AnalysePredictiveService.analyserEnseignant('E1')).rejects.toThrow('boom');
  });

  it('analyserTendancesGlobales processes dashboard data', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        declining_competencies: [{ competency_name: 'C1' }],
        in_demand_competencies: [{ competency_name: 'C2' }],
        teacher_risk_indicators: [{ teacher_name: 'T1', attrition_risk_score: 0.9 }],
      },
    });
    const result = await AnalysePredictiveService.analyserTendancesGlobales();
    expect(result.dashboard.competencesEnDeclin).toContain('C1');
    expect(result.dashboard.competencesEnForteDemande).toContain('C2');
    expect(result.dashboard.enseignantsARisque).toContain('T1');
  });

  it('analyserTendancesGlobales handles errors', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('Summary failed'));
    await expect(AnalysePredictiveService.analyserTendancesGlobales()).rejects.toThrow(
      'Erreur lors du chargement du tableau de bord',
    );
  });

  it('getTrainingNeedsForecast calls correct endpoint with params', async () => {
    const payload = {
      method: 'ewma+linear',
      months: 6,
      history_months: 12,
      departements: [
        {
          departement: 'INFO',
          slope_par_mois: 0.2,
          current_value: 4,
          predicted_value: 5.3,
          delta: 1.3,
          history: [{ month: '2026-01', value: 4 }],
          forecast: [{ month: '2026-08', value: 5.3, lower: 3, upper: 7 }],
        },
      ],
      total_forecast: [{ month: '2026-08', value: 5.3, lower: 3, upper: 7 }],
      top_departements: ['INFO'],
      note: null,
    };
    httpMocks.mockGet.mockResolvedValueOnce({ data: payload });
    const r = await AnalysePredictiveService.getTrainingNeedsForecast(6, 12);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/training-needs-forecast'),
      { params: { months: 6, history_months: 12 } },
    );
    expect(r.departements).toHaveLength(1);
    expect(r.departements[0].predicted_value).toBe(5.3);
    expect(r.total_forecast[0].month).toBe('2026-08');
  });
});
