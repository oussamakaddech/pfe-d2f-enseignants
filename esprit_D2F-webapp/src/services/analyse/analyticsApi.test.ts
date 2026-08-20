import { describe, it, expect, vi, beforeEach } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
    patch: httpMocks.mockPatch,
  },
}));

vi.mock('@/config/env', () => ({
  config: { ANALYSE_URL: '/api' },
}));

import { analyticsApi } from '@/services/analyse/analyticsApi';

const BASE = '/api/analyse/v1/analytics';

beforeEach(() => {
  vi.clearAllMocks();
  httpMocks.mockGet.mockResolvedValue({ data: { data: {}, meta: {}, errors: [] } });
  httpMocks.mockPost.mockResolvedValue({ data: {} });
  httpMocks.mockPatch.mockResolvedValue({ data: {} });
});

describe('analyticsApi â€“ indivuel', () => {
  it('analyze appelle POST sur /analysis/:id', async () => {
    await analyticsApi.analyze('T1');
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/analysis/T1`);
  });

  it('getGaps appelle GET /teachers/:id/gaps', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { data: [], meta: {}, errors: [] },
    });
    await analyticsApi.getGaps('T1');
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/gaps`, {
      params: { page: 1, size: 20 },
    });
  });

  it('getGaps filtre urgence et pagine cÃ´tÃ© client', async () => {
    const envelope = {
      data: {
        data: [
          {
            competence_id: 1,
            competence_code: 'C1',
            competence_nom: 'CompÃ©tence',
            observed_result: 1,
            knowledge_difficulty_level: 5,
            gap_score: 0.8,
            severity: 'CRITIQUE',
            trend: 'STABLE',
            as_of: '2026-08-01',
          },
          {
            competence_id: 2,
            competence_code: 'C2',
            competence_nom: 'CompÃ©tence 2',
            observed_result: 2,
            knowledge_difficulty_level: 5,
            gap_score: 0.6,
            severity: 'HAUTE',
            trend: 'DECLINING',
            as_of: '2026-08-01',
          },
        ],
        meta: {},
        errors: [],
      },
    };
    httpMocks.mockGet
      .mockResolvedValueOnce(envelope)
      .mockResolvedValueOnce(envelope)
      .mockResolvedValueOnce(envelope);
    expect(httpMocks.mockGet).not.toHaveBeenCalled();
    const resPage0 = await analyticsApi.getGaps('T1', { urgence: 'CRITIQUE' });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/gaps`, {
      params: { page: 1, size: 20 },
    });
    expect(resPage0.total).toBe(1);
    expect(resPage0.page).toBe(0);
    expect(resPage0.size).toBe(1);
    expect(resPage0.gaps[0].niveau_urgence).toBe('CRITIQUE');
    const resPage2 = await analyticsApi.getGaps('T1', { urgence: 'CRITIQUE', page: 2, size: 5 });
    expect(resPage2.total).toBe(1);
    expect(resPage2.page).toBe(2);
    expect(resPage2.size).toBe(5);
    expect(resPage2.gaps).toHaveLength(0);
  });

  it('getGaps calcule gaps_summary sur tous les gaps (indÃ©pendant du filtre urgence)', async () => {
    const envelope = {
      data: {
        data: [
          {
            competence_id: 1,
            competence_code: 'C1',
            competence_nom: 'CompÃ©tence',
            observed_result: 1,
            knowledge_difficulty_level: 5,
            gap_score: 0.8,
            severity: 'CRITIQUE',
            trend: 'DECLINING',
            as_of: '2026-08-01',
          },
          {
            competence_id: 2,
            competence_code: 'C2',
            competence_nom: 'CompÃ©tence 2',
            observed_result: 2,
            knowledge_difficulty_level: 5,
            gap_score: 0.6,
            severity: 'HAUTE',
            trend: 'STABLE',
            as_of: '2026-08-01',
          },
        ],
        meta: {},
        errors: [],
      },
    };
    httpMocks.mockGet.mockResolvedValueOnce(envelope);
    const res = await analyticsApi.getGaps('T1', { urgence: 'CRITIQUE' });
    expect(res.gaps).toHaveLength(1);
    expect(res.gaps_summary).toEqual({
      total: 2,
      critical: 1,
      high: 1,
      stagnant: 0,
      declining: 1,
    });
  });

  it('getRecommendations appelle GET /teachers/:id/recommendations avec competence_id', async () => {
    await analyticsApi.getRecommendations('T1', { competence_id: 7, page: 1 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/recommendations`, {
      params: { competence_id: 7, limit: 20 },
    });
  });

  it('getTrainingPath appelle GET', async () => {
    await analyticsApi.getTrainingPath('T1', 3);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/training-path/T1/3`);
  });

  it('getRisk appelle GET /teachers/:id/risk', async () => {
    await analyticsApi.getRisk('T1');
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/risk`);
  });

  it("getRisk mappe l'enveloppe DDD vers RiskScore", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: 'T1',
          risk_score: 85,
          risk_level: 'CRITICAL',
          factors: [
            { feature: 'stagnation', value: 0.8, contribution: 0.2 },
            { feature: 'HIGH_proba', value: 0.62, contribution: 0.3875 },
          ],
          computed_at: '2026-08-01T00:00:00Z',
        },
        meta: { model_mode: 'PRODUCTION_ML', model_version: 'v3' },
        errors: [],
      },
    });
    const res = await analyticsApi.getRisk('T1');
    expect(res.score).toBe(0.85);
    expect(res.score_percent).toBe(85);
    expect(res.niveau).toBe('CRITIQUE');
    expect(res.level_label).toBe('Critique');
    expect(res.facteurs[0].nom).toBe('Stagnation');
    expect(res.facteurs[0].valeur_brute).toBe(0.8);
    expect(res.facteurs[0].categorie).toBe('FACTEUR');
expect(res.facteurs[1]).toMatchObject({
      nom: 'Probabilité classe Élevée',
      categorie: 'PROBABILITE_ML',
    });
    expect(res.model_mode).toBe('PRODUCTION_ML');
    expect(res.model_version).toBe('v3');
  });

  it('getRisk tag HEURISTIC_FALLBACK sans meta model_mode', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: 'T1',
          risk_score: 30,
          risk_level: 'MEDIUM',
          factors: [],
          computed_at: '2026-08-01T00:00:00Z',
        },
        meta: {},
        errors: [],
      },
    });
    const res = await analyticsApi.getRisk('T1');
    expect(res.model_mode).toBe('HEURISTIC_FALLBACK');
    expect(res.score_percent).toBe(30);
    expect(res.level_label).toBe('Modéré');
  });

  it('getRiskHistory transmet mois', async () => {
    await analyticsApi.getRiskHistory('T1', 6);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/enseignants/T1/historique-risque`, {
      params: { mois: 6 },
    });
  });

  it('getPilotage transmet horizon_mois', async () => {
    await analyticsApi.getPilotage(9);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/pilotage`, {
      params: { horizon_mois: 9 },
    });
  });

  it("getPilotage sans horizon n'envoie pas de params", async () => {
    await analyticsApi.getPilotage();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/pilotage`, { params: {} });
  });
});

describe('analyticsApi â€“ dashboard', () => {
  it('mappe le payload rÃ©el /dashboard/global vers le type UI', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          real_kpis: {
            nb_enseignants_suivis: 30,
            nb_profils_risque: 30,
            score_risque_moyen: 0.6,
            nb_gaps_critiques: 40,
            nb_alertes_nouvelles: 15,
            taux_couverture_global: 0.75,
            nb_regression: 3,
            nb_stagnation: 5,
            besoins_critiques_non_satisfaits: 8,
            alertes_critiques_ouvertes: 2,
          },
          enseignants_a_risque: [
            {
              enseignant_id: 'T1',
              nom: 'Nom Test',
              departement: 'DEPT_INFO',
              up: 'UP-INFO',
              score_risque: 0.8,
              niveau_risque: 'CRITIQUE',
              tendance: 'STABLE',
              nb_gaps_critiques: 2,
            },
          ],
          department_gap_heatmap: [
            {
              departement: 'DEPT_INFO',
              competence_id: 1,
              competence_nom: 'COMP-1',
              avg_gap: 0.5,
              enseignants_count: 5,
            },
          ],
          top_formations_recommandees: [
            {
              formation_id: 7,
              formation_titre: 'Formation A',
              nb_recommandations: 3,
              enseignants_cibles: 3,
              departements: ['DEPT_INFO'],
              competences_couvertes: ['COMP-1'],
              impact_estime: 0.6,
              score_moyen: 0.8,
              proba_reussite_moy: 0.7,
            },
          ],
          monthly_risk_evolution: [
            {
              month: '2026-06',
              critical: 2,
              high: 3,
              score_risque_moyen: 0.6,
              total_enseignants: 30,
            },
          ],
          generated_at: '2026-08-01',
        },
        meta: {},
        errors: [],
      },
    });
    const res = await analyticsApi.getDashboard();
    expect(res.enseignants_a_risque[0].nom).toBe('Nom Test');
    expect(res.enseignants_a_risque[0].score_risque).toBe(0.8);
    expect(res.heatmap[0].avg_gap).toBe(0.5);
    expect(res.kpis.nb_enseignants_suivis).toBe(30);
    expect(res.kpis.nb_gaps_critiques).toBe(40);
    expect(res.tendances[0].nb_gaps_critiques).toBe(2);
  });

  it('supporte un payload brut (sans enveloppe) sur /dashboard/global', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        real_kpis: { nb_enseignants_suivis: 12, score_risque_moyen: 0.4, nb_gaps_critiques: 6 },
        enseignants_a_risque: [],
        department_gap_heatmap: [],
        top_formations_recommandees: [],
        monthly_risk_evolution: [],
      },
    });
    const res = await analyticsApi.getDashboard();
    expect(res.kpis.nb_enseignants_suivis).toBe(12);
    expect(res.kpis.score_risque_moyen).toBe(0.4);
  });

  it('dÃ©rive la distribution des risques de la liste Ã  risque', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          real_kpis: { nb_enseignants_suivis: 3, score_risque_moyen: 0.7 },
          enseignants_a_risque: [
            {
              enseignant_id: 'T1',
              nom: 'T1',
              score_risque: 0.8,
              niveau_risque: 'CRITIQUE',
              tendance: 'STABLE',
              nb_gaps_critiques: 1,
            },
            {
              enseignant_id: 'T2',
              nom: 'T2',
              score_risque: 0.75,
              niveau_risque: 'CRITIQUE',
              tendance: 'STABLE',
              nb_gaps_critiques: 1,
            },
            {
              enseignant_id: 'T3',
              nom: 'T3',
              score_risque: 0.55,
              niveau_risque: 'ELEVE',
              tendance: 'STABLE',
              nb_gaps_critiques: 1,
            },
          ],
          department_gap_heatmap: [],
          top_formations_recommandees: [],
          monthly_risk_evolution: [],
        },
        meta: {},
        errors: [],
      },
    });
    const res = await analyticsApi.getDashboard();
    const byLevel = Object.fromEntries(res.distribution_risques.map((d) => [d.niveau, d.count]));
    expect(byLevel.CRITIQUE).toBe(2);
    expect(byLevel.ELEVE).toBe(1);
  });

  it('getHeatmap appelle GET /dashboard/gap-heatmap', async () => {
    await analyticsApi.getHeatmap();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/gap-heatmap`);
  });

  it('getAtRisk appelle GET /dashboard/teachers-at-risk', async () => {
    await analyticsApi.getAtRisk({ departement_id: 'D1', seuil: 0.5 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/teachers-at-risk`);
  });

  it('getTeachersByCell transmet limit', async () => {
    await analyticsApi.getTeachersByCell('D1', 5, 12);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/teachers-by-cell`, {
      params: { departement: 'D1', competence_id: 5, limit: 12 },
    });
  });

  it('getDecliningSkills appelle GET', async () => {
    await analyticsApi.getDecliningSkills({ up_id: 'UP1' });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/competences-declining`, {
      params: { up_id: 'UP1' },
    });
  });

  it('getRiskEvolution appelle GET /dashboard/risk-evolution', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: [
        { month: '2026-06', critical: 2, high: 3, score_risque_moyen: 0.6, total_enseignants: 30 },
      ],
    });
    const res = await analyticsApi.getRiskEvolution(6);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/risk-evolution`, {
      params: { months: 6 },
    });
    expect(res[0].nb_gaps_critiques).toBe(2);
    expect(res[0].score_risque_moyen).toBe(0.6);
  });
});

describe('analyticsApi â€“ alertes & impact', () => {
  it("getAlerts lit l'enveloppe rÃ©elle et mappe les alertes", async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 42,
            alert_type: 'GAP_CRITIQUE',
            target_type: 'INDIVIDUEL',
            teacher_id: 'T1',
            department_id: null,
            competence_id: 3,
            severity: 'CRITICAL',
            title: 'Gap critique dÃ©tectÃ©',
            message: 'Ã‰cart sÃ©vÃ¨re',
            details: {},
            status: 'NOUVELLE',
            created_at: '2026-07-01T10:00:00Z',
          },
        ],
        meta: { total: 1 },
        errors: [],
      },
    });
    const res = await analyticsApi.getAlerts({ severite: 'CRITICAL', page: 1 });
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/alerts`, {
      params: {
        page: 1,
        size: 100,
        severity: 'CRITICAL',
        status: undefined,
        target_type: undefined,
      },
    });
    expect(res.alerts[0].id).toBe(42);
    expect(res.alerts[0].type_alerte).toBe('GAP_CRITIQUE');
    expect(res.alerts[0].statut).toBe('NOUVELLE');
  });

  it('updateAlert fait PATCH /alerts/{id}/status avec le statut backend', async () => {
    httpMocks.mockPatch.mockResolvedValueOnce({ data: { id: 1, status: 'RESOLUE' } });
    const res = await analyticsApi.updateAlert(1, { statut: 'TRAITEE' });
    expect(httpMocks.mockPatch).toHaveBeenCalledWith(`${BASE}/alerts/1/status`, {
      status: 'RESOLUE',
      comment: null,
    });
    expect(res.statut).toBe('TRAITEE');
  });

  it('getTrainingImpact appelle GET', async () => {
    await analyticsApi.getTrainingImpact();
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/training-impact`);
  });

  it('getTrainingImpactFormations transmet page/size', async () => {
    await analyticsApi.getTrainingImpactFormations(2, 5);
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/dashboard/training-impact/formations`, {
      params: { page: 2, size: 5 },
    });
  });

  it('simulateWhatIf fait POST', async () => {
    await analyticsApi.simulateWhatIf({ enseignant_id: 'T1', plan: [], horizon_mois: 6 });
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/simulate/what-if`, {
      enseignant_id: 'T1',
      plan: [],
      horizon_mois: 6,
    });
  });
});

describe('analyticsApi â€“ monitoring', () => {
  it('getModelStatus mappe le statut', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { gap_model_accuracy: 0.9, last_retrain_status: 'v2', last_retrained: '2024-01-01' },
    });
    const res = await analyticsApi.getModelStatus();
    expect(res.version).toBe('v2');
    expect(res.accuracy).toBe(0.9);
    expect(res.algorithme).toBe('GradientBoosting');
    expect(res.disponible).toBe(true);
  });

  it('getModelStatus marque indisponible si accuracy nulle', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: { gap_model_accuracy: null } });
    const res = await analyticsApi.getModelStatus();
    expect(res.disponible).toBe(false);
  });

  it('getDrift mappe la dÃ©rive', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({ data: [{ critical: 3 }, { critical: 5 }] });
    const res = await analyticsApi.getDrift();
    expect(res.valeur_actuelle).toBe(5);
    expect(res.drift_detected).toBe(false);
  });

  it('retrain fait POST /admin/retrain', async () => {
    await analyticsApi.retrain();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/admin/retrain`);
  });

  it('rollback fait POST with rollback_only', async () => {
    await analyticsApi.rollback();
    expect(httpMocks.mockPost).toHaveBeenCalledWith(`${BASE}/admin/retrain`, {
      rollback_only: true,
    });
  });
});

describe('analyticsApi â€“ scope-analysis', () => {
  it('getTeacherScopeAnalysis appelle GET /teachers/:id/scope-analysis', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          context: {
            teacher_id: 'T1',
            nom_complet: 'Alice Dupont',
            mail: 'a@esprit.tn',
            specialite: 'Dev Backend',
            grade: 'Assistant',
            up_id: 'UP_GL',
            up_libelle: 'Genie Logiciel',
            dept_id: 'DEPT_GL',
            dept_libelle: 'Genie Logiciel',
          },
          gaps: [
            {
              competence_id: 1,
              competence_code: 'DEV.BACK',
              competence_nom: 'Backend',
              observed_result: 2,
              knowledge_difficulty_level: 5,
              gap_score: 0.75,
              severity: 'CRITIQUE',
              trend: 'STABLE',
              as_of: '2026-08-02',
            },
          ],
          recommendations: [
            {
              formation_id: 1,
              titre: 'Spring Boot Avance',
              competence_id: 1,
              rank_score: 0.65,
              reason: 'Couvre savoirs manquants',
              matched_savoirs: ['S1'],
            },
          ],
          scoped_competencies_count: 3,
          total_competencies_count: 12,
          scope: {
            type: 'DEPARTMENT',
            is_global: false,
            label: 'DÃ©partement GÃ©nie Logiciel',
          },
          computed_at: '2026-08-02T00:00:00Z',
        },
        meta: {},
        errors: [],
      },
    });
    const out = await analyticsApi.getTeacherScopeAnalysis('T1');
    expect(httpMocks.mockGet).toHaveBeenCalledWith(`${BASE}/teachers/T1/scope-analysis`);
    expect(out.context.nom_complet).toBe('Alice Dupont');
    expect(out.context.specialite).toBe('Dev Backend');
    expect(out.gaps).toHaveLength(1);
    expect(out.gaps[0].niveau_urgence).toBe('CRITIQUE');
    expect(out.recommendations).toHaveLength(1);
    expect(out.recommendations[0].formation_titre).toBe('Spring Boot Avance');
    expect(out.scoped_competencies_count).toBe(3);
    expect(out.total_competencies_count).toBe(12);
    expect(out.scope.type).toBe('DEPARTMENT');
    expect(out.scope.is_global).toBe(false);
    expect(out.scope.label).toBe('DÃ©partement GÃ©nie Logiciel');
  });

  it('getRisk mappe le DTO normalisÃ© (score 0..1, is_capped, facteurs bornÃ©s)', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: 'T1',
          risk_score: 98,
          risk_level: 'CRITICAL',
          score: 0.98,
          score_percent: 98,
          level: 'CRITICAL',
          level_label: 'CRITIQUE',
          is_capped: false,
          uncapped_score: 0.98,
          factors: [
            {
              feature: 'critical_gaps',
              code: 'critical_gaps',
              label: 'Gaps critiques',
              raw_value: 12,
              normalized_value: 1,
              weight: 0.5,
              contribution: 0.5,
              contribution_percent: 50,
              scope: 'DEPARTMENT',
            },
            {
              feature: 'high_gaps',
              code: 'high_gaps',
              label: 'Gaps haute prioritÃ©',
              raw_value: 2,
              normalized_value: 1,
              weight: 0.12,
              contribution: 0.12,
              contribution_percent: 12,
            },
          ],
          computed_at: '2026-08-02T00:00:00Z',
        },
        meta: { model_mode: 'PRODUCTION_ML', model_version: 'v1' },
        errors: [],
      },
    });
    const score = await analyticsApi.getRisk('T1');
    expect(score.score).toBe(0.98);
    expect(score.score_percent).toBe(98);
    expect(score.niveau).toBe('CRITIQUE');
    expect(score.is_capped).toBe(false);
    expect(score.uncapped_score).toBe(0.98);
    expect(score.facteurs[0]).toMatchObject({
      nom: 'Gaps critiques',
      code: 'critical_gaps',
      valeur_brute: 12,
      valeur_normalisee: 1,
      poids: 0.5,
      contribution: 0.5,
      contribution_percent: 50,
      categorie: 'FACTEUR',
    });
    // Jamais 300% / 3.000 : la contribution est bornÃ©e Ã  50 % pour 12 gaps critiques.
    expect(score.facteurs[0].contribution).toBeLessThanOrEqual(1);
    expect(score.facteurs[0].contribution_percent).toBeLessThanOrEqual(100);
    expect(score.facteurs[1].contribution_percent).toBe(12);
    // PÃ©rimÃ¨tre des facteurs (scope du DTO backend) propagÃ© vers l'UI.
    expect(score.facteurs[0].scope).toBe('DEPARTMENT');
  });

  it('getRisk propage model_mode et model_version depuis la meta', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: 'T1',
          risk_score: 75,
          risk_level: 'HIGH',
          factors: [],
          computed_at: '2026-08-02T00:00:00Z',
        },
        meta: { model_mode: 'ML', model_version: '2026-08-02T02:00:47' },
        errors: [],
      },
    });
    const score = await analyticsApi.getRisk('T1');
    expect(score.model_mode).toBe('ML');
    expect(score.model_version).toBe('2026-08-02T02:00:47');
  });

  it('getRisk propage model_name et le scope des facteurs depuis le backend', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: {
        data: {
          teacher_id: 'T1',
          risk_score: 90,
          risk_level: 'CRITICAL',
          score: 0.9,
          score_percent: 90,
          level: 'CRITICAL',
          level_label: 'CRITIQUE',
          is_capped: false,
          uncapped_score: 0.9,
          factors: [
            {
              feature: 'critical_gaps',
              code: 'critical_gaps',
              label: 'Gaps critiques du pÃ©rimÃ¨tre',
              raw_value: 3,
              normalized_value: 1,
              weight: 0.5,
              contribution: 0.5,
              contribution_percent: 50,
              scope: 'DEPARTMENT',
            },
            {
              feature: 'high_gaps',
              code: 'high_gaps',
              label: 'Gaps de haute urgence',
              raw_value: 0,
              normalized_value: 0,
              weight: 0.12,
              contribution: 0,
              contribution_percent: 0,
              scope: 'DEPARTMENT',
            },
          ],
          computed_at: '2026-08-02T00:00:00Z',
        },
        meta: {
          model_mode: 'PRODUCTION_ML',
          model_version: 'v1.0.0',
          model_name: 'gap_predictor_temporal',
        },
        errors: [],
      },
    });
    const score = await analyticsApi.getRisk('T1');
    // Nom de l'artefact propagÃ© (badge non vague : mode + nom + version rÃ©els).
    expect(score.model_mode).toBe('PRODUCTION_ML');
    expect(score.model_version).toBe('v1.0.0');
    expect(score.model_name).toBe('gap_predictor_temporal');
    // LibellÃ©s backend prioritaires, y compris le libellÃ© scopÃ© dÃ©partemental.
    expect(score.facteurs[0].nom).toBe('Gaps critiques du pÃ©rimÃ¨tre');
    expect(score.facteurs[1].nom).toBe('Gaps de haute urgence');
    expect(score.facteurs[0].scope).toBe('DEPARTMENT');
    expect(score.facteurs[1].scope).toBe('DEPARTMENT');
    // Valeur brute = 3 gaps critiques (jamais corrigÃ©e arbitrairement cÃ´tÃ© front).
    expect(score.facteurs[0].valeur_brute).toBe(3);
  });
});

